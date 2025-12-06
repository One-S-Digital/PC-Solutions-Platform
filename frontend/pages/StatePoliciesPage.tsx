
import React, { useState, useMemo, useEffect } from 'react';
import { PolicyDocument, UserRole, PolicyAlert, PolicyAlertType, PolicyDocument as PolicyDocType, POLICY_CATEGORIES, POLICY_CATEGORY_LABELS, PolicyCategory, PolicyType, POLICY_TYPES_ENUM } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { NewspaperIcon, MagnifyingGlassIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, DocumentTextIcon, InformationCircleIcon, PlusCircleIcon, ShieldExclamationIcon, AcademicCapIcon, HeartIcon, ShieldCheckIcon, LockClosedIcon, GlobeAltIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import PolicyAlertModal from '../components/admin/PolicyAlertModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import i18n from '../i18n'; 

interface PolicyDocumentCardProps {
  doc: PolicyDocument;
  onPreview: (doc: PolicyDocument) => void;
  onDownload: (doc: PolicyDocument) => void;
}

const PolicyDocumentCard: React.FC<PolicyDocumentCardProps> = ({ doc, onPreview, onDownload }) => {
  const { t } = useTranslation(['content', 'common']);
  const statusColors: Record<string, string> = {
    Approved: 'bg-green-100 text-green-700',
    Published: 'bg-green-100 text-green-700', // Treat Published same as Approved for color
    Upcoming: 'bg-yellow-100 text-yellow-700',
    'In Review': 'bg-blue-100 text-blue-700',
    Draft: 'bg-gray-100 text-gray-700',
    Archived: 'bg-red-50 text-red-500'
  };
  const statusIcons: Record<string, React.ReactElement> = {
    Approved: <CheckCircleIcon className="w-4 h-4 inline mr-1" />,
    Published: <CheckCircleIcon className="w-4 h-4 inline mr-1" />,
    Upcoming: <ClockIcon className="w-4 h-4 inline mr-1" />,
    'In Review': <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />,
    Draft: <DocumentTextIcon className="w-4 h-4 inline mr-1" />,
    Archived: <DocumentTextIcon className="w-4 h-4 inline mr-1" />
  };

  return (
    <Card className="flex flex-col" hoverEffect>
      <div className="p-5 flex-grow">
        {doc.isCritical && (
             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-md mb-3 text-xs flex items-center" role="alert">
                <InformationCircleIcon className="h-5 w-5 mr-2"/>
                {t('common:statePolicies.criticalUpdate')}: {doc.title}
            </div>
        )}
        <h3 className="text-lg font-semibold text-swiss-charcoal mb-1">{doc.title}</h3>
        <p className="text-xs text-gray-500 mb-2">{t('content:statePoliciesPage.labels.category')}: {t(`content:policyCategories.${doc.category.replace(/\s+/g, '')}`, { defaultValue: POLICY_CATEGORY_LABELS[doc.category] || doc.category })} {doc.region && `(${doc.region})`} {doc.country && `- ${doc.country}`}</p>
        {doc.status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center ${statusColors[doc.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusIcons[doc.status] || <InformationCircleIcon className="w-4 h-4 inline mr-1" />} {doc.status}
          </span>
        )}
        {doc.policyType && <p className="text-xs text-gray-500 mt-1">{t('content:statePoliciesPage.labels.type')}: {doc.policyType}</p>}
        <p className="text-sm text-gray-600 my-3 line-clamp-3">{doc.contentPreview}</p>
        <div className="text-xs text-gray-500 space-y-1">
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />{t('content:statePoliciesPage.labels.published')}: {new Date(doc.publishedDate).toLocaleDateString()}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />{t('content:statePoliciesPage.labels.updated')}: {new Date(doc.lastUpdatedDate).toLocaleDateString()}</p>
          {doc.effectiveDate && <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />{t('content:statePoliciesPage.labels.effective')}: {new Date(doc.effectiveDate).toLocaleDateString()}</p>}
        </div>
        <div className="mt-3">
          {doc.tags.map(tag => (
            <span key={tag} className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-0.5 rounded-full mr-1 mb-1 inline-block">{tag}</span>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 mt-auto border-t flex justify-end items-center space-x-2">
        {doc.externalLink && <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => window.open(doc.externalLink, '_blank')}>{t('common:statePolicies.viewOnline')}</Button>}
        {doc.fileUrl && (
          <>
            <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={() => onDownload(doc)}>{t('common:statePolicies.download', { fileType: doc.fileType })}</Button>
            <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => onPreview(doc)} className="p-2" aria-label={t('common:statePolicies.preview', 'Preview')} title={t('common:statePolicies.preview', 'Preview')}></Button>
          </>
        )}
      </div>
    </Card>
  );
};

const PolicyCategoryDisplayCard: React.FC<{title: string, icon: React.ElementType, count: number, colorClasses: string, onSelect: () => void}> = ({title, icon: Icon, count, colorClasses, onSelect}) => {
  const { t } = useTranslation(['content', 'common']);
  return (
    <div 
      className={`p-5 cursor-pointer rounded-card shadow-soft hover:shadow-lg transition-shadow duration-200 ease-in-out ${colorClasses}`} 
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-label={`View ${title} policies`}
    >
      <Icon className="w-10 h-10 mb-3 text-current"/>
      <h3 className="text-xl font-semibold mb-1 text-current">{title}</h3>
      <p className="text-sm opacity-80 text-current">{t('common:statePolicies.policyCount', { count, defaultValue: '{{count}} policies' })}</p>
    </div>
  );
};

const normalizePolicyCategory = (value: unknown): PolicyCategory => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Try exact match first
    if ((POLICY_CATEGORIES as readonly string[]).includes(trimmed)) {
      return trimmed as PolicyCategory;
    }
    // Try case-insensitive match
    const found = POLICY_CATEGORIES.find(
      cat => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (found) {
      return found;
    }
  }
  return 'Other';
};

const normalizePolicyType = (value: unknown): PolicyType | undefined => {
  if (typeof value === 'string' && (POLICY_TYPES_ENUM as readonly string[]).includes(value)) {
    return value as PolicyType;
  }
  return undefined;
};

const StatePoliciesPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest, authenticatedUpload, authenticatedDownload } = useAuthenticatedApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanton, setFilterCanton] = useState('All');
  const [filterPolicyType, setFilterPolicyType] = useState<'All' | PolicyType>('All'); 
  const [filterCategory, setFilterCategory] = useState<'All' | PolicyCategory>('All');
  
  const [policyDocs, setPolicyDocs] = useState<PolicyDocument[]>([]);
  const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PolicyAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<PolicyDocument | null>(null);

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  // Fetch Policy Alerts from API
  useEffect(() => {
    const fetchPolicyAlerts = async () => {
      try {
        setAlertsLoading(true);
        const response = await authenticatedRequest<PolicyAlert[]>('/policy-alerts', {
          method: 'GET'
        });

        if (response.success && response.data) {
          setPolicyAlerts(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch Policy Alerts:', error);
        // Fall back to empty state if API fails
        setPolicyAlerts([]);
      } finally {
        setAlertsLoading(false);
      }
    };

    fetchPolicyAlerts();
  }, [authenticatedRequest]);

  // Fetch State Policies from API
  useEffect(() => {
    const fetchStatePolicies = async () => {
      try {
        setIsLoading(true);
        const currentLang = i18n.language || 'en';
        const response = await authenticatedRequest<any[]>(`/content/state-policies?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });

        if (response.success && response.data) {
          // Transform API response to match PolicyDocument interface
          const policies = response.data.map((policy: any) => ({
            id: policy.id,
            title: policy.title,
            category: normalizePolicyCategory(policy.category),
            policyType: normalizePolicyType(policy.policyType),
            country: policy.country,
            region: policy.region,
            tags: policy.tags || [],
            publishedDate: policy.createdAt || new Date().toISOString(),
            lastUpdatedDate: policy.updatedAt || policy.lastUpdated || new Date().toISOString(),
            effectiveDate: policy.effectiveDate,
            contentPreview: policy.contentPreview || policy.description,
            externalLink: policy.externalLink,
            fileUrl: policy.publicUrl || policy.fileUrl || policy.url,
            fileType: policy.fileType,
            status: policy.status || 'Published',
            isCritical: policy.isCritical || false,
            language: policy.language,
          }));
          setPolicyDocs(policies);
        }
      } catch (error) {
        console.error('Failed to fetch State Policies:', error);
        // Fall back to empty state if API fails
        setPolicyDocs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatePolicies();
  }, [authenticatedRequest, i18n.language]);

  const cantons = ['All', ...new Set(policyDocs.map(d => d.region).filter(Boolean) as string[])];
  const policyTypeOptions: Array<'All' | PolicyType> = ['All', ...POLICY_TYPES_ENUM];
  const policyCategoryOptions: Array<'All' | PolicyCategory> = ['All', ...POLICY_CATEGORIES];

  const categoriesWithCounts = useMemo(() => {
    const counts: Partial<Record<PolicyCategory, number>> = {};
    policyDocs
      .filter(doc => doc.status === 'Published' || doc.status === 'Approved' || isAdminOrSuperAdmin)
      .forEach(doc => {
        counts[doc.category] = (counts[doc.category] || 0) + 1;
      });
    return (Object.entries(counts) as [PolicyCategory, number][]) 
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({ category, count }));
  }, [policyDocs, isAdminOrSuperAdmin]);

  const categoryVisuals: Record<PolicyCategory, {icon: React.ElementType, colorClasses: string}> = {
    'Education Policy': { icon: AcademicCapIcon, colorClasses: 'bg-blue-500 text-white' },
    'Health & Safety': { icon: ShieldCheckIcon, colorClasses: 'bg-green-500 text-white' },
    'Labor & Employment': { icon: DocumentTextIcon, colorClasses: 'bg-orange-500 text-white' },
    'Child Protection': { icon: HeartIcon, colorClasses: 'bg-pink-500 text-white' },
    'Data Privacy': { icon: LockClosedIcon, colorClasses: 'bg-purple-500 text-white' },
    'Environmental': { icon: GlobeAltIcon, colorClasses: 'bg-emerald-500 text-white' },
    'Other': { icon: FolderIcon, colorClasses: 'bg-gray-500 text-white' },
  };

  const totalPublishedPolicies = useMemo(() => 
    policyDocs.filter(doc => doc.status === 'Published' || doc.status === 'Approved' || isAdminOrSuperAdmin).length, 
    [policyDocs, isAdminOrSuperAdmin]
  );

  const filteredDocs = useMemo(() => {
    return policyDocs.filter(doc =>
      (isAdminOrSuperAdmin || doc.status === 'Published' || doc.status === 'Approved') && 
      (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (doc.contentPreview && doc.contentPreview.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (filterCanton === 'All' || doc.region === filterCanton) &&
      (filterPolicyType === 'All' || doc.policyType === filterPolicyType) &&
      (filterCategory === 'All' || doc.category === filterCategory)
    );
  }, [searchTerm, filterCanton, filterPolicyType, filterCategory, policyDocs, isAdminOrSuperAdmin]);

  const activeGlobalAlerts = useMemo(() => {
    const now = new Date();
    return policyAlerts.filter(alert => 
        alert.isActive &&
        (alert.regionScope === 'All' || alert.regionScope === currentUser?.region) &&
        (!alert.displayStartDate || new Date(alert.displayStartDate) <= now) &&
        (!alert.displayEndDate || new Date(alert.displayEndDate) >= now)
    );
  }, [policyAlerts, currentUser?.region]);


  const handlePreview = (doc: PolicyDocument) => {
    if (doc.fileUrl) {
      setPreviewDoc(doc);
    }
  };

  const handleDownload = async (doc: PolicyDocument) => {
    if (doc.fileUrl) {
      try {
        await authenticatedDownload(doc.fileUrl, `${doc.title}.${doc.fileType?.toLowerCase() || 'pdf'}`);
      } catch (error) {
        console.error('Download failed:', error);
        alert(t('content:statePoliciesPage.errors.downloadFailed'));
      }
    }
  };


  const handleAlertSubmit = async (alertData: Omit<PolicyAlert, 'id' | 'creationDate'>) => {
    try {
      if (editingAlert) {
        // Update existing alert via API
        const response = await authenticatedRequest<PolicyAlert>(`/policy-alerts/${editingAlert.id}`, {
          method: 'PATCH',
          body: JSON.stringify(alertData),
        });
        
        if (response.success && response.data) {
          setPolicyAlerts(prev => prev.map(a => a.id === editingAlert.id ? response.data! : a));
        }
      } else {
        // Create new alert via API
        const response = await authenticatedRequest<PolicyAlert>('/policy-alerts', {
          method: 'POST',
          body: JSON.stringify(alertData),
        });
        
        if (response.success && response.data) {
          setPolicyAlerts(prev => [response.data!, ...prev]);
        }
      }
      setEditingAlert(null);
      setIsAlertModalOpen(false);
    } catch (error) {
      console.error('Failed to save alert:', error);
      alert('Failed to save alert. Please try again.');
    }
  };
  
  const handleDeleteAlert = async (alertId: string) => {
    if (window.confirm(t('content:statePoliciesPage.confirmDeleteAlert', 'Are you sure you want to delete this alert?'))) {
      try {
        const response = await authenticatedRequest<void>(`/policy-alerts/${alertId}`, {
          method: 'DELETE',
        });
        
        if (response.success) {
          setPolicyAlerts(prev => prev.filter(a => a.id !== alertId));
        }
      } catch (error) {
        console.error('Failed to delete alert:', error);
        alert('Failed to delete alert. Please try again.');
      }
    }
  };




  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('content:statePoliciesPage.title')}</h1>
        {isAdminOrSuperAdmin && (
          <div className="flex items-center space-x-3">
            <Button variant="secondary" leftIcon={ShieldExclamationIcon} onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true); }}>{t('content:statePoliciesPage.buttons.manageAlerts')}</Button>
            <span className="text-sm text-gray-500 italic">{t('content:statePoliciesPage.adminNote')}</span>
          </div>
        )}
      </div>

      {activeGlobalAlerts.map(alert => (
        <div key={alert.id} className={`${alert.type === PolicyAlertType.CRITICAL ? 'bg-red-100 border-red-500 text-red-700' : 'bg-blue-100 border-blue-500 text-blue-700'} border-l-4 p-4 rounded-md flex items-start`} role="alert">
            <InformationCircleIcon className="h-6 w-6 mr-3 flex-shrink-0"/>
            <div>
                <p className="font-bold">{alert.title} {alert.regionScope !== 'All' && `(${alert.regionScope})`}</p>
                <p className="text-sm">{alert.message}</p>
            </div>
        </div>
      ))}

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"> {/* Adjusted to 2 cols for better spacing */}
          <div className="relative lg:col-span-2">
             <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             <label htmlFor="policySearch" className="sr-only">Search Policies</label>
             <input
                id="policySearch"
                type="text"
                placeholder={t('common:placeholders.searchKeyword')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${ICON_INPUT_FIELD} w-full`}
            />
          </div>
          <select value={filterCanton} onChange={(e) => setFilterCanton(e.target.value)} className={STANDARD_INPUT_FIELD} aria-label={t('content:statePoliciesPage.filters.ariaLabelCanton', 'Filter by Canton')}>
            <option value="All">{t('content:statePoliciesPage.filters.allCantonsRegions')}</option>
            {cantons.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterPolicyType} onChange={(e) => setFilterPolicyType(e.target.value as 'All' | PolicyType)} className={STANDARD_INPUT_FIELD} aria-label={t('content:statePoliciesPage.filters.ariaLabelPolicyType', 'Filter by Policy Type')}>
            {policyTypeOptions.map(pt => (
              <option key={pt} value={pt}>{pt === 'All' ? t('common:statePolicies.allPolicyTypes') : pt}</option>
            ))}
          </select>
           <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as 'All' | PolicyCategory)} className={STANDARD_INPUT_FIELD} aria-label={t('content:statePoliciesPage.filters.ariaLabelCategory', 'Filter by Policy Category')}>
            {policyCategoryOptions.map(pt => (
              <option key={pt} value={pt}>{pt === 'All' ? t('common:statePolicies.allCategories') : t(`content:policyCategories.${pt.replace(/\s+/g, '')}`, { defaultValue: POLICY_CATEGORY_LABELS[pt] || pt })}</option>
            ))}
          </select>
        </div>
      </Card>

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-6 mb-3">{t('content:statePoliciesPage.sections.categories')}</h2>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('content:statePoliciesPage.loading')}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        <PolicyCategoryDisplayCard
          title={t('common:statePolicies.allPolicies')}
          icon={FolderIcon}
          count={totalPublishedPolicies}
          colorClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
          onSelect={() => setFilterCategory('All')}
        />
        {categoriesWithCounts.map(({ category, count }) => {
          const visualConfig = categoryVisuals[category] || { icon: FolderIcon, colorClasses: 'bg-gray-500 text-white' };
          const label = t(`content:policyCategories.${category.replace(/\s+/g, '')}`, { defaultValue: POLICY_CATEGORY_LABELS[category] || category });
          return (
            <PolicyCategoryDisplayCard 
              key={category} 
              title={label}
              icon={visualConfig.icon} 
              count={count} 
              colorClasses={visualConfig.colorClasses}
              onSelect={() => setFilterCategory(category)}
            />
          );
        })}
        {categoriesWithCounts.length === 0 && totalPublishedPolicies > 0 && (
            <p className="text-center text-gray-500 py-8 col-span-full">{t('content:statePoliciesPage.emptyState.noPoliciesMatchFilters')}</p>
        )}
        {totalPublishedPolicies === 0 && <p className="text-center text-gray-500 py-8 col-span-full">{t('content:statePoliciesPage.emptyState.noPolicies')}</p>}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-swiss-charcoal mb-4">
          {filterCategory === 'All' 
            ? t('common:statePolicies.allPolicies')
            : `${t(`content:policyCategories.${filterCategory.replace(/\s+/g, '')}`, { defaultValue: POLICY_CATEGORY_LABELS[filterCategory] || filterCategory })} ${t('common:statePolicies.policies')}`}
          <span className="text-base font-normal text-gray-500 ml-2">
            ({filteredDocs.length} {filteredDocs.length === 1 ? t('common:statePolicies.policy') : t('common:statePolicies.policies')})
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => (
            <PolicyDocumentCard 
              key={doc.id} 
              doc={doc}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          ))}
          {filteredDocs.length === 0 && (
            <p className="text-center text-gray-500 py-8 col-span-full">{t('content:statePoliciesPage.emptyState.noPoliciesFoundForFilters')}</p>
          )}
        </div>
      </div>

      {isAdminOrSuperAdmin && (
        <>
            <PolicyAlertModal
                isOpen={isAlertModalOpen}
                onClose={() => { setIsAlertModalOpen(false); setEditingAlert(null);}}
                onSubmit={handleAlertSubmit}
                existingAlert={editingAlert}
            />
            <Card className="p-4 mt-8">
                <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">Manage Existing Alerts</h2>
                {policyAlerts.length === 0 ? <p className="text-gray-500">No custom alerts created yet.</p> : (
                    <ul className="space-y-2">
                        {policyAlerts.map(alert => (
                            <li key={alert.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                <div>
                                    <span className={`font-medium ${alert.type === PolicyAlertType.CRITICAL ? 'text-red-600' : 'text-blue-600'}`}>{alert.title}</span>
                                    <span className="text-xs text-gray-500 ml-2">({alert.regionScope}) - {alert.isActive ? "Active" : "Inactive"}</span>
                                </div>
                                <div className="space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => {setEditingAlert(alert); setIsAlertModalOpen(true);}}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteAlert(alert.id)}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                 <Button variant="primary" size="sm" leftIcon={PlusCircleIcon} className="mt-4" onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true);}}>Add New Alert</Button>
            </Card>
        </>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          fileUrl={previewDoc.fileUrl || ''}
          fileName={previewDoc.title}
          fileType={previewDoc.fileType || 'PDF'}
        />
      )}

    </div>
  );
};

export default StatePoliciesPage;
