import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  Search, 
  Filter,
  Calendar,
  User,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  userAgent: string
  status: 'success' | 'failure' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'authentication' | 'authorization' | 'data_access' | 'system' | 'admin'
}

interface ComplianceReport {
  id: string
  name: string
  type: 'gdpr' | 'ccpa' | 'sox' | 'hipaa' | 'pci'
  status: 'compliant' | 'non_compliant' | 'warning'
  lastChecked: string
  nextCheck: string
  issues: number
  details: string
}

const AuditAndCompliance: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState('7d')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Audit logs query
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', dateRange, categoryFilter, severityFilter, statusFilter],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          userId: 'user_123',
          userEmail: 'admin@example.com',
          action: 'LOGIN',
          resource: 'user',
          resourceId: 'user_123',
          details: 'User logged in successfully',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'low' as const,
          category: 'authentication' as const
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          userId: 'user_456',
          userEmail: 'user@example.com',
          action: 'DELETE',
          resource: 'content',
          resourceId: 'content_789',
          details: 'Content deleted: "Sensitive Document"',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'high' as const,
          category: 'data_access' as const
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          userId: 'user_789',
          userEmail: 'manager@example.com',
          action: 'UPDATE',
          resource: 'user_permissions',
          resourceId: 'user_123',
          details: 'User permissions updated: Added admin role',
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          status: 'success' as const,
          severity: 'critical' as const,
          category: 'authorization' as const
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          userId: 'system',
          userEmail: 'system@example.com',
          action: 'BACKUP',
          resource: 'database',
          resourceId: 'db_main',
          details: 'Database backup completed successfully',
          ipAddress: '127.0.0.1',
          userAgent: 'System/BackupService',
          status: 'success' as const,
          severity: 'medium' as const,
          category: 'system' as const
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          userId: 'user_321',
          userEmail: 'hacker@example.com',
          action: 'LOGIN',
          resource: 'user',
          resourceId: 'user_321',
          details: 'Failed login attempt - invalid credentials',
          ipAddress: '192.168.1.200',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'failure' as const,
          severity: 'high' as const,
          category: 'authentication' as const
        }
      ] as AuditLog[]
    }
  })

  // Compliance reports query
  const { data: complianceReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['compliance-reports'],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800))
      return [
        {
          id: '1',
          name: 'GDPR Compliance',
          type: 'gdpr' as const,
          status: 'compliant' as const,
          lastChecked: '2024-01-15T10:00:00Z',
          nextCheck: '2024-02-15T10:00:00Z',
          issues: 0,
          details: 'All GDPR requirements met. Data processing activities are compliant.'
        },
        {
          id: '2',
          name: 'CCPA Compliance',
          type: 'ccpa' as const,
          status: 'warning' as const,
          lastChecked: '2024-01-14T15:30:00Z',
          nextCheck: '2024-02-14T15:30:00Z',
          issues: 2,
          details: 'Minor issues found: Data retention policies need review.'
        },
        {
          id: '3',
          name: 'SOX Compliance',
          type: 'sox' as const,
          status: 'compliant' as const,
          lastChecked: '2024-01-13T09:15:00Z',
          nextCheck: '2024-04-13T09:15:00Z',
          issues: 0,
          details: 'SOX requirements fully satisfied. Financial controls are adequate.'
        },
        {
          id: '4',
          name: 'HIPAA Compliance',
          type: 'hipaa' as const,
          status: 'non_compliant' as const,
          lastChecked: '2024-01-12T14:45:00Z',
          nextCheck: '2024-02-12T14:45:00Z',
          issues: 5,
          details: 'Critical issues found: PHI access controls need immediate attention.'
        }
      ] as ComplianceReport[]
    }
  })

  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus
  }) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failure':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failure':
        return 'bg-red-100 text-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'non_compliant':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplianceStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'non_compliant':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Shield className="h-5 w-5 text-gray-500" />
    }
  }

  if (logsLoading || reportsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">Audit & Compliance</h1>
          <p className="mt-1 text-gray-500">Monitor system activity and ensure regulatory compliance</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              refetchLogs()
            }}
          >
            Refresh
          </Button>
          <Button variant="secondary" icon={Download}>
            Export Logs
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceReports?.map((report) => (
          <Card key={report.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getComplianceStatusIcon(report.status)}
                <h3 className="text-sm font-medium text-gray-900">{report.name}</h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceStatusColor(report.status)}`}>
                {report.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Issues:</span>
                <span className={report.issues > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                  {report.issues}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Check:</span>
                <span className="text-gray-900">
                  {new Date(report.lastChecked).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next Check:</span>
                <span className="text-gray-900">
                  {new Date(report.nextCheck).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-600">{report.details}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Audit Logs Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_access">Data Access</option>
              <option value="system">System</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.userEmail}</div>
                      <div className="text-sm text-gray-500">{log.userId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.resource} ({log.resourceId})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-swiss-mint hover:text-swiss-teal">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || categoryFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No audit logs available for the selected time range.'}
          </p>
        </Card>
      )}
    </div>
  )
}

export default AuditAndCompliance