import React, { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  File,
  Upload,
  BookOpen,
  Users,
  Shield,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'

import { Menu, Transition, Tab } from '@headlessui/react'
import { useApiClient, apiService } from '../services/api'
import { HrDocument } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import SimpleAssetUploader from '../components/settings/SimpleAssetUploader'

// E-learning Content Upload Component
const ELearningUploadTab: React.FC = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  const { data: coursesResponse, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiService.getCourses(apiClient),
    enabled: !!apiClient,
  })

  const courses = coursesResponse?.data?.data || []

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      // Create form data for course upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
      formData.append('description', `E-learning content: ${file.name}`)
      formData.append('difficultyLevel', 'beginner')
      formData.append('estimatedDuration', '60')

      const response = await apiService.uploadCourseContent(apiClient, formData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'E-learning content uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
      } else {
        setUploadStatus({ type: 'error', message: 'Failed to upload content' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ type: 'error', message: 'Upload failed. Please try again.' })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <BookOpen className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload E-learning Content</h3>
        </div>
        
        <div className="mb-4">
          <SimpleAssetUploader
            onUpload={handleFileUpload}
            accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.ppt,.pptx"
            maxSize={100 * 1024 * 1024} // 100MB
            disabled={isUploading}
          />
        </div>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span className="text-sm">{uploadStatus.message}</span>
            <button
              onClick={() => setUploadStatus({ type: null, message: '' })}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Existing Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Existing E-learning Courses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.map((course: any) => (
                <tr key={course.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      course.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.estimatedDuration} min</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-swiss-teal hover:text-swiss-mint mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// HR Procedures Upload Component
const HrProceduresUploadTab: React.FC = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  const { data: hrDocumentsResponse, isLoading } = useQuery({
    queryKey: ['hrDocuments'],
    queryFn: () => apiService.getHrDocuments(apiClient),
    enabled: !!apiClient,
  })

  const documents: HrDocument[] = hrDocumentsResponse?.data?.data || []

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
      formData.append('category', 'HR_PROCEDURE')
      formData.append('description', `HR Procedure: ${file.name}`)

      const response = await apiService.uploadHrDocument(apiClient, formData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'HR procedure uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['hrDocuments'] })
      } else {
        setUploadStatus({ type: 'error', message: 'Failed to upload HR procedure' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ type: 'error', message: 'Upload failed. Please try again.' })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Users className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload HR Procedures</h3>
        </div>
        
        <div className="mb-4">
          <SimpleAssetUploader
            onUpload={handleFileUpload}
            accept=".pdf,.doc,.docx"
            maxSize={50 * 1024 * 1024} // 50MB
            disabled={isUploading}
          />
        </div>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span className="text-sm">{uploadStatus.message}</span>
            <button
              onClick={() => setUploadStatus({ type: null, message: '' })}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Existing HR Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Existing HR Procedures</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc: HrDocument) => (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-swiss-teal hover:text-swiss-mint mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// State Policy Updates Upload Component
const StatePolicyUploadTab: React.FC = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  const { data: policiesResponse, isLoading } = useQuery({
    queryKey: ['statePolicies'],
    queryFn: () => apiService.getStatePolicies(apiClient),
    enabled: !!apiClient,
  })

  const policies = policiesResponse?.data?.data || []

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
      formData.append('category', 'STATE_POLICY')
      formData.append('description', `State Policy Update: ${file.name}`)
      formData.append('effectiveDate', new Date().toISOString())

      const response = await apiService.uploadStatePolicy(apiClient, formData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'State policy uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['statePolicies'] })
      } else {
        setUploadStatus({ type: 'error', message: 'Failed to upload state policy' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ type: 'error', message: 'Upload failed. Please try again.' })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload State Policy Updates</h3>
        </div>
        
        <div className="mb-4">
          <SimpleAssetUploader
            onUpload={handleFileUpload}
            accept=".pdf,.doc,.docx"
            maxSize={50 * 1024 * 1024} // 50MB
            disabled={isUploading}
          />
        </div>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span className="text-sm">{uploadStatus.message}</span>
            <button
              onClick={() => setUploadStatus({ type: null, message: '' })}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Existing State Policies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Existing State Policies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy: any) => (
                <tr key={policy.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{policy.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{policy.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-swiss-teal hover:text-swiss-mint mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}



const Content: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0)

  const tabs = [
    {
      name: 'E-learning',
      icon: BookOpen,
      component: ELearningUploadTab,
      description: 'Upload and manage e-learning courses and content'
    },
    {
      name: 'HR Procedures',
      icon: Users,
      component: HrProceduresUploadTab,
      description: 'Upload and manage HR procedures and documents'
    },
    {
      name: 'State Policies',
      icon: Shield,
      component: StatePolicyUploadTab,
      description: 'Upload and manage state policy updates'
    }
  ]

  const SelectedComponent = tabs[selectedTab].component

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Upload className="h-8 w-8 mr-3 text-swiss-teal" />
            Content Upload Center
          </h1>
          <p className="mt-2 text-gray-600">
            Upload and manage different types of content for your organization
          </p>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon
              const isSelected = selectedTab === index
              
              return (
                <button
                  key={tab.name}
                  onClick={() => setSelectedTab(index)}
                  className={`${
                    isSelected
                      ? 'border-swiss-teal text-swiss-teal'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-200`}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">{tabs[selectedTab].description}</p>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <SelectedComponent />
        </div>
      </div>
    </div>
  )
}

export default Content
