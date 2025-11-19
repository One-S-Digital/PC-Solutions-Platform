
import React, { useState, useMemo, useEffect } from 'react';
import { PolicyDocument, UserRole, PolicyAlert, PolicyAlertType, PolicyDocument as PolicyDocType, POLICY_CATEGORIES, POLICY_CATEGORY_LABELS, PolicyCategory, PolicyType, POLICY_TYPES_ENUM } from '../types';
import { MOCK_POLICY_DOCS, MOCK_POLICY_ALERTS, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { NewspaperIcon, MagnifyingGlassIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, DocumentTextIcon, InformationCircleIcon, PlusCircleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import PolicyAlertModal from '../components/admin/PolicyAlertModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { formatCategory } from '../utils/serviceFormatting'; 

interface PolicyDocumentCardProps {
  doc: PolicyDocument;
  onPreview: (doc: PolicyDocument) => void;
  onDownload: (doc: PolicyDocument) => void;
}

const PolicyDocumentCard: React.FC<PolicyDocumentCardProps> = ({ doc, onPreview, onDownload }) => {
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
                Critical Update: {doc.title}
            </div>
        )}
        <h3 className="text-lg font-semibold text-swiss-charcoal mb-1">{doc.title}</h3>
        <p className="text-xs text-gray-500 mb-2">Category: {POLICY_CATEGORY_LABELS[doc.category] || formatCategory(doc.category)} {doc.region && `(${doc.region})`} {doc.country && `- ${doc.country}`}</p>
        {doc.status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center ${statusColors[doc.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusIcons[doc.status] || <InformationCircleIcon className="w-4 h-4 inline mr-1" />} {doc.status}
          </span>
        )}
        {doc.policyType && <p className="text-xs text-gray-500 mt-1">Type: {doc.policyType}</p>}
        <p className="text-sm text-gray-600 my-3 line-clamp-3">{doc.contentPreview}</p>
        <div className="text-xs text-gray-500 space-y-1">
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Published: {new Date(doc.publishedDate).toLocaleDateString(i18n.language)}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Updated: {new Date(doc.lastUpdatedDate).toLocaleDateString(i18n.language)}</p>
          {doc.effectiveDate && <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Effective: {new Date(doc.effectiveDate).toLocaleDateString(i18n.language)}</p>}
        </div>
        <div className="mt-3">
          {doc.tags.map(tag => (
            <span key={tag} className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-0.5 rounded-full mr-1 mb-1 inline-block">{tag}</span>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 mt-auto border-t flex justify-end items-center space-x-2">
        {doc.externalLink && <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => window.open(doc.externalLink, '_blank')}>View Online</Button>}
        {doc.fileUrl && (
          <>
            <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={() => onDownload(doc)}>Download {doc.fileType}</Button>
            <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => onPreview(doc)} className="p-2" aria-label="Preview" title="Preview"></Button>
          </>
        )}
      </div>
    </Card>
  );
};

const normalizePolicyCategory = (value: unknown): PolicyCategory => {
  if (typeof value === 'string' && (POLICY_CATEGORIES as readonly string[]).includes(value)) {
    return value as PolicyCategory;
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
  const { t } = useTranslation(['content', 'common', 'dashboard']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest, authenticatedUpload, authenticatedDownload } = useAuthenticatedApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanton, setFilterCanton] = useState('All');
  const [filterPolicyType, setFilterPolicyType] = useState<'All' | PolicyType>('All'); 
  const [filterCategory, setFilterCategory] = useState<'All' | PolicyCategory>('All');
  
  const [policyDocs, setPolicyDocs] = useState<PolicyDocument[]>([]);
  const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>(MOCK_POLICY_ALERTS);

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PolicyAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<PolicyDocument | null>(null);

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  // Fetch State Policies from API
  useEffect(() => {
    const fetchStatePolicies = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedRequest<any[]>('/content/state-policies?limit=100', {
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
        // Fall back to mock data if API fails
        setPolicyDocs(MOCK_POLICY_DOCS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatePolicies();
  }, [authenticatedRequest]);

  const cantons = ['All', ...new Set(policyDocs.map(d => d.region).filter(Boolean) as string[])];
  const policyTypeOptions: Array<'All' | PolicyType> = ['All', ...POLICY_TYPES_ENUM];
  const policyCategoryOptions: Array<'All' | PolicyCategory> = ['All', ...POLICY_CATEGORIES];


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
        alert('Failed to download file. Please try again.');
      }
    }
  };


  const handleAlertSubmit = (alertData: Omit<PolicyAlert, 'id' | 'creationDate'>) => {
    if (editingAlert) {
      setPolicyAlerts(prev => prev.map(a => a.id === editingAlert.id ? { ...a, ...alertData, creationDate: a.creationDate } : a));
    } else {
      const newAlert: PolicyAlert = {
        ...alertData,
        id: `alert${Date.now()}`,
        creationDate: new Date().toISOString(),
      };
      setPolicyAlerts(prev => [newAlert, ...prev]);
    }
    setEditingAlert(null);
  };
  
  const handleDeleteAlert = (alertId: string) => {
    if (window.confirm("Are you sure you want to delete this alert?")) {
        setPolicyAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };


  const tabsContent = (category: PolicyCategory) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {filteredDocs.filter(doc => doc.category === category).map(doc => (
        <PolicyDocumentCard 
            key={doc.id} 
            doc={doc}
            onPreview={handlePreview}
            onDownload={handleDownload}
        />
      ))}
      {filteredDocs.filter(doc => doc.category === category).length === 0 && <p className="text-center text-gray-500 py-8 col-span-full">No documents found in this category for current filters.</p>}
    </div>
  );
  
  const policyTabs = POLICY_CATEGORIES.map(category => ({
    label: POLICY_CATEGORY_LABELS[category] || category,
    content: tabsContent(category),
  }));


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">State Policies & Regulations</h1>
        {isAdminOrSuperAdmin && (
          <div className="flex items-center space-x-3">
            <Button variant="secondary" leftIcon={ShieldExclamationIcon} onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true); }}>Manage Alerts</Button>
            <span className="text-sm text-gray-500 italic">Use Admin Dashboard to add/edit policies</span>
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
                placeholder="Search by keyword, topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${ICON_INPUT_FIELD} w-full`}
            />
          </div>
          <select value={filterCanton} onChange={(e) => setFilterCanton(e.target.value)} className={STANDARD_INPUT_FIELD} aria-label="Filter by Canton">
            <option value="All">{t('common:filters.all')}</option>
            {cantons.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterPolicyType} onChange={(e) => setFilterPolicyType(e.target.value as 'All' | PolicyType)} className={STANDARD_INPUT_FIELD} aria-label="Filter by Policy Type">
            {policyTypeOptions.map(pt => (
              <option key={pt} value={pt}>{pt === 'All' ? 'All Policy Types' : pt}</option>
            ))}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as 'All' | PolicyCategory)} className={STANDARD_INPUT_FIELD} aria-label="Filter by Policy Category">
            {policyCategoryOptions.map(pt => (
              <option key={pt} value={pt}>{pt === 'All' ? 'All Categories' : (POLICY_CATEGORY_LABELS[pt] || pt)}</option>
            ))}
          </select>
        </div>
      </Card>

      <Tabs tabs={policyTabs} variant="line" />

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
