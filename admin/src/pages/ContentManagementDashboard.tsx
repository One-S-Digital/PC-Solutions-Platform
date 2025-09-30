import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { publicApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'

interface ContentItem {
  id: string
  title: string
  type: 'document' | 'image' | 'video' | 'course' | 'policy'
  status: 'pending' | 'approved' | 'rejected' | 'draft'
  author: string
  organization: string
  createdAt: string
  updatedAt: string
  tags: string[]
  category: string
  size: string
  views: number
  downloads: number
}

const ContentManagementDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  const queryClient = useQueryClient()

  // Mock data - in real implementation, this would come from API
  const { data: contentItems, isLoading } = useQuery({
    queryKey: ['content-management'],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return [
        {
          id: '1',
          title: 'Child Safety Guidelines',
          type: 'document',
          status: 'pending',
          author: 'Sarah Johnson',
          organization: 'KinderWelt',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          tags: ['safety', 'guidelines', 'children'],
          category: 'Safety',
          size: '2.3 MB',
          views: 45,
          downloads: 12
        },
        {
          id: '2',
          title: 'Educational Activities Video',
          type: 'video',
          status: 'approved',
          author: 'Mike Chen',
          organization: 'EcoGoods Global',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T16:45:00Z',
          tags: ['education', 'activities', 'video'],
          category: 'Education',
          size: '156 MB',
          views: 128,
          downloads: 23
        },
        {
          id: '3',
          title: 'Nutrition Policy Document',
          type: 'document',
          status: 'rejected',
          author: 'Lisa Rodriguez',
          organization: 'ProClean Solutions',
          createdAt: '2024-01-13T09:15:00Z',
          updatedAt: '2024-01-13T11:30:00Z',
          tags: ['nutrition', 'policy', 'health'],
          category: 'Policy',
          size: '1.8 MB',
          views: 67,
          downloads: 8
        }
      ] as ContentItem[]
    }
  })

  const approveContent = useMutation({
    mutationFn: async (ids: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Approving content:', ids)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-management'] })
      setSelectedItems([])
      setShowBulkActions(false)
    }
  })

  const rejectContent = useMutation({
    mutationFn: async (ids: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Rejecting content:', ids)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-management'] })
      setSelectedItems([])
      setShowBulkActions(false)
    }
  })

  const deleteContent = useMutation({
    mutationFn: async (ids: string[]) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Deleting content:', ids)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-management'] })
      setSelectedItems([])
      setShowBulkActions(false)
    }
  })

  const filteredItems = contentItems?.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.organization.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  }) || []

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map(item => item.id))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'image':
        return <Eye className="h-4 w-4" />
      case 'video':
        return <Eye className="h-4 w-4" />
      case 'course':
        return <FileText className="h-4 w-4" />
      case 'policy':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">Content Management</h1>
          <p className="mt-1 text-gray-500">Manage and moderate platform content</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" icon={Download}>
            Export
          </Button>
          <Button variant="primary" icon={Upload}>
            Upload Content
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="course">Courses</option>
              <option value="policy">Policies</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.length} item(s) selected
            </span>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                icon={CheckCircle}
                onClick={() => approveContent.mutate(selectedItems)}
                disabled={approveContent.isPending}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={XCircle}
                onClick={() => rejectContent.mutate(selectedItems)}
                disabled={rejectContent.isPending}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                onClick={() => deleteContent.mutate(selectedItems)}
                disabled={deleteContent.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-swiss-mint focus:ring-swiss-mint"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded border-gray-300 text-swiss-mint focus:ring-swiss-mint"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.type} • {item.size}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{item.tags.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.author}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.organization}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>{item.views} views</div>
                      <div>{item.downloads} downloads</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-swiss-mint hover:text-swiss-teal">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by uploading some content.'}
          </p>
        </Card>
      )}
    </div>
  )
}

export default ContentManagementDashboard