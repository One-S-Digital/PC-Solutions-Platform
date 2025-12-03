import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  Heart,
  TrendingUp,
  Activity,
  GraduationCap,
  FileText,
  Scale,
  PlusCircle,
  Briefcase
} from 'lucide-react'
import { publicApi, useApiClient, apiService } from '../services/api'
import * as api from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import ContentUploadModal from '../components/ContentUploadModal'
import { useTranslation } from 'react-i18next'

type ContentType = 'e-learning' | 'hr' | 'policy';

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const apiClient = useApiClient()
  const { t } = useTranslation(['dashboard', 'common'])
  const user = {
    fullName: 'Development User'
  }

  // System health check
  const { data: healthData } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => publicApi.getSystemHealth(),
    refetchInterval: 120000, // Refresh every 2 minutes instead of 30 seconds
  })

  // Fetch users count directly from users endpoint
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['dashboard-users-count'],
    queryFn: () => apiService.getUsers(apiClient),
    enabled: !!apiClient,
    staleTime: 60000, // Cache for 1 minute
  })

  // Fetch organizations count directly from organizations endpoint
  const { data: orgsResponse, isLoading: orgsLoading } = useQuery({
    queryKey: ['dashboard-orgs-count'],
    queryFn: () => apiService.getOrganizations(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
  })

  // Fetch products count directly from products endpoint
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['dashboard-products-count'],
    queryFn: () => apiService.getProducts(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
  })

  // Fetch parent leads count directly from parent-leads endpoint
  const { data: parentLeadsResponse, isLoading: parentLeadsLoading } = useQuery({
    queryKey: ['dashboard-parent-leads-count'],
    queryFn: () => apiService.getParentLeads(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
  })

  // Fetch job listings count directly from job-listings endpoint
  const { data: jobListingsResponse, isLoading: jobListingsLoading } = useQuery({
    queryKey: ['dashboard-job-listings-count'],
    queryFn: () => apiService.getJobListings(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
  })

  // Fetch candidates/applications count directly from candidates endpoint
  const { data: candidatesResponse, isLoading: candidatesLoading } = useQuery({
    queryKey: ['dashboard-candidates-count'],
    queryFn: () => apiService.getCandidates(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
  })

  // Content Management State
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)
  const [contentModalType, setContentModalType] = useState<ContentType>('e-learning')
  const [eLearningCount, setELearningCount] = useState(0)
  const [hrDocsCount, setHrDocsCount] = useState(0)
  const [policiesCount, setPoliciesCount] = useState(0)
  const [contentLoading, setContentLoading] = useState(true)

  // Extract counts directly from API responses - much simpler and more reliable
  const usersData = usersResponse?.data?.data?.length ?? 0
  const orgsData = orgsResponse?.data?.data?.length ?? 0
  const productsData = productsResponse?.data?.data?.length ?? 0
  const leadsData = parentLeadsResponse?.data?.data?.length ?? 0
  const totalJobs = jobListingsResponse?.data?.data?.length ?? 0
  const totalApplications = candidatesResponse?.data?.data?.length ?? 0

  const stats = [
    {
      name: t('sidebar.allUsersTitle', 'Total Users'),
      value: usersData,
      icon: Users,
      loading: usersLoading,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint/10',
      link: '/users',
    },
    {
      name: t('sidebar.foundations', 'Organizations'),
      value: orgsData,
      icon: Building2,
      loading: orgsLoading,
      color: 'text-swiss-sand',
      bgColor: 'bg-swiss-sand/20',
      link: '/organizations',
    },
    {
      name: t('sidebar.products', 'Products'),
      value: productsData,
      icon: Package,
      loading: productsLoading,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal/10',
      link: '/products',
    },
    {
      name: t('sidebar.parentLeads', 'Parent Leads'),
      value: leadsData,
      icon: Heart,
      loading: parentLeadsLoading,
      color: 'text-swiss-coral',
      bgColor: 'bg-swiss-coral/10',
      link: '/parent-leads',
    }
  ]

  // Additional job stats
  const jobStats = [
    {
      name: t('sidebar.jobListings', 'Job Listings'),
      value: totalJobs,
      icon: Briefcase,
      loading: jobListingsLoading,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/job-listings',
    },
    {
      name: t('dashboard:sidebar.applications', 'Applications'),
      value: totalApplications,
      icon: FileText,
      loading: candidatesLoading,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/candidates',
    },
  ]

  const systemStatus = healthData?.data?.status === 'OK'

  // Overall loading state for summary section
  const statsLoading = usersLoading || orgsLoading || productsLoading || jobListingsLoading

  // Fetch content counts
  useEffect(() => {
    const fetchContentCounts = async () => {
      setContentLoading(true)
      try {
        const [eLearningRes, hrRes, policiesRes] = await Promise.all([
          api.getELearning(apiClient, { page: 1, limit: 1 }),
          api.getHrDocuments(apiClient, { page: 1, limit: 1 }),
          api.getStatePolicies(apiClient, { page: 1, limit: 1 }),
        ])

        if (eLearningRes.data.success) {
          const result = eLearningRes.data as any
          setELearningCount(result.pagination?.total || result.data?.length || 0)
        }
        if (hrRes.data.success) {
          const result = hrRes.data as any
          setHrDocsCount(result.pagination?.total || result.data?.length || 0)
        }
        if (policiesRes.data.success) {
          const result = policiesRes.data as any
          setPoliciesCount(result.pagination?.total || result.data?.length || 0)
        }
      } catch (error) {
        console.error('Failed to fetch content counts:', error)
      } finally {
        setContentLoading(false)
      }
    }

    fetchContentCounts()
  }, [apiClient])

  const handleOpenContentModal = (type: ContentType) => {
    setContentModalType(type)
    setIsContentModalOpen(true)
  }

  const handleContentSubmit = async (data: any, file?: File, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      
      // Append all form data
      Object.keys(data).forEach((key) => {
        const value = data[key]
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value))
          } else {
            formData.append(key, String(value))
          }
        }
      })

      // Upload based on content type
      if (contentModalType === 'e-learning') {
        await api.uploadELearning(apiClient, formData, onProgress)
      } else if (contentModalType === 'hr') {
        await api.uploadHrDocument(apiClient, formData, onProgress)
      } else if (contentModalType === 'policy') {
        await api.uploadStatePolicy(apiClient, formData, onProgress)
      }

      // Refresh counts
      const fetchCounts = async () => {
        const [eLearningRes, hrRes, policiesRes] = await Promise.all([
          api.getELearning(apiClient, { page: 1, limit: 1 }),
          api.getHrDocuments(apiClient, { page: 1, limit: 1 }),
          api.getStatePolicies(apiClient, { page: 1, limit: 1 }),
        ])
        if (eLearningRes.data.success) {
          const result = eLearningRes.data as any
          setELearningCount(result.pagination?.total || result.data?.length || 0)
        }
        if (hrRes.data.success) {
          const result = hrRes.data as any
          setHrDocsCount(result.pagination?.total || result.data?.length || 0)
        }
        if (policiesRes.data.success) {
          const result = policiesRes.data as any
          setPoliciesCount(result.pagination?.total || result.data?.length || 0)
        }
      }
      fetchCounts()

      alert('Content uploaded successfully!')
    } catch (error: any) {
      console.error('Content upload failed:', error)
      throw error
    }
  }

  const contentStats = [
    {
      name: t('eLearningPage.title', 'E-Learning Items'),
      count: eLearningCount,
      icon: GraduationCap,
      loading: contentLoading,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/content',
      addAction: () => handleOpenContentModal('e-learning'),
    },
    {
      name: t('hrProceduresPage.title', 'HR Documents'),
      count: hrDocsCount,
      icon: FileText,
      loading: contentLoading,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/content',
      addAction: () => handleOpenContentModal('hr'),
    },
    {
      name: t('statePoliciesPage.title', 'State Policies'),
      count: policiesCount,
      icon: Scale,
      loading: contentLoading,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/content',
      addAction: () => handleOpenContentModal('policy'),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('sidebar.dashboard')}</h1>
        <p className="mt-1 text-gray-500">{t('dashboardPage.welcome', { name: user?.fullName })}</p>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${systemStatus ? 'bg-swiss-mint' : 'bg-red-500'} animate-pulse`}></div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">{t('adminSystemMonitoringPage.overallStatus.title', 'System Status')}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {systemStatus ? t('adminSystemMonitoringPage.overallStatus.operational','All systems operational') : t('adminSystemMonitoringPage.overallStatus.down','System issues detected')}
            </span>
          </div>
        </div>
        
        {healthData?.data && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('adminSystemMonitoringPage.metadata.environment','Environment')}:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">{healthData.data.environment}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('adminSystemMonitoringPage.serverPerformance.uptimeDays','Uptime')}:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">{Math.floor(healthData.data.uptime / 60)}m</span>
            </div>
            <div>
              <span className="text-gray-500">{t('adminSystemMonitoringPage.components.api','API')}:</span>
              <span className="ml-2 font-medium text-swiss-mint">{t('adminSystemMonitoringPage.overallStatus.operational','Connected')}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('adminSystemMonitoringPage.components.database','Database')}:</span>
              <span className="ml-2 font-medium text-swiss-mint">{t('adminSystemMonitoringPage.overallStatus.operational','Connected')}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card 
            key={stat.name} 
            className="p-0 overflow-hidden cursor-pointer" 
            hoverEffect 
            onClick={() => stat.link && navigate(stat.link)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                {stat.loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <p className="text-2xl font-bold text-swiss-charcoal">{stat.value}</p>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500">{stat.name}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Job Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobStats.map((stat) => (
          <Card 
            key={stat.name} 
            className="p-0 overflow-hidden cursor-pointer" 
            hoverEffect
            onClick={() => stat.link && navigate(stat.link)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                {stat.loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <p className="text-2xl font-bold text-swiss-charcoal">{stat.value}</p>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500">{stat.name}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Content Management Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('adminContentManagementDashboardPage.title','Content Management')}</h2>
          <Button
            onClick={() => navigate('/content')}
            variant="outline"
            className="text-sm"
          >
            {t('hrProceduresPage.backToCategoriesButton','View All Content')} →
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contentStats.map((stat) => (
            <Card key={stat.name} className="p-0 overflow-hidden relative" hoverEffect>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <button
                    onClick={stat.addAction}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title={t('buttons.add', 'Add') + ' ' + stat.name}
                  >
                    <PlusCircle className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
                  </button>
                </div>
                {stat.loading ? (
                  <div className="mt-4">
                    <LoadingSpinner size="small" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-swiss-charcoal mt-4">{stat.count}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">{stat.name}</p>
              </div>
              <button
                onClick={() => navigate(stat.link)}
                className={`block w-full px-6 py-3 text-sm font-medium text-center ${stat.bgColor} ${stat.color} hover:opacity-80 transition-opacity`}
              >
                {t('navbar.viewAll','View All')} →
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer" hoverEffect>
            <Users className="h-6 w-6 text-swiss-teal mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Manage Users</h3>
            <p className="text-sm text-gray-600">Add, edit, or remove users</p>
          </Card>

          <Card className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer" hoverEffect>
            <Building2 className="h-6 w-6 text-swiss-mint mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Organizations</h3>
            <p className="text-sm text-gray-600">Manage daycare centers</p>
          </Card>

          <Card className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer" hoverEffect>
            <ShoppingCart className="h-6 w-6 text-swiss-coral mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Orders</h3>
            <p className="text-sm text-gray-600">View recent orders</p>
          </Card>

          <Card className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer" hoverEffect>
            <TrendingUp className="h-6 w-6 text-swiss-sand mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Analytics</h3>
            <p className="text-sm text-gray-600">View platform metrics</p>
          </Card>
        </div>
      </Card>

      {/* Platform Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('dashboard:platformSummary', 'Platform Summary')}</h2>
        <div className="space-y-4">
          {systemStatus && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-mint rounded-full"></div>
              <span className="text-gray-600">{t('dashboard:systemHealthy', 'All systems operational')}</span>
              <span className="text-gray-400">• {t('dashboard:live', 'Live')}</span>
            </div>
          )}
          {!usersLoading && usersData > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-mint rounded-full"></div>
              <span className="text-gray-600">{usersData} {t('dashboard:registeredUsers', 'registered users in the platform')}</span>
              <span className="text-gray-400">• {t('dashboard:total', 'Total')}</span>
            </div>
          )}
          {!orgsLoading && orgsData > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-sand rounded-full"></div>
              <span className="text-gray-600">{orgsData} {t('dashboard:activeOrganizations', 'active organizations')}</span>
              <span className="text-gray-400">• {t('dashboard:total', 'Total')}</span>
            </div>
          )}
          {!jobListingsLoading && totalJobs > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span className="text-gray-600">{totalJobs} {t('dashboard:jobsPosted', 'job listings posted')}</span>
              <span className="text-gray-400">• {totalApplications} {t('dashboard:sidebar.applications', 'applications')}</span>
            </div>
          )}
          {!productsLoading && productsData > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-teal rounded-full"></div>
              <span className="text-gray-600">{productsData} {t('dashboard:productsAvailable', 'products in catalog')}</span>
              <span className="text-gray-400">• {t('dashboard:total', 'Total')}</span>
            </div>
          )}
          {statsLoading && (
            <div className="flex items-center space-x-3 text-sm">
              <LoadingSpinner size="small" />
              <span className="text-gray-600">{t('dashboard:loadingStats', 'Loading platform statistics...')}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Content Upload Modal */}
      <ContentUploadModal
        isOpen={isContentModalOpen}
        onClose={() => setIsContentModalOpen(false)}
        onSubmit={handleContentSubmit}
        contentType={contentModalType}
      />
    </div>
  )
}

export default Dashboard