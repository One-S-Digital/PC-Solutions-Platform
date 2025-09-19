import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Eye,
  Globe,
  Image,
  Video,
  File
} from 'lucide-react'

import { Menu, Transition, Tab } from '@headlessui/react'
import { useApiClient, apiService } from '../services/api'
import { HrDocument } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const HrDocumentsTab: React.FC = () => {
  const apiClient = useApiClient()
  const { data: hrDocumentsResponse, isLoading, error } = useQuery({
    queryKey: ['hrDocuments'],
    queryFn: () => apiService.getHrDocuments(apiClient),
    enabled: !!apiClient,
  })

  const documents: HrDocument[] = hrDocumentsResponse?.data?.data || []

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500 p-4">Failed to load HR documents.</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        {/* Table Head */}
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        {/* Table Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc: HrDocument) => (
            <tr key={doc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.category}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.updatedAt).toLocaleDateString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {/* Actions Menu */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}



const Content: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')

  // Mock data for content management
  const mockContent = [
    {
      id: '1',
      title: 'Welcome to Pro Crèche Solutions',
      type: 'BLOG_POST',
      status: 'PUBLISHED',
      author: 'Admin',
      publishedDate: '2024-01-15',
      views: 1245,
      featured: true
    },
    {
      id: '2',
      title: 'Safety Guidelines for Daycare Centers',
      type: 'ARTICLE',
      status: 'DRAFT',
      author: 'Sarah Johnson',
      publishedDate: null,
      views: 0,
      featured: false
    },
    {
      id: '3',
      title: 'Hero Banner Image',
      type: 'IMAGE',
      status: 'PUBLISHED',
      author: 'Marketing Team',
      publishedDate: '2024-01-10',
      views: 3421,
      featured: true
    },
    {
      id: '4',
      title: 'Introduction Video',
      type: 'VIDEO',
      status: 'PUBLISHED',
      author: 'Content Team',
      publishedDate: '2024-01-08',
      views: 892,
      featured: false
    }
  ]

  const filteredContent = mockContent.filter((content: any) => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || content.type === selectedType
    return matchesSearch && matchesType
  })

  const statusColors = {
    'PUBLISHED': 'bg-green-100 text-green-800',
    'DRAFT': 'bg-yellow-100 text-yellow-800',
    'ARCHIVED': 'bg-gray-100 text-gray-800',
  }

  const typeIcons = {
    'BLOG_POST': FileText,
    'ARTICLE': FileText,
    'IMAGE': Image,
    'VIDEO': Video,
    'DOCUMENT': File,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="h-8 w-8 mr-3 text-swiss-teal" />
            Content Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage website content, blogs, and media ({mockContent.length} total)
          </p>
        </div>
        <button className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Create Content
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="BLOG_POST">Blog Post</option>
              <option value="ARTICLE">Article</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContent.map((content: any) => {
                const IconComponent = typeIcons[content.type] || FileText
                return (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-swiss-teal/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-swiss-teal" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {content.title}
                            {content.featured && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{content.type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[content.status] || 'bg-gray-100 text-gray-800'}`}>
                        {content.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{content.author}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {content.views}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {content.publishedDate ? new Date(content.publishedDate).toLocaleDateString() : 'Not published'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <Globe className="h-4 w-4 mr-2" />
                                    View Live
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or create new content.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Content
