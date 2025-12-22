import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useCallback } from 'react';
import { User, UserRole, ParentLead, LeadMainStatus, SupportedLanguage, SignupFormData, SignupRole, JobListing, Application, DocumentItem, PlatformSettings, ServiceRequest, ServiceRequestStatus, VendorClient, VendorClientReason } from '../types';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../providers/AuthProvider';
import i18n from '../i18n';
import { useRecruitmentApi } from '../hooks/useRecruitmentApi';
import { ApiError } from '../services/api';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// Default platform settings - should come from API
const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Pro Crèche Solutions',
  metadataDescription: 'A platform connecting parents with childcare providers',
  enableUserRegistration: true,
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  enableMaintenanceMode: false,
  maxFileUploadSize: 10485760,
  supportedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
  enablePublicRegistration: true,
  enabledLanguages: ['en', 'fr', 'de'],
  defaultLanguage: 'en',
  enableCaptcha: true,
  requireEmailVerification: true,
};

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  signup: (formData: SignupFormData, role: SignupRole) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  leads: ParentLead[];
  setLeads: Dispatch<SetStateAction<ParentLead[]>>;
  leadsLoading: boolean;
  submitParentLead: (leadData: Omit<ParentLead, 'id' | 'submissionDate' | 'mainStatus' | 'assignedFoundations' | 'responses' | 'parentId'>) => Promise<void>;
  favoriteCandidateIds: string[];
  toggleFavoriteCandidate: (candidateId: string) => void;
  isCandidateFavorite: (candidateId: string) => boolean;
  language: SupportedLanguage;
  setLanguage: Dispatch<SetStateAction<SupportedLanguage>>;
  applications: Application[];
  applyForJob: (job: JobListing, applicationData?: { cvUrl?: string; cvAssetId?: string; coverLetter?: string }) => Promise<{ success: boolean; message: string }>;
  userFiles: DocumentItem[];
  addUserFile: (file: File) => void;
  deleteUserFile: (fileId: string) => void;
  renameUserFile: (fileId: string, newName: string) => void;
  platformSettings: PlatformSettings;
  setPlatformSettings: Dispatch<SetStateAction<PlatformSettings>>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => Promise<void>;
  serviceRequests: ServiceRequest[];
  serviceRequestsLoading: boolean;
  submitServiceRequest: (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId'>) => Promise<void>;
  vendorClients: VendorClient[];
  vendorClientsLoading: boolean;
  updateVendorClientStatus: (vendorId: string, orgId: string, isActive: boolean, reason?: VendorClientReason, note?: string) => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshServiceRequests: () => Promise<void>;
  refreshVendorClients: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use Clerk authentication from AuthProvider
  const { currentUser, setCurrentUser, login, logout, signup, updateCurrentUserInfo: updateUserFromAuth } = useAuthContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  
  // Data states - initialized empty, loaded from API
  const [leads, setLeads] = useState<ParentLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceRequestsLoading, setServiceRequestsLoading] = useState(false);
  const [vendorClients, setVendorClients] = useState<VendorClient[]>([]);
  const [vendorClientsLoading, setVendorClientsLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [userFiles, setUserFiles] = useState<DocumentItem[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  
  const { createApplication, listMyApplications } = useRecruitmentApi();
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const detectedLng = i18n.language?.toUpperCase().split('-')[0];
    if (detectedLng === 'FR' || detectedLng === 'DE') {
      return detectedLng as SupportedLanguage;
    }
    return 'EN';
  });
  const [favoriteCandidateIds, setFavoriteCandidateIds] = useState<string[]>(() => {
    const storedFavorites = localStorage.getItem('favoriteCandidateIds');
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  });

  // Load platform settings from API
  useEffect(() => {
    const loadPlatformSettings = async () => {
      try {
        const response = await fetch('/api/admin/frontend-settings/public');
        const contentType = response.headers.get('content-type');
        
        if (response.ok) {
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            if (result.success && result.data) {
              setPlatformSettings(prev => ({ ...prev, ...result.data }));
            }
          } else {
            // Got HTML instead of JSON - likely 404 page or server not running
            // Only log in development to avoid console noise
            if (import.meta.env.DEV) {
              try {
                const text = await response.text();
                console.warn('Platform settings endpoint returned non-JSON response:', {
                  status: response.status,
                  statusText: response.statusText,
                  contentType,
                  preview: text.substring(0, 200),
                  url: response.url,
                });
              } catch (e) {
                console.warn('Platform settings endpoint returned non-JSON response (unable to read):', {
                  status: response.status,
                  statusText: response.statusText,
                  contentType,
                  url: response.url,
                });
              }
            }
          }
        } else {
          // Only log errors in development
          if (import.meta.env.DEV) {
            const text = await response.text().catch(() => 'Unable to read response');
            console.warn('Platform settings endpoint error:', {
              status: response.status,
              statusText: response.statusText,
              contentType,
              preview: text.substring(0, 200),
            });
          }
        }
      } catch (error) {
        console.error('Failed to load platform settings:', error);
        // Keep defaults on error
      }
    };
    loadPlatformSettings();
  }, []);

  // Load leads from API when user is authenticated
  const refreshLeads = useCallback(async () => {
    if (!currentUser) {
      setLeads([]);
      return;
    }
    
    setLeadsLoading(true);
    try {
      const response = await authenticatedRequest<ParentLead[]>('/compat/parent-leads');
      if (response.success && response.data) {
        setLeads(response.data);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLeadsLoading(false);
    }
  }, [currentUser, authenticatedRequest]);

  // Load service requests from API
  const refreshServiceRequests = useCallback(async () => {
    if (!currentUser) {
      setServiceRequests([]);
      return;
    }
    
    setServiceRequestsLoading(true);
    try {
      const response = await authenticatedRequest<ServiceRequest[]>('/marketplace/service-requests');
      if (response.success && response.data) {
        setServiceRequests(response.data);
      }
    } catch (error) {
      console.error('Failed to load service requests:', error);
    } finally {
      setServiceRequestsLoading(false);
    }
  }, [currentUser, authenticatedRequest]);

  // Load vendor clients from API
  const refreshVendorClients = useCallback(async () => {
    if (!currentUser) {
      setVendorClients([]);
      return;
    }
    
    setVendorClientsLoading(true);
    try {
      const response = await authenticatedRequest<VendorClient[]>('/compat/vendor-clients');
      if (response.success && response.data) {
        setVendorClients(response.data);
      }
    } catch (error) {
      console.error('Failed to load vendor clients:', error);
      // Vendor clients endpoint might not exist yet - that's ok
    } finally {
      setVendorClientsLoading(false);
    }
  }, [currentUser, authenticatedRequest]);

  // Load data when user changes
  useEffect(() => {
    if (currentUser) {
      refreshLeads();
      refreshServiceRequests();
      // Only load vendor clients for FOUNDATION users (backend requires FOUNDATION role)
      if (currentUser.role === UserRole.FOUNDATION) {
        refreshVendorClients();
      } else {
        setVendorClients([]);
      }
    } else {
      setLeads([]);
      setServiceRequests([]);
      setVendorClients([]);
    }
  }, [currentUser, refreshLeads, refreshServiceRequests, refreshVendorClients]);

  useEffect(() => {
    const newLangCode = language.toLowerCase();
    if (i18n.language !== newLangCode) {
      i18n.changeLanguage(newLangCode).catch((err) => {
        console.error('Failed to change language:', err);
      });
    }
  }, [language]);

  useEffect(() => {
    if (currentUser?.role === UserRole.EDUCATOR) {
      setUserFiles([]);
    } else {
      setUserFiles([]);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadApplications = async () => {
      if (!currentUser || currentUser.role !== UserRole.EDUCATOR) {
        setApplications([]);
        return;
      }

      try {
        const response = await listMyApplications();
        setApplications(response);
      } catch (error) {
        console.error('Failed to load applications:', error);
        setApplications([]);
      }
    };

    loadApplications();
  }, [currentUser, listMyApplications]);


  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const newSupportedLang = lng.toUpperCase().split('-')[0] as SupportedLanguage;
      if (['EN', 'FR', 'DE'].includes(newSupportedLang) && newSupportedLang !== language) {
        setLanguage(newSupportedLang);
      }
      document.documentElement.lang = lng.split('-')[0];
      document.title = i18n.t('appName');
    };

    i18n.on('languageChanged', handleLanguageChanged);
    
    if (i18n.isInitialized) {
        document.title = i18n.t('appName');
        document.documentElement.lang = i18n.language.split('-')[0];
    } else {
        i18n.on('initialized', (_options) => { 
             document.title = i18n.t('appName');
             document.documentElement.lang = i18n.language.split('-')[0];
             const detectedLngOnInit = i18n.language?.toUpperCase().split('-')[0] as SupportedLanguage;
             if (['EN', 'FR', 'DE'].includes(detectedLngOnInit) && detectedLngOnInit !== language) {
                setLanguage(detectedLngOnInit);
             }
        });
    }
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [language]);

  const submitParentLead = useCallback(async (leadData: Omit<ParentLead, 'id' | 'submissionDate' | 'mainStatus' | 'assignedFoundations' | 'responses'| 'parentId'>) => {
    try {
      const response = await authenticatedRequest<ParentLead>('/compat/parent-leads', {
        method: 'POST',
        body: JSON.stringify({
          ...leadData,
          mainStatus: LeadMainStatus.NEW,
        }),
      });
      
      if (response.success && response.data) {
        setLeads(prevLeads => [response.data!, ...prevLeads]);
      }
    } catch (error) {
      console.error('Failed to submit lead:', error);
      throw error;
    }
  }, [authenticatedRequest]);

  const submitServiceRequest = useCallback(async (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId'>) => {
    if (!currentUser || !currentUser.orgId) {
      throw new Error("You must be logged in as a foundation to submit a request.");
    }
    
    try {
      const response = await authenticatedRequest<ServiceRequest>('/marketplace/service-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...requestData,
          foundationId: currentUser.id,
          foundationOrgId: currentUser.orgId,
          status: ServiceRequestStatus.NEW,
        }),
      });
      
      if (response.success && response.data) {
        setServiceRequests(prev => [response.data!, ...prev]);
      }
    } catch (error) {
      console.error('Failed to submit service request:', error);
      throw error;
    }
  }, [currentUser, authenticatedRequest]);

  const toggleFavoriteCandidate = useCallback((candidateId: string) => {
    setFavoriteCandidateIds(prev => {
      const newFavorites = prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId];
      localStorage.setItem('favoriteCandidateIds', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const isCandidateFavorite = useCallback((candidateId: string): boolean => {
    return favoriteCandidateIds.includes(candidateId);
  }, [favoriteCandidateIds]);

  const applyForJob = useCallback(
    async (job: JobListing, applicationData?: { cvUrl?: string; cvAssetId?: string; coverLetter?: string }): Promise<{ success: boolean; message: string }> => {
      if (!currentUser || currentUser.role !== UserRole.EDUCATOR) {
        return { success: false, message: 'Only educators can apply for jobs.' };
      }

      try {
        const newApplication = await createApplication({ 
          jobListingId: job.id,
          ...applicationData
        });
        setApplications((prev) => [newApplication, ...prev]);
        return { success: true, message: `Successfully applied for "${job.title}"!` };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) {
            return { success: false, message: `You have already applied for "${job.title}".` };
          }
          return { success: false, message: error.message };
        }
        return { success: false, message: 'An unexpected error occurred while applying for this job.' };
      }
    },
    [currentUser, createApplication],
  );

  const addUserFile = useCallback((file: File) => {
    const newFile: DocumentItem = {
        id: `file_${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: 'Other',
        uploadDate: new Date().toISOString(),
        size: file.size,
    };
    setUserFiles(prev => [...prev, newFile]);
  }, []);

  const deleteUserFile = useCallback((fileId: string) => {
    setUserFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const renameUserFile = useCallback((fileId: string, newName: string) => {
    setUserFiles(prev => prev.map(f => f.id === fileId ? {...f, name: newName} : f));
  }, []);

  const updateCurrentUserInfo = useCallback(
    (updatedInfo: Partial<User>) => {
      return updateUserFromAuth(updatedInfo);
    },
    [updateUserFromAuth]
  );

  const updateVendorClientStatus = useCallback(async (vendorId: string, orgId: string, isActive: boolean, reason?: VendorClientReason, note?: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedRequest<VendorClient>('/compat/vendor-clients', {
        method: 'POST',
        body: JSON.stringify({
          vendorId,
          orgId,
          isActive,
          reason,
          note,
        }),
      });
      
      if (response.success) {
        // Refresh the list to get updated data
        await refreshVendorClients();
      }
    } catch (error) {
      console.error('Failed to update vendor client status:', error);
      // Fallback to local update if API fails
      setVendorClients(prevClients => {
        const existingClientIndex = prevClients.findIndex(vc => vc.vendorId === vendorId && vc.orgId === orgId);
        
        if (existingClientIndex > -1) {
          const updatedClients = [...prevClients];
          const clientToUpdate = { ...updatedClients[existingClientIndex] };
          clientToUpdate.isActive = isActive;
          if (reason) clientToUpdate.reason = reason;
          if (note !== undefined) clientToUpdate.note = note;
          clientToUpdate.markedByUserId = currentUser.id;
          clientToUpdate.markedAt = new Date().toISOString();
          if (!isActive && updatedClients[existingClientIndex].isActive) {
            clientToUpdate.deactivatedAt = new Date().toISOString();
          } else if (isActive) {
            clientToUpdate.deactivatedAt = undefined;
          }
          updatedClients[existingClientIndex] = clientToUpdate;
          return updatedClients;
        } else {
          const newClient: VendorClient = {
            id: `vc-${Date.now()}`,
            vendorId,
            orgId,
            isActive,
            reason,
            note,
            markedByUserId: currentUser.id,
            markedAt: new Date().toISOString(),
            deactivatedAt: !isActive ? new Date().toISOString() : undefined,
          };
          return [...prevClients, newClient];
        }
      });
    }
  }, [currentUser, authenticatedRequest, refreshVendorClients]);


  return (
    <AppContext.Provider value={{ 
        currentUser, 
        setCurrentUser, 
        login,
        logout,
        signup,
        leads, 
        setLeads,
        leadsLoading,
        submitParentLead,
        favoriteCandidateIds,
        toggleFavoriteCandidate,
        isCandidateFavorite,
        language, 
        setLanguage,
        applications,
        applyForJob,
        userFiles,
        addUserFile,
        deleteUserFile,
        renameUserFile,
        platformSettings,
        setPlatformSettings,
        updateCurrentUserInfo,
        serviceRequests,
        serviceRequestsLoading,
        submitServiceRequest,
        vendorClients,
        vendorClientsLoading,
        updateVendorClientStatus,
        refreshLeads,
        refreshServiceRequests,
        refreshVendorClients,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const { t } = useTranslation(['dashboard', 'common']);
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error(t('appContext.useAppContextError'));
  }
  return context;
};
