
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
// [FIX] Imported ELEARNING_CATEGORIES and HR_CATEGORIES for valid default values.
import { UserRole, Course, HRDocument, PolicyDocument, UploadableContentType, ELEARNING_CATEGORIES, HR_CATEGORIES, ELearningContentType, ELearningCategory, HRCategory, PolicyCategory, POLICY_CATEGORIES } from '../../types';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import i18n from '../../i18n';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AcademicCapIcon, DocumentTextIcon, NewspaperIcon, PlusCircleIcon, EyeIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import ContentUploadModal from '../../components/admin/ContentUploadModal';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';

interface ContentStat {
  name: string;
  count: number;
  icon: React.ElementType;
  color: string;
  link: string;
  addLinkType: UploadableContentType;
}

interface RecentActivityItem {
  id: string;
  type: UploadableContentType | 'Alert';
  title: string;
  date: string; // ISO string
  user: string; // Name of user who made change
  status?: 'Published' | 'Draft' | 'Critical' | 'Updated';
}


const ContentManagementDashboardPage: React.FC = () => {
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  // Fetch real data from API instead of mocks
  const [courses, setCourses] = useState<Course[]>([]);
  const [hrDocs, setHrDocs] = useState<HRDocument[]>([]);
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadContentType, setUploadContentType] = useState<UploadableContentType>('e-learning');
  const [previewActivity, setPreviewActivity] = useState<RecentActivityItem | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string>('');
  const [previewFileType, setPreviewFileType] = useState<string>('PDF');

  // Fetch all content on mount
  useEffect(() => {
    const fetchAllContent = async () => {
      setIsLoading(true);
      try {
        // Fetch E-Learning content
        const currentLang = i18n.language || 'en';
        const eLearningResponse = await authenticatedRequest<any[]>(`/content/elearning?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });
        if (eLearningResponse.success && eLearningResponse.data) {
          const content = eLearningResponse.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            type: item.contentType || item.type || 'Course',
            category: item.category || ELEARNING_CATEGORIES[0],
            updatedDate: item.updatedAt || new Date().toISOString(),
            thumbnailUrl: item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/300/180`,
            language: item.language || 'EN',
            accessRoles: item.accessRoles || [],
            status: item.status || 'Published',
            lessons: item.lessons,
            duration: item.duration,
            fileUrl: item.publicUrl || item.fileUrl || item.url,
            tags: item.tags || [],
          }));
          setCourses(content);
        }

        // Fetch HR Documents
        const hrResponse = await authenticatedRequest<any[]>(`/content/hr-documents?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });
        if (hrResponse.success && hrResponse.data) {
          const documents = hrResponse.data.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            category: doc.category || HR_CATEGORIES[0],
            fileUrl: doc.publicUrl || doc.fileUrl || doc.url || '#',
            uploaderId: doc.uploaderId || doc.createdBy,
            lastUpdated: doc.updatedAt || new Date().toISOString(),
            fileType: doc.fileType || 'PDF',
            tags: doc.tags || [],
            language: doc.language,
            version: doc.versionNumber || 'v1.0',
            status: doc.status || 'Published',
            isFavorite: false,
          }));
          setHrDocs(documents);
        }

        // Fetch State Policies
        const policiesResponse = await authenticatedRequest<any[]>(`/content/state-policies?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });
        if (policiesResponse.success && policiesResponse.data) {
          const policyDocs = policiesResponse.data.map((policy: any) => ({
            id: policy.id,
            title: policy.title,
            category: policy.category || POLICY_CATEGORIES[0],
            policyType: policy.policyType,
            country: policy.country,
            region: policy.region,
            tags: policy.tags || [],
            publishedDate: policy.createdAt || new Date().toISOString(),
            lastUpdatedDate: policy.updatedAt || new Date().toISOString(),
            effectiveDate: policy.effectiveDate,
            contentPreview: policy.contentPreview || policy.description,
            externalLink: policy.externalLink,
            fileUrl: policy.publicUrl || policy.fileUrl || policy.url,
            fileType: policy.fileType,
            status: policy.status || 'Published',
            isCritical: policy.isCritical || false,
            language: policy.language,
          }));
          setPolicies(policyDocs);
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllContent();
  }, [authenticatedRequest, i18n.language]);

  const contentStats: ContentStat[] = [
    { name: 'E-Learning Items', count: courses.length, icon: AcademicCapIcon, color: 'text-swiss-mint', link: '/e-learning', addLinkType: 'e-learning' },
    { name: 'HR Documents', count: hrDocs.length, icon: DocumentTextIcon, color: 'text-swiss-teal', link: '/hr-procedures', addLinkType: 'hr' },
    { name: 'State Policies', count: policies.length, icon: NewspaperIcon, color: 'text-swiss-coral', link: '/state-policies', addLinkType: 'policy' },
  ];

  const mockRecentActivity: RecentActivityItem[] = useMemo(() => [
    ...courses.slice(0, 2).map((c): RecentActivityItem => ({ id: c.id, type: 'e-learning', title: c.title, date: c.updatedDate, user: 'Admin User', status: 'Published' as const })),
    ...hrDocs.slice(0, 2).map((h): RecentActivityItem => ({ id: h.id, type: 'hr', title: h.title, date: h.lastUpdated, user: 'Super Admin', status: h.tags.includes('New') ? ('Published' as const) : ('Updated' as const) })),
    ...policies.slice(0, 2).map((p): RecentActivityItem => ({ id: p.id, type: 'policy', title: p.title, date: p.lastUpdatedDate, user: 'Admin User', status: p.isCritical ? ('Critical' as const) : ('Published' as const) })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10), [courses, hrDocs, policies]);


  const handleOpenUploadModal = (type: UploadableContentType) => {
    setUploadContentType(type);
    setIsUploadModalOpen(true);
  };

  const handleViewActivity = (activity: RecentActivityItem) => {
    // Find the actual content item to get the file URL
    let fileUrl = '';
    let fileType = 'PDF';
    
    if (activity.type === 'e-learning') {
      const course = courses.find(c => c.id === activity.id);
      if (course?.fileUrl) {
        fileUrl = course.fileUrl;
        // Determine file type from course type
        if (course.type === 'VIDEO') {
          fileType = 'VIDEO';
        } else if (course.type === 'PDF') {
          fileType = 'PDF';
        } else {
          // For COURSE or LINK, navigate instead of preview
          window.open(course.fileUrl, '_blank');
          return;
        }
      }
    } else if (activity.type === 'hr') {
      const doc = hrDocs.find(d => d.id === activity.id);
      if (doc?.fileUrl) {
        fileUrl = doc.fileUrl;
        fileType = doc.fileType || 'PDF';
      }
    } else if (activity.type === 'policy') {
      const policy = policies.find(p => p.id === activity.id);
      if (policy?.fileUrl) {
        fileUrl = policy.fileUrl;
        fileType = policy.fileType || 'PDF';
      } else if (policy?.externalLink) {
        // Open external link
        window.open(policy.externalLink, '_blank');
        return;
      }
    }
    
    // If we have a file URL, open preview modal
    if (fileUrl) {
      setPreviewActivity(activity);
      setPreviewFileUrl(fileUrl);
      setPreviewFileType(fileType);
    } else {
      alert(`No preview available for ${activity.title}`);
    }
  };

  const handleContentSubmit = async (data: Partial<Course | HRDocument | PolicyDocument>, file?: File): Promise<void> => {
    const commonFieldsBase = {
        id: `${uploadContentType}-${Date.now()}`,
        title: data.title || 'Untitled',
        language: data.language,
        tags: data.tags || ['New'],
    };
    
    const commonFieldsDate = {
        updatedDate: new Date().toISOString(), // For Course
        lastUpdated: new Date().toISOString(), // for HR
        publishedDate: new Date().toISOString(), // for Policy
        lastUpdatedDate: new Date().toISOString(), // for Policy
    };


    if (uploadContentType === 'e-learning') {
      const courseData = data as Partial<Course>;
      const newCourse: Course = {
        ...commonFieldsBase,
        id: `crs${Date.now()}`,
        updatedDate: commonFieldsDate.updatedDate,
        description: courseData.description || '',
        type: courseData.type || 'COURSE',
        // [FIX] Used a valid ELearningCategory as a fallback.
        category: courseData.category || ELEARNING_CATEGORIES[0],
        status: courseData.status || 'Draft',
        accessRoles: courseData.accessRoles,
        lessons: courseData.lessons,
        duration: courseData.duration,
        fileUrl: file ? file.name : courseData.fileUrl,
        thumbnailUrl: `https://picsum.photos/seed/new${Date.now()}/300/180`,
      };
      setCourses(prev => [newCourse, ...prev]);
    } else if (uploadContentType === 'hr') {
      const hrData = data as Partial<HRDocument>;
      const newHRDoc: HRDocument = {
         ...commonFieldsBase,
         id: `hr${Date.now()}`,
         lastUpdated: commonFieldsDate.lastUpdated,
        // [FIX] Used a valid HRCategory as a fallback.
         category: hrData.category || HR_CATEGORIES[0],
         status: hrData.status || 'Draft',
         fileUrl: file ? file.name : '#',
         uploaderId: currentUser?.id || 'admin',
         fileType: hrData.fileType || 'PDF',
         version: hrData.version,
         isFavorite: hrData.isFavorite,
      };
      setHrDocs(prev => [newHRDoc, ...prev]);
    } else if (uploadContentType === 'policy') {
      const policyData = data as Partial<PolicyDocument>;
      const newPolicy: PolicyDocument = {
        ...commonFieldsBase,
        id: `pol${Date.now()}`,
        publishedDate: commonFieldsDate.publishedDate,
        lastUpdatedDate: commonFieldsDate.lastUpdatedDate,
        category: policyData.category || 'Other',
        policyType: policyData.policyType,
        country: policyData.country,
        region: policyData.region,
        isCritical: policyData.isCritical,
        status: policyData.status || 'Draft',
        fileUrl: file ? file.name : policyData.fileUrl,
        externalLink: policyData.externalLink,
        contentPreview: policyData.contentPreview,
        effectiveDate: policyData.effectiveDate,
        fileType: policyData.fileType,
      };
      setPolicies(prev => [newPolicy, ...prev]);
    }
    console.log(`New ${uploadContentType} submitted:`, data, file?.name);
    // Modal will close itself if submission is successful
  };
  
  const statusFlags = [
    { name: "Draft Policies", count: policies.filter(p=>p.status === 'Draft').length, icon: PencilSquareIcon, color: "text-gray-500" },
    { name: "Critical Live Policies", count: policies.filter(p=>p.status === 'Approved' && p.isCritical).length, icon: ExclamationTriangleIcon, color: "text-red-500" },
    { name: "E-Learning Needs Translation (FR)", count: courses.filter(c=>c.language !== 'FR').length, icon: LanguageIcon, color: "text-blue-500" }, // Mock logic
  ];


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-swiss-charcoal">Dashboard</h1>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-swiss-mint"></div>
          <p className="mt-2 text-sm text-gray-500">Loading content statistics...</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentStats.map((stat) => (
          <Card key={stat.name} className="p-0 overflow-hidden relative">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className={`p-3 inline-flex rounded-lg bg-opacity-10 ${stat.color.replace('text-', 'bg-')}`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-3 right-3"
                    onClick={() => handleOpenUploadModal(stat.addLinkType)}
                    aria-label={`Add new ${stat.name}`}
                 >
                    <PlusCircleIcon className="h-6 w-6 text-gray-400 hover:text-swiss-mint"/>
                </Button>
              </div>
              <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stat.count}</h3>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
            <Link to={stat.link} className={`block px-5 py-2.5 text-xs text-center font-medium ${stat.color.replace('text-', 'bg-')}/10 ${stat.color} hover:underline`}>
                View All &rarr;
            </Link>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">Recent Activity</h2>
          {mockRecentActivity.length === 0 ? <p className="text-gray-500">No recent activity.</p> : (
            <ul className="space-y-3">
              {mockRecentActivity.map(activity => (
                <li key={`${activity.type}-${activity.id}`} className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                  {activity.type === 'e-learning' && <AcademicCapIcon className="w-6 h-6 text-swiss-mint mr-3 flex-shrink-0"/>}
                  {activity.type === 'hr' && <DocumentTextIcon className="w-6 h-6 text-swiss-teal mr-3 flex-shrink-0"/>}
                  {activity.type === 'policy' && <NewspaperIcon className="w-6 h-6 text-swiss-coral mr-3 flex-shrink-0"/>}
                  {activity.type === 'Alert' && <ShieldExclamationIcon className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0"/>}
                  
                  <div className="flex-grow">
                    <p className="text-sm text-swiss-charcoal font-medium">{activity.title} 
                        <span className="text-xs text-gray-400 ml-1">({activity.type})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.status && <span className={`font-medium ${activity.status === 'Critical' ? 'text-red-600' : activity.status === 'Draft' ? 'text-gray-600' : 'text-green-600'}`}>{activity.status}</span>} by {activity.user} - {new Date(activity.date).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                  <Button variant="ghost" size="xs" leftIcon={EyeIcon} onClick={() => handleViewActivity(activity)}>View</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        
        <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">Content Status Flags</h2>
            {statusFlags.length === 0 ? <p className="text-gray-500">No status flags to show.</p> : (
                <ul className="space-y-3">
                    {statusFlags.map(flag => (
                        <li key={flag.name} className="flex items-center p-2 -m-2 rounded-md hover:bg-gray-50">
                            <flag.icon className={`w-5 h-5 mr-2.5 ${flag.color}`} />
                            <span className="text-sm text-gray-700">{flag.name}:</span>
                            <span className="text-sm font-semibold text-swiss-charcoal ml-1.5">{flag.count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
      </div>

      <ContentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleContentSubmit}
        contentType={uploadContentType}
      />

      {previewActivity && previewFileUrl && (
        <DocumentPreviewModal
          isOpen={!!previewActivity}
          onClose={() => {
            setPreviewActivity(null);
            setPreviewFileUrl('');
            setPreviewFileType('PDF');
          }}
          fileUrl={previewFileUrl}
          fileName={previewActivity.title}
          fileType={previewFileType}
        />
      )}
    </div>
  );
};


// Minimal icons for this page if not available elsewhere
const PencilSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const LanguageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C13.18 6.062 14.12 7.028 15 7.615m-7.5 7.5c-.818-.818-1.424-1.852-1.824-2.997M17.25 10.5a4.5 4.5 0 01-4.5 4.5m4.5-4.5a4.5 4.5 0 00-4.5 4.5M1.5 15H4.529a48.349 48.349 0 011.666-.339m13.205-1.558a48.348 48.348 0 00-1.666-.339" />
  </svg>
);


export default ContentManagementDashboardPage;