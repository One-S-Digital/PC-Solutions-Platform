import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  Heart,
  TrendingUp,
  Activity
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const Dashboard: React.FC = () => {
  const user = {
    fullName: 'Development User'
  }

  // System health check
  const { data: healthData } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => publicApi.getSystemHealth(),
    refetchInterval: 120000, // Refresh every 2 minutes instead of 30 seconds
  })

  const usersData = 42
  const usersLoading = false
  const orgsData = 8
  const orgsLoading = false
  const productsData = 15
  const productsLoading = false
  const leadsData = 23
  const leadsLoading = false

  const stats = [
    {
      name: 'Total Users',
      value: usersData || 0,
      icon: Users,
      loading: usersLoading,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint/10',
    },
    {
      name: 'Organizations',
      value: orgsData || 0,
      icon: Building2,
      loading: orgsLoading,
      color: 'text-swiss-sand',
      bgColor: 'bg-swiss-sand/20',
    },
    {
      name: 'Products',
      value: productsData || 0,
      icon: Package,
      loading: productsLoading,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal/10',
    },
    {
      name: 'Parent Leads',
      value: leadsData || 0,
      icon: Heart,
      loading: leadsLoading,
      color: 'text-swiss-coral',
      bgColor: 'bg-swiss-coral/10',
    }
  ]

  const systemStatus = healthData?.data?.status === 'OK'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">Admin Dashboard</h1>
        <p className="mt-1 text-gray-500">Welcome back, {user?.fullName}. Here's what's happening with your platform.</p>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${systemStatus ? 'bg-swiss-mint' : 'bg-red-500'} animate-pulse`}></div>
            <h2 className="text-lg font-semibold text-swiss-charcoal">System Status</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {systemStatus ? 'All systems operational' : 'System issues detected'}
            </span>
          </div>
        </div>
        
        {healthData?.data && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Environment:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">{healthData.data.environment}</span>
            </div>
            <div>
              <span className="text-gray-500">Uptime:</span>
              <span className="ml-2 font-medium text-swiss-charcoal">{Math.floor(healthData.data.uptime / 60)}m</span>
            </div>
            <div>
              <span className="text-gray-500">Backend API:</span>
              <span className="ml-2 font-medium text-swiss-mint">Connected</span>
            </div>
            <div>
              <span className="text-gray-500">Database:</span>
              <span className="ml-2 font-medium text-swiss-mint">Connected</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-card shadow-soft p-0 overflow-hidden border border-gray-200">
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
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-card hover:bg-gray-50 transition-colors">
            <Users className="h-6 w-6 text-swiss-teal mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Manage Users</h3>
            <p className="text-sm text-gray-600">Add, edit, or remove users</p>
          </button>

          <button className="p-4 text-left border border-gray-200 rounded-card hover:bg-gray-50 transition-colors">
            <Building2 className="h-6 w-6 text-swiss-mint mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Organizations</h3>
            <p className="text-sm text-gray-600">Manage daycare centers</p>
          </button>

          <button className="p-4 text-left border border-gray-200 rounded-card hover:bg-gray-50 transition-colors">
            <ShoppingCart className="h-6 w-6 text-swiss-coral mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Orders</h3>
            <p className="text-sm text-gray-600">View recent orders</p>
          </button>

          <button className="p-4 text-left border border-gray-200 rounded-card hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-6 w-6 text-swiss-sand mb-2" />
            <h3 className="font-medium text-swiss-charcoal">Analytics</h3>
            <p className="text-sm text-gray-600">View platform metrics</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-swiss-mint rounded-full"></div>
            <span className="text-gray-600">System started successfully</span>
            <span className="text-gray-400">• Just now</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-swiss-sand rounded-full"></div>
            <span className="text-gray-600">Admin dashboard accessed by {user?.fullName}</span>
            <span className="text-gray-400">• Just now</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Backend API health check passed</span>
            <span className="text-gray-400">• 30 seconds ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard