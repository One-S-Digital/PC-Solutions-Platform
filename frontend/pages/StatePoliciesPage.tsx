
import React, { useState, useMemo } from 'react';
import { PolicyDocument, UserRole, PolicyAlert, PolicyAlertType, PolicyDocument as PolicyDocType } from '../types';
import { MOCK_POLICY_DOCS, MOCK_POLICY_ALERTS, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { NewspaperIcon, MagnifyingGlassIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, DocumentTextIcon, InformationCircleIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import ContentUploadModal from '../components/admin/ContentUploadModal';
import PolicyAlertModal from '../components/admin/PolicyAlertModal'; 

interface PolicyDocumentCardProps {
  doc: PolicyDocument;
  onEdit: (doc: PolicyDocument) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const PolicyDocumentCard: React.FC<PolicyDocumentCardProps> = ({ doc, onEdit, onDelete, isAdmin }) => {
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
    Draft: <PencilSquareIcon className="w-4 h-4 inline mr-1" />,
    Archived: <TrashIcon className="w-4 h-4 inline mr-1" />
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
        <p className="text-xs text-gray-500 mb-2">Category: {doc.category} {doc.region && `(${doc.region})`} {doc.country && `- ${doc.country}`}</p>
        {doc.status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center ${statusColors[doc.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusIcons[doc.status] || <InformationCircleIcon className="w-4 h-4 inline mr-1" />} {doc.status}
          </span>
        )}
        {doc.policyType && <p className="text-xs text-gray-500 mt-1">Type: {doc.policyType}</p>}
        <p className="text-sm text-gray-600 my-3 line-clamp-3">{doc.contentPreview}</p>
        <div className="text-xs text-gray-500 space-y-1">
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Published: {new Date(doc.publishedDate).toLocaleDateString()}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Updated: {new Date(doc.lastUpdatedDate).toLocaleDateString()}</p>
          {doc.effectiveDate && <p><CalendarDaysIcon className="w-4 h-4 inline mr-1" />Effective: {new Date(doc.effectiveDate).toLocaleDateString()}</p>}
        </div>
        <div className="mt-3">
          {doc.tags.map(tag => (
            <span key={tag} className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-0.5 rounded-full mr-1 mb-1 inline-block">{tag}</span>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 mt-auto border-t flex justify-end items-center space-x-2">
        {doc.externalLink && <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => window.open(doc.externalLink, '_blank')}>View Online</Button>}
        {doc.fileUrl && <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={() => alert(`Downloading ${doc.fileUrl}`)}>Download {doc.fileType}</Button>}
        {isAdmin && (
            <>
              <Button variant="ghost" size="sm" leftIcon={PencilSquareIcon} onClick={() => onEdit(doc)} className="text-blue-600 hover:text-blue-700 p-2" aria-label="Edit" title="Edit"></Button>
              <Button variant="ghost" size="sm" leftIcon={TrashIcon} onClick={() => onDelete(doc.id)} className="text-red-600 hover:text-red-700 p-2" aria-label="Delete" title="Delete"></Button>
            </>
        )}
      </div>
    </Card>
  );
};

const StatePoliciesPage: React.FC = () => {
  const { currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanton, setFilterCanton] = useState('All');
  const [filterPolicyType, setFilterPolicyType] = useState('All'); 
  
  const [policyDocs, setPolicyDocs] = useState<PolicyDocument[]>(MOCK_POLICY_DOCS);
  const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>(MOCK_POLICY_ALERTS);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [editingAlert, setEditingAlert] = useState<PolicyAlert | null>(null);

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  const cantons = ['All', ...new Set(policyDocs.map(d => d.region).filter(Boolean) as string[])];
  const policyTypeOptions = ['All', ...new Set(policyDocs.map(d => d.policyType).filter(Boolean) as string[])];
  const policyBroadCategories = ['All', ...new Set(policyDocs.map(d => d.category))];
  const [filterBroadCategory, setFilterBroadCategory] = useState('All');


  const filteredDocs = useMemo(() => {
    return policyDocs.filter(doc =>
      (isAdminOrSuperAdmin || doc.status === 'Published' || doc.status === 'Approved') && 
      (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (doc.contentPreview && doc.contentPreview.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (filterCanton === 'All' || doc.region === filterCanton) &&
      (filterPolicyType === 'All' || doc.policyType === filterPolicyType) &&
      (filterBroadCategory === 'All' || doc.category === filterBroadCategory)
    );
  }, [searchTerm, filterCanton, filterPolicyType, filterBroadCategory, policyDocs, isAdminOrSuperAdmin]);

  const activeGlobalAlerts = useMemo(() => {
    const now = new Date();
    return policyAlerts.filter(alert => 
        alert.isActive &&
        (alert.regionScope === 'All' || alert.regionScope === currentUser?.region) &&
        (!alert.displayStartDate || new Date(alert.displayStartDate) <= now) &&
        (!alert.displayEndDate || new Date(alert.displayEndDate) >= now)
    );
  }, [policyAlerts, currentUser?.region]);

  const handleOpenUploadModal = (policyToEdit: PolicyDocument | null = null) => {
    setEditingPolicy(policyToEdit);
    setIsUploadModalOpen(true);
  };
  
  const handlePolicySubmit = (data: Partial<PolicyDocType>, file?: File) => {
     if (editingPolicy) {
      setPolicyDocs(prevDocs => prevDocs.map(d => d.id === editingPolicy.id ? { ...d, ...data, fileUrl: file ? file.name : d.fileUrl, lastUpdatedDate: new Date().toISOString() } : d));
    } else {
      const newPolicy: PolicyDocument = {
        id: `pol${Date.now()}`,
        title: data.title || 'Untitled Policy',
        category: data.category || 'Updates & News',
        policyType: data.policyType,
        country: data.country,
        region: data.region,
        tags: data.tags || ['New'],
        publishedDate: new Date().toISOString(),
        lastUpdatedDate: new Date().toISOString(),
        effectiveDate: data.effectiveDate,
        contentPreview: data.contentPreview || 'Details to be added.',
        externalLink: data.externalLink,
        fileUrl: file ? file.name : data.fileUrl,
        fileType: data.fileType,
        status: data.status || 'Draft',
        isCritical: data.isCritical,
        language: data.language,
      };
      setPolicyDocs(prev => [newPolicy, ...prev]);
    }
  };

  const handleDeletePolicy = (id: string) => {
    if (window.confirm('Are you sure you want to delete this policy document?')) {
      setPolicyDocs(prevDocs => prevDocs.filter(d => d.id !== id));
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


  const tabsContent = (category: PolicyDocument['category']) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {filteredDocs.filter(doc => doc.category === category).map(doc => (
        <PolicyDocumentCard 
            key={doc.id} 
            doc={doc}
            onEdit={() => handleOpenUploadModal(doc)}
            onDelete={handleDeletePolicy}
            isAdmin={isAdminOrSuperAdmin}
        />
      ))}
      {filteredDocs.filter(doc => doc.category === category).length === 0 && <p className="text-center text-gray-500 py-8 col-span-full">No documents found in this category for current filters.</p>}
    </div>
  );
  
  const policyTabs = [
    { label: 'Cantonal Policies', content: tabsContent('Cantonal Policies')},
    { label: 'National Regulations', content: tabsContent('National Regulations')},
    { label: 'Compliance', content: tabsContent('Compliance Requirements')},
    { label: 'Updates & News', content: tabsContent('Updates & News')},
    { label: 'Official Downloads', content: tabsContent('Official Downloads')},
  ];


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">State Policies & Regulations</h1>
        {isAdminOrSuperAdmin && (
          <div className="flex space-x-2">
            <Button variant="secondary" leftIcon={ShieldExclamationIcon} onClick={() => { setEditingAlert(null); setIsAlertModalOpen(true); }}>Manage Alerts</Button>
            <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenUploadModal()}>Add/Edit Policy</Button>
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
            <option value="All">All Cantons/Regions</option>
            {cantons.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterPolicyType} onChange={(e) => setFilterPolicyType(e.target.value)} className={STANDARD_INPUT_FIELD} aria-label="Filter by Policy Type">
            <option value="All">All Policy Types</option>
            {policyTypeOptions.map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
           <select value={filterBroadCategory} onChange={(e) => setFilterBroadCategory(e.target.value)} className={STANDARD_INPUT_FIELD} aria-label="Filter by Broad Category">
            <option value="All">All Broad Categories</option>
            {policyBroadCategories.map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
      </Card>

      <Tabs tabs={policyTabs} variant="line" />

      {isAdminOrSuperAdmin && (
        <>
            <ContentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => { setIsUploadModalOpen(false); setEditingPolicy(null); }}
                onSubmit={handlePolicySubmit}
                contentType="policy"
                existingContent={editingPolicy}
            />
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

    </div>
  );
};

export default StatePoliciesPage;
