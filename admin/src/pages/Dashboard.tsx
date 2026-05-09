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
  Briefcase,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { publicApi, useApiClient, apiService } from '../services/api'
import * as api from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import ContentUploadModal from '../components/ContentUploadModal'
import UserAnalyticsSection from '../components/UserAnalyticsSection'
import { useTranslation } from 'react-i18next'

type ContentType = 'e-learning' | 'hr' | 'policy';

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const apiClient = useApiClient()
  const { t } = useTranslation(['dashboard', 'common', 'admin'])

  // System health check
  const { data: healthData } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => publicApi.getSystemHealth(),
    refetchInterval: 120000, // Refresh every 2 minutes instead of 30 seconds
  })

  // Policy crawler status (visible regardless of feature toggles)
  const { data: crawlerHealthResp } = useQuery({
    queryKey: ['dashboard-policy-crawler-health'],
    queryFn: async () => apiClient.get('/admin/crawler/health'),
    enabled: !!apiClient,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  })

  const crawlerEnabled = Boolean((crawlerHealthResp?.data as any)?.enabled)

  // Fetch dashboard counts from analytics endpoint (accurate DB counts)
  const { data: dashboardCountsResponse, isLoading: countsLoading } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: () => apiService.getDashboardCounts(apiClient),
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

  const dashboardCounts = dashboardCountsResponse?.data?.data
  const usersData = dashboardCounts?.totalUsers ?? 0
  const orgsData = dashboardCounts?.totalFoundations ?? 0
  const productsData = dashboardCounts?.totalProducts ?? 0
  const leadsData = dashboardCounts?.totalParentLeads ?? 0
  const totalJobs = dashboardCounts?.totalJobs ?? 0
  const totalApplications = dashboardCounts?.totalApplications ?? 0

  // Staffing signals
  const { data: staffingSignalsResp, isLoading: signalsLoading } = useQuery({
    queryKey: ['admin-staffing-signals'],
    queryFn: () => apiService.getStaffingSignals(apiClient),
    enabled: !!apiClient,
    staleTime: 60000,
    select: (res: any) => res?.data?.data ?? res?.data ?? null,
  })

  const staffingSignals = staffingSignalsResp as { openRequests: number; matchedRequests: number; filledRequests: number; replacementPoolSize: number } | null

  const { data: clerkOverviewResp, isLoading: clerkOverviewLoading } = useQuery({
    queryKey: ['admin-clerk-overview'],
    queryFn: () => apiService.getClerkOverview(apiClient),
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
    select: (res: any) => res?.data?.data ?? null,
  })

  const staffingStats = [
    {
      name: 'Open Replacements',
      value: staffingSignals?.openRequests ?? 0,
      icon: RefreshCw,
      loading: signalsLoading,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal/10',
      link: '/replacements',
    },
    {
      name: 'Matched Replacements',
      value: staffingSignals?.matchedRequests ?? 0,
      icon: Briefcase,
      loading: signalsLoading,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint/10',
      link: '/replacements?status=MATCHED',
    },
    {
      name: 'Replacement Pool',
      value: staffingSignals?.replacementPoolSize ?? 0,
      icon: UserCheck,
      loading: signalsLoading,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/candidates',
    },
    {
      name: 'Job Listings',
      value: totalJobs,
      icon: FileText,
      loading: countsLoading,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/job-listings',
    },
  ]

  const stats = [
    {
      name: t('dashboard:sidebar.allUsersTitle', 'Total Users'),
      value: usersData,
      icon: Users,
      loading: countsLoading,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint/10',
      link: '/users',
    },
    {
      name: t('dashboard:sidebar.foundations', 'Foundations'),
      value: orgsData,
      icon: Building2,
      loading: countsLoading,
      color: 'text-swiss-sand',
      bgColor: 'bg-swiss-sand/20',
      link: '/organizations',
    },
    {
      name: t('dashboard:sidebar.products', 'Products'),
      value: productsData,
      icon: Package,
      loading: countsLoading,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal/10',
      link: '/products',
    },
    {
      name: t('dashboard:sidebar.parentLeads', 'Parent Leads'),
      value: leadsData,
      icon: Heart,
      loading: countsLoading,
      color: 'text-swiss-coral',
      bgColor: 'bg-swiss-coral/10',
      link: '/parent-leads',
    }
  ]

  // Additional job stats
  const jobStats = [
    {
      name: t('dashboard:sidebar.jobListings', 'Job Listings'),
      value: totalJobs,
      icon: Briefcase,
      loading: countsLoading,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/job-listings',
    },
    {
      name: t('dashboard:sidebar.applications', 'Applications'),
      value: totalApplications,
      icon: FileText,
      loading: countsLoading,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/candidates',
    },
  ]

  const systemStatus = (() => {
    const data: any = healthData?.data
    const status = typeof data?.status === 'string' ? data.status.toLowerCase() : undefined
    if (status) return ['ok', 'healthy', 'ready'].includes(status)
    if (typeof data?.healthy === 'boolean') return data.healthy
    return false
  })()

  // Overall loading state for summary section
  const statsLoading = countsLoading

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

      alert(t('admin:dashboard.contentUploadSuccess', 'Content uploaded successfully!'))
    } catch (error: any) {
      console.error('Content upload failed:', error)
      throw error
    }
  }

  const contentStats = [
    {
      name: t('dashboard:eLearningPage.title', 'E-Learning Items'),
      count: eLearningCount,
      icon: GraduationCap,
      loading: contentLoading,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/content',
      addAction: () => handleOpenContentModal('e-learning'),
    },
    {
      name: t('dashboard:hrProceduresPage.title', 'HR Documents'),
      count: hrDocsCount,
      icon: FileText,
      loading: contentLoading,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/content',
      addAction: () => handleOpenContentModal('hr'),
    },
    {
      name: t('dashboard:statePoliciesPage.title', 'State Policies'),
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
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('dashboard:sidebar.dashboard', 'Dashboard')}</h1>
        <p className="mt-1 text-gray-500">{t('dashboard:welcome', 'Welcome to your Admin Dashboard!')}</p>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${systemStatus ? 'bg-swiss-mint' : 'bg-red-500'} animate-pulse`}></div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">{t('dashboard:adminSystemMonitoringPage.overallStatus.title', 'Overall System Status')}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {systemStatus ? t('dashboard:adminSystemMonitoringPage.overallStatus.operational', 'Operational') : t('dashboard:adminSystemMonitoringPage.overallStatus.down', 'Down')}
            </span>
          </div>
        </div>
        
        {healthData?.data && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('dashboard:adminSystemMonitoringPage.metadata.environment', 'Environment')}:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">
                {(healthData.data as any).environment ?? (healthData.data as any).service ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t('dashboard:adminSystemMonitoringPage.serverPerformance.uptimeDays', 'Uptime (Days)')}:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">
                {typeof (healthData.data as any).uptime === 'number'
                  ? Math.floor(((healthData.data as any).uptime as number) / 86400)
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t('dashboard:adminSystemMonitoringPage.components.api', 'API')}:</span>
              <span className="ml-2 font-medium text-swiss-mint">{t('dashboard:adminSystemMonitoringPage.overallStatus.operational', 'Operational')}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('dashboard:adminSystemMonitoringPage.components.database', 'Database')}:</span>
              <span className="ml-2 font-medium text-swiss-mint">{t('dashboard:adminSystemMonitoringPage.overallStatus.operational', 'Operational')}</span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('admin:dashboard.policyCrawler.label', 'Policy Crawler')}:</span>
            <span className={`text-sm font-medium ${crawlerEnabled ? 'text-green-700' : 'text-red-700'}`}>
              {crawlerEnabled
                ? t('admin:dashboard.policyCrawler.enabled', 'Enabled')
                : t('admin:dashboard.policyCrawler.disabled', 'Disabled')}
            </span>
          </div>
          <Button
            variant="outline"
            className="text-sm"
            onClick={() => navigate('/policy-crawler')}
          >
            {t('admin:dashboard.policyCrawler.manage', 'Manage')} →
          </Button>
        </div>
      </Card>

      {/* Staffing Signal Cards (Phase 6) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recruitment Signals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {staffingStats.map((stat) => (
            <Card
              key={stat.name}
              className="p-0 overflow-hidden cursor-pointer"
              hoverEffect
              onClick={() => stat.link && navigate(stat.link)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.loading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <p className="text-2xl font-bold text-swiss-charcoal">{stat.value}</p>
                  )}
                </div>
                <p className="mt-3 text-xs text-gray-500">{stat.name}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

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
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('dashboard:adminContentManagementDashboardPage.title', 'Content Management')}</h2>
          <Button
            onClick={() => navigate('/content')}
            variant="outline"
            className="text-sm"
          >
            {t('dashboard:hrProceduresPage.backToCategoriesButton', 'Back To Categories')} →
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
                    title={t('common:add', 'Add') + ' ' + stat.name}
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
                {t('dashboard:navbar.viewAll','View All')} →
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('admin:dashboard.quickActions.title', 'Quick Actions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            hoverEffect
            onClick={() => navigate('/users')}
          >
            <Users className="h-6 w-6 text-swiss-teal mb-2" />
            <h3 className="font-medium text-swiss-charcoal">{t('admin:dashboard.quickActions.manageUsers.title', 'Manage Users')}</h3>
            <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.manageUsers.description', 'Add, edit, or remove users')}</p>
          </Card>

          <Card
            className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            hoverEffect
            onClick={() => navigate('/organizations')}
          >
            <Building2 className="h-6 w-6 text-swiss-mint mb-2" />
            <h3 className="font-medium text-swiss-charcoal">{t('admin:dashboard.quickActions.organizations.title', 'Organizations')}</h3>
            <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.organizations.description', 'Manage daycare centers')}</p>
          </Card>

          <Card
            className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            hoverEffect
            onClick={() => navigate('/orders')}
          >
            <ShoppingCart className="h-6 w-6 text-swiss-coral mb-2" />
            <h3 className="font-medium text-swiss-charcoal">{t('admin:dashboard.quickActions.orders.title', 'Orders')}</h3>
            <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.orders.description', 'View recent orders')}</p>
          </Card>

          <Card
            className="p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            hoverEffect
            onClick={() => navigate('/system')}
          >
            <TrendingUp className="h-6 w-6 text-swiss-sand mb-2" />
            <h3 className="font-medium text-swiss-charcoal">{t('admin:dashboard.quickActions.analytics.title', 'Analytics')}</h3>
            <p className="text-sm text-gray-600">{t('admin:dashboard.quickActions.analytics.description', 'View platform metrics')}</p>
          </Card>
        </div>
      </Card>

      {/* User Analytics */}
      <UserAnalyticsSection data={clerkOverviewResp} isLoading={clerkOverviewLoading} />

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
          {!countsLoading && usersData > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-mint rounded-full"></div>
              <span className="text-gray-600">{usersData} {t('dashboard:registeredUsers', 'registered users in the platform')}</span>
              <span className="text-gray-400">• {t('dashboard:total', 'Total')}</span>
            </div>
          )}
          {!countsLoading && orgsData > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-swiss-sand rounded-full"></div>
              <span className="text-gray-600">{orgsData} {t('dashboard:activeOrganizations', 'active organizations')}</span>
              <span className="text-gray-400">• {t('dashboard:total', 'Total')}</span>
            </div>
          )}
          {!countsLoading && totalJobs > 0 && (
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <span className="text-gray-600">{totalJobs} {t('dashboard:jobsPosted', 'job listings posted')}</span>
              <span className="text-gray-400">• {totalApplications} {t('dashboard:sidebar.applications', 'applications')}</span>
            </div>
          )}
          {!countsLoading && productsData > 0 && (
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
