

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useCallback } from 'react';
// FIX: Add VendorClient and VendorClientReason to imports
import { User, UserRole, ParentLead, LeadMainStatus, SupportedLanguage, SignupFormData, SignupRole, JobListing, Application, ApplicationStatus, DocumentItem, PlatformSettings, ServiceRequest, ServiceRequestStatus, VendorClient, VendorClientReason } from '../types'; 
import { 
  ALL_USERS_MOCK,
  MOCK_PARENT_LEADS,
  MOCK_APPLICATIONS,
  MOCK_JOB_LISTINGS,
  MOCK_CANDIDATE_PROFILES,
  MOCK_PLATFORM_SETTINGS,
  MOCK_SERVICE_REQUESTS,
  // FIX: Import MOCK_VENDOR_CLIENTS
  MOCK_VENDOR_CLIENTS
} from '../constants';
import i18n from '../i18n'; // Import i18n instance
import { useAuth } from '../src/hooks/useAuth';
import { useCurrentUser } from '../src/hooks/useUser';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  signup: (formData: SignupFormData, role: SignupRole) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  leads: ParentLead[];
  setLeads: Dispatch<SetStateAction<ParentLead[]>>;
  submitParentLead: (leadData: Omit<ParentLead, 'id' | 'submissionDate' | 'mainStatus' | 'assignedFoundations' | 'responses' | 'parentId'>) => void;
  favoriteCandidateIds: string[];
  toggleFavoriteCandidate: (candidateId: string) => void;
  isCandidateFavorite: (candidateId: string) => boolean;
  language: SupportedLanguage;
  setLanguage: Dispatch<SetStateAction<SupportedLanguage>>;
  applications: Application[];
  applyForJob: (job: JobListing) => { success: boolean, message: string };
  userFiles: DocumentItem[];
  addUserFile: (file: File) => void;
  deleteUserFile: (fileId: string) => void;
  renameUserFile: (fileId: string, newName: string) => void;
  platformSettings: PlatformSettings;
  setPlatformSettings: Dispatch<SetStateAction<PlatformSettings>>;
  updateCurrentUserInfo: (updatedInfo: Partial<User>) => void;
  serviceRequests: ServiceRequest[];
  submitServiceRequest: (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId'>) => void;
  // FIX: Add missing properties for vendor client management
  vendorClients: VendorClient[];
  updateVendorClientStatus: (vendorId: string, orgId: string, isActive: boolean, reason?: VendorClientReason, note?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// In-memory store for mock users, initialized with constants
const mockUserStore = [...ALL_USERS_MOCK];

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { user: apiUser, organization, loading: userLoading } = useCurrentUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<ParentLead[]>(MOCK_PARENT_LEADS);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(MOCK_SERVICE_REQUESTS);
  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);
  const [userFiles, setUserFiles] = useState<DocumentItem[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(MOCK_PLATFORM_SETTINGS);
  // FIX: Add state for vendor clients
  const [vendorClients, setVendorClients] = useState<VendorClient[]>(MOCK_VENDOR_CLIENTS);
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

  useEffect(() => {
    const newLangCode = language.toLowerCase();
    if (i18n.language !== newLangCode) {
      i18n.changeLanguage(newLangCode);
    }
  }, [language]);

  // Sync API user with current user state
  useEffect(() => {
    if (apiUser) {
      // Convert backend user to frontend user format
      const frontendUser: User = {
        id: apiUser.id,
        name: `${apiUser.firstName} ${apiUser.lastName}`,
        email: apiUser.email,
        role: apiUser.role as any, // Type conversion for compatibility
        orgId: organization?.id,
        orgName: organization?.name,
        avatarUrl: undefined, // Will be populated from asset data
        status: apiUser.isActive ? 'Active' : 'Inactive',
        lastLogin: apiUser.lastActiveAt,
        region: organization?.region,
        plan: 'Basic', // Default plan
        memberSince: apiUser.createdAt,
      };
      setCurrentUser(frontendUser);
    } else if (!userLoading) {
      setCurrentUser(null);
    }
  }, [apiUser, organization, userLoading]);

  useEffect(() => {
    if(currentUser?.role === UserRole.EDUCATOR) {
        // Find the full candidate profile to get their documents
        const profile = MOCK_CANDIDATE_PROFILES.find(p => p.email === currentUser.email);
        if(profile) {
            setUserFiles(profile.documents);
        }
    } else {
        setUserFiles([]);
    }
  }, [currentUser]);


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

  const login = async (email: string): Promise<{ success: boolean; message?: string }> => {
    // This is now handled by Clerk authentication
    // Keep for backward compatibility but redirect to Clerk
    return { success: false, message: 'Please use the login form above.' };
  };

  const logout = () => {
    // This is now handled by Clerk authentication
    // Keep for backward compatibility
    setCurrentUser(null);
  };

  const signup = async (formData: SignupFormData, role: SignupRole): Promise<{ success: boolean; message?: string, redirectTo?: string }> => {
    // This is now handled by Clerk authentication
    // Keep for backward compatibility but redirect to Clerk
    return { success: false, message: 'Please use the signup form above.' };
  };


  const submitParentLead = useCallback((leadData: Omit<ParentLead, 'id' | 'submissionDate' | 'mainStatus' | 'assignedFoundations' | 'responses'| 'parentId'>) => {
    const newLead: ParentLead = {
      ...leadData,
      id: `lead${Date.now()}`,
      parentId: currentUser?.id || `anon${Date.now()}`, // Use actual parent ID if logged in
      submissionDate: new Date().toISOString(),
      mainStatus: LeadMainStatus.NEW,
      assignedFoundations: [], 
      responses: [],
    };
    setLeads(prevLeads => [newLead, ...prevLeads]);
  }, [currentUser]);

  const submitServiceRequest = useCallback((requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId'>) => {
    if (!currentUser || !currentUser.orgId) {
        alert("You must be logged in as a foundation to submit a request.");
        return;
    };
    const newRequest: ServiceRequest = {
        ...requestData,
        id: `servreq_${Date.now()}`,
        foundationId: currentUser.id,
        foundationOrgId: currentUser.orgId,
        requestDate: new Date().toISOString(),
        status: ServiceRequestStatus.NEW,
    };
    setServiceRequests(prev => [newRequest, ...prev]);
    // For demo persistence across reloads, we would update the mock constant.
    // In a real app this is an API call.
    MOCK_SERVICE_REQUESTS.unshift(newRequest);
  }, [currentUser]);

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

  const applyForJob = useCallback((job: JobListing): { success: boolean, message: string } => {
    if (!currentUser || currentUser.role !== UserRole.EDUCATOR) {
        return { success: false, message: 'Only educators can apply for jobs.'};
    }

    const alreadyApplied = applications.some(app => app.jobId === job.id && app.educatorId === currentUser.id);
    if (alreadyApplied) {
        return { success: false, message: `You have already applied for "${job.title}".`};
    }

    const newApplication: Application = {
        id: `app_${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        foundationName: job.foundationName,
        educatorId: currentUser.id,
        educatorName: currentUser.name,
        status: ApplicationStatus.NEW,
        applicationDate: new Date().toISOString(),
    };
    
    setApplications(prev => [newApplication, ...prev]);

    // Update the applicationsReceived count in the mock data
    const jobInList = MOCK_JOB_LISTINGS.find(j => j.id === job.id);
    if (jobInList) {
        jobInList.applicationsReceived += 1;
    }
    
    return { success: true, message: `Successfully applied for "${job.title}"!`};
  }, [currentUser, applications]);

  const addUserFile = useCallback((file: File) => {
    const newFile: DocumentItem = {
        id: `file_${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file), // Mock URL
        type: 'Other', // Could try to determine from file.type
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

  const updateCurrentUserInfo = useCallback((updatedInfo: Partial<User>) => {
    if (currentUser) {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, ...updatedInfo } : null);
        // Also update the master list for mock persistence
        const userIndex = mockUserStore.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            mockUserStore[userIndex] = { ...mockUserStore[userIndex], ...updatedInfo };
        }
    }
  }, [currentUser]);

  // FIX: Implement vendor client status update function
  const updateVendorClientStatus = useCallback((vendorId: string, orgId: string, isActive: boolean, reason?: VendorClientReason, note?: string) => {
    if (!currentUser) return;

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
  }, [currentUser]);


  return (
    <AppContext.Provider value={{ 
        currentUser, 
        setCurrentUser, 
        login,
        logout,
        signup,
        leads, 
        setLeads, 
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
        submitServiceRequest,
        // FIX: Provide vendor client state and function
        vendorClients,
        updateVendorClientStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};