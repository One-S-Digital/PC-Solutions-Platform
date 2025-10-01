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
  X,
  AlertTriangle,
  Bell,
  BellOff,
  MapPin
} from 'lucide-react'

import { Menu, Transition, Tab } from '@headlessui/react'
import { useApiClient, apiService } from '../services/api'
import { HrDocument } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import FileDropZone from '../components/forms/FileDropZone'
import { publicApi } from '../services/api'
import { toast } from 'sonner'

// E-learning Content Upload Component
const ELearningUploadTab: React.FC = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficultyLevel: 'beginner',
    estimatedDuration: '',
    category: '',
    tags: '',
    objectives: '',
    lessons: ''
  })
  const [contentType, setContentType] = useState('COURSE')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['EN'])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['FOUNDATION'])
  const [status, setStatus] = useState('DRAFT')

  const { data: coursesResponse, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiService.getCourses(apiClient),
    enabled: !!apiClient,
  })

  const courses = coursesResponse?.data?.data || []

  const contentTypeOptions = [
    { label: 'Video', value: 'VIDEO' },
    { label: 'PDF', value: 'PDF' },
    { label: 'Link', value: 'LINK' },
    { label: 'Course', value: 'COURSE' }
  ]

  const languageOptions = ['EN', 'FR', 'DE']

  const accessRoleOptions = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Foundation (Daycare)', value: 'FOUNDATION' },
    { label: 'Educator / Candidate', value: 'EDUCATOR' },
    { label: 'Parent', value: 'PARENT' }
  ]

  const statusOptions = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Archived', value: 'ARCHIVED' }
  ]

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(item => item !== lang) : [...prev, lang]
    )
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(item => item !== role) : [...prev, role]
    )
  }

  const resetForm = () => {
    setSelectedFile(null)
    setFormData({
      title: '',
      description: '',
      difficultyLevel: 'beginner',
      estimatedDuration: '',
      category: '',
      tags: '',
      objectives: '',
      lessons: ''
    })
    setContentType('COURSE')
    setSelectedLanguages(['EN'])
    setSelectedRoles(['FOUNDATION'])
    setStatus('DRAFT')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('difficultyLevel', formData.difficultyLevel)
      uploadFormData.append('estimatedDuration', formData.estimatedDuration)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('tags', selectedRoles.join(',') || formData.tags)
      uploadFormData.append('objectives', formData.objectives)
      uploadFormData.append('lessons', formData.lessons)
      uploadFormData.append('contentType', contentType)
      uploadFormData.append('languages', selectedLanguages.join(','))
      uploadFormData.append('status', status)

      const response = await apiService.uploadCourseContent(apiClient, uploadFormData)

      if (response.success) {
        setUploadStatus({ type: 'success', message: 'E-learning content uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        resetForm()
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-swiss-teal mr-3" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Add E-Learning Content</h3>
              <p className="text-sm text-gray-500">Upload course material and define who should have access.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter course title"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Child Safety"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              required
              placeholder="Provide a short description of the course"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="block text-sm font-medium text-gray-700">Content Type</span>
              <div className="flex flex-wrap gap-2">
                {contentTypeOptions.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setContentType(option.value)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      contentType === option.value
                        ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-sm font-medium text-gray-700">Language</span>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedLanguages.includes(lang)
                        ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700">Duration *</label>
              <input
                type="text"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                required
                placeholder="e.g., 30m, 1h 15m"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lessons" className="block text-sm font-medium text-gray-700">Number of Lessons</label>
              <input
                type="number"
                id="lessons"
                name="lessons"
                min="0"
                value={formData.lessons}
                onChange={handleInputChange}
                placeholder="e.g., 8"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="block text-sm font-medium text-gray-700">Access Roles</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {accessRoleOptions.map(role => (
                  <label key={role.value} className="flex items-center space-x-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-swiss-teal focus:ring-swiss-teal"
                      checked={selectedRoles.includes(role.value)}
                      onChange={() => toggleRole(role.value)}
                    />
                    <span className="text-gray-700">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                value={status}
                onChange={event => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700">Content Preview</label>
            <textarea
              id="objectives"
              name="objectives"
              value={formData.objectives}
              onChange={handleInputChange}
              rows={3}
              placeholder="Outline the key objectives or provide a brief summary"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
            />
          </div>

          <FileDropZone
            label="Upload File"
            helperText="MP4, PDF, DOCX (Max 50MB)"
            accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.ppt,.pptx"
            maxSizeMB={50}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={() => setSelectedFile(null)}
            disabled={isUploading}
          />

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center rounded-lg bg-swiss-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-swiss-mint disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`mt-6 flex items-center rounded-lg border px-4 py-3 text-sm ${
            uploadStatus.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="mr-2 h-5 w-5" />
            ) : (
              <AlertCircle className="mr-2 h-5 w-5" />
            )}
            <span>{uploadStatus.message}</span>
            <button onClick={() => setUploadStatus({ type: null, message: '' })} className="ml-auto text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
          <p className="text-sm text-gray-500">Track the latest content that has been added to the library.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Format</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {courses.map((course: any) => (
                <tr key={course.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{course.title}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{course.category || '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{course.contentType || contentType}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-swiss-teal/10 px-3 py-1 text-xs font-medium text-swiss-teal">
                      {course.status || 'Draft'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button className="text-swiss-teal hover:text-swiss-mint">View</button>
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Staff Management',
    department: '',
    effectiveDate: '',
    reviewDate: '',
    version: '1.0',
    tags: ''
  })
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['EN'])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['FOUNDATION'])
  const [fileType, setFileType] = useState('PDF')
  const [status, setStatus] = useState('DRAFT')

  const { data: hrDocumentsResponse, isLoading } = useQuery({
    queryKey: ['hrDocuments'],
    queryFn: () => apiService.getHrDocuments(apiClient),
    enabled: !!apiClient,
  })

  const documents: HrDocument[] = hrDocumentsResponse?.data?.data || []

  const languageOptions = ['EN', 'FR', 'DE']

  const accessRoleOptions = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Foundation (Daycare)', value: 'FOUNDATION' },
    { label: 'Educator / Candidate', value: 'EDUCATOR' },
    { label: 'Parent', value: 'PARENT' }
  ]

  const statusOptions = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Archived', value: 'ARCHIVED' }
  ]

  const fileTypeOptions = ['PDF', 'DOCX', 'XLSX']

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(item => item !== lang) : [...prev, lang]
    )
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(item => item !== role) : [...prev, role]
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setSelectedFile(null)
    setFormData({
      title: '',
      description: '',
      category: 'Staff Management',
      department: '',
      effectiveDate: '',
      reviewDate: '',
      version: '1.0',
      tags: ''
    })
    setSelectedLanguages(['EN'])
    setSelectedRoles(['FOUNDATION'])
    setFileType('PDF')
    setStatus('DRAFT')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('department', formData.department)
      uploadFormData.append('effectiveDate', formData.effectiveDate)
      uploadFormData.append('reviewDate', formData.reviewDate)
      uploadFormData.append('version', formData.version)
      uploadFormData.append('tags', selectedRoles.join(',') || formData.tags)
      uploadFormData.append('languages', selectedLanguages.join(','))
      uploadFormData.append('fileType', fileType)
      uploadFormData.append('status', status)

      const response = await apiService.uploadHrDocument(apiClient, uploadFormData)

      if (response.success) {
        setUploadStatus({ type: 'success', message: 'HR procedure uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['hrDocuments'] })
        resetForm()
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-swiss-teal mr-3" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload HR Document</h3>
              <p className="text-sm text-gray-500">Share updated procedures with the right teams and keep everyone aligned.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Document Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter document title"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Staff Management"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="block text-sm font-medium text-gray-700">Language</span>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedLanguages.includes(lang)
                        ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="fileType" className="block text-sm font-medium text-gray-700">File Type</label>
              <select
                id="fileType"
                value={fileType}
                onChange={event => setFileType(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                {fileTypeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="version" className="block text-sm font-medium text-gray-700">Version</label>
              <input
                type="text"
                id="version"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                placeholder="e.g., v1.2"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                value={status}
                onChange={event => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700">Effective Date</label>
              <input
                type="date"
                id="effectiveDate"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700">Review Date</label>
              <input
                type="date"
                id="reviewDate"
                name="reviewDate"
                value={formData.reviewDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description / Content Preview</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Provide a short overview for employees"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
            />
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium text-gray-700">Access Roles</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {accessRoleOptions.map(role => (
                <label key={role.value} className="flex items-center space-x-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-swiss-teal focus:ring-swiss-teal"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <FileDropZone
            label="Upload File"
            helperText="PDF, DOCX (Max 10MB)"
            accept=".pdf,.doc,.docx,.xlsx"
            maxSizeMB={10}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={() => setSelectedFile(null)}
            disabled={isUploading}
          />

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center rounded-lg bg-swiss-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-swiss-mint disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`mt-6 flex items-center rounded-lg border px-4 py-3 text-sm ${
            uploadStatus.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="mr-2 h-5 w-5" />
            ) : (
              <AlertCircle className="mr-2 h-5 w-5" />
            )}
            <span>{uploadStatus.message}</span>
            <button onClick={() => setUploadStatus({ type: null, message: '' })} className="ml-auto text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Existing HR Procedures</h3>
          <p className="text-sm text-gray-500">Review previously uploaded documents and keep them up to date.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Updated</th>
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'STATE_POLICY',
    policyType: '',
    jurisdiction: '',
    effectiveDate: '',
    expirationDate: '',
    version: '1.0',
    referenceNumber: '',
    tags: ''
  })
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['EN'])
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['FOUNDATION'])
  const [status, setStatus] = useState('DRAFT')
  const [criticality, setCriticality] = useState<'NORMAL' | 'ELEVATED'>('NORMAL')
  const [country, setCountry] = useState('Switzerland')

  const { data: policiesResponse, isLoading } = useQuery({
    queryKey: ['statePolicies'],
    queryFn: () => apiService.getStatePolicies(apiClient),
    enabled: !!apiClient,
  })

  const policies = policiesResponse?.data?.data || []

  const languageOptions = ['EN', 'FR', 'DE']

  const accessRoleOptions = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Foundation (Daycare)', value: 'FOUNDATION' },
    { label: 'Educator / Candidate', value: 'EDUCATOR' },
    { label: 'Parent', value: 'PARENT' }
  ]

  const statusOptions = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Archived', value: 'ARCHIVED' }
  ]

  const policyTypeOptions = ['Regulation', 'Guideline', 'Advisory', 'Update']
  const cantonOptions = ['All Cantons', 'Zurich', 'Geneva', 'Vaud', 'Bern']

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(item => item !== lang) : [...prev, lang]
    )
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(item => item !== role) : [...prev, role]
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setSelectedFile(null)
    setFormData({
      title: '',
      description: '',
      category: 'STATE_POLICY',
      policyType: '',
      jurisdiction: '',
      effectiveDate: '',
      expirationDate: '',
      version: '1.0',
      referenceNumber: '',
      tags: ''
    })
    setSelectedLanguages(['EN'])
    setSelectedRoles(['FOUNDATION'])
    setStatus('DRAFT')
    setCriticality('NORMAL')
    setCountry('Switzerland')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('policyType', formData.policyType)
      uploadFormData.append('jurisdiction', formData.jurisdiction)
      uploadFormData.append('effectiveDate', formData.effectiveDate)
      uploadFormData.append('expirationDate', formData.expirationDate)
      uploadFormData.append('version', formData.version)
      uploadFormData.append('referenceNumber', formData.referenceNumber)
      uploadFormData.append('tags', selectedRoles.join(',') || formData.tags)
      uploadFormData.append('languages', selectedLanguages.join(','))
      uploadFormData.append('status', status)
      uploadFormData.append('criticality', criticality)
      uploadFormData.append('country', country)

      const response = await apiService.uploadStatePolicy(apiClient, uploadFormData)

      if (response.success) {
        setUploadStatus({ type: 'success', message: 'State policy uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['statePolicies'] })
        resetForm()
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-swiss-teal mr-3" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Upload State Policy</h3>
              <p className="text-sm text-gray-500">Distribute regulatory updates to the right audience across regions.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter policy title"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Cantonal Policies"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="block text-sm font-medium text-gray-700">Language</span>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedLanguages.includes(lang)
                        ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="policyType" className="block text-sm font-medium text-gray-700">Policy Type *</label>
              <select
                id="policyType"
                name="policyType"
                value={formData.policyType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                <option value="" disabled>Select policy type</option>
                {policyTypeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
              <select
                id="country"
                value={country}
                onChange={event => setCountry(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                <option value="Switzerland">Switzerland</option>
                <option value="Liechtenstein">Liechtenstein</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">Region / Canton</label>
              <select
                id="jurisdiction"
                name="jurisdiction"
                value={formData.jurisdiction}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                {cantonOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700">Effective Date</label>
              <input
                type="date"
                id="effectiveDate"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">Expiration Date</label>
              <input
                type="date"
                id="expirationDate"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Criticality</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCriticality('NORMAL')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    criticality === 'NORMAL'
                      ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setCriticality('ELEVATED')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    criticality === 'ELEVATED'
                      ? 'border-transparent bg-swiss-teal text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-swiss-teal'
                  }`}
                >
                  Elevated
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                value={status}
                onChange={event => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">Link to Official Policy (optional)</label>
              <input
                type="url"
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                placeholder="https://example.gov/policy-doc"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="version" className="block text-sm font-medium text-gray-700">Version</label>
              <input
                type="text"
                id="version"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                placeholder="e.g., v1.0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description / Content Preview</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add notes or an executive summary for this policy"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
            />
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-medium text-gray-700">Access Roles</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {accessRoleOptions.map(role => (
                <label key={role.value} className="flex items-center space-x-3 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-swiss-teal focus:ring-swiss-teal"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <FileDropZone
            label="Upload File"
            helperText="PDF, DOCX (Max 50MB)"
            accept=".pdf,.doc,.docx"
            maxSizeMB={50}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={() => setSelectedFile(null)}
            disabled={isUploading}
          />

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center rounded-lg bg-swiss-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-swiss-mint disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`mt-6 flex items-center rounded-lg border px-4 py-3 text-sm ${
            uploadStatus.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="mr-2 h-5 w-5" />
            ) : (
              <AlertCircle className="mr-2 h-5 w-5" />
            )}
            <span>{uploadStatus.message}</span>
            <button onClick={() => setUploadStatus({ type: null, message: '' })} className="ml-auto text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Existing State Policies</h3>
          <p className="text-sm text-gray-500">Keep track of policy updates shared with your network.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Effective Date</th>
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

// Policy Alerts Management Component
const PolicyAlertsTab: React.FC = () => {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    region: '',
    severity: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    startDate: '',
    endDate: '',
    isActive: true
  })

  // Policy alerts queries
  const { data: policyAlerts, isLoading } = useQuery({
    queryKey: ['policy-alerts'],
    queryFn: () => publicApi.get('/api/policy-alerts'),
  })

  // Create policy alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (alertData: any) => publicApi.post('/api/policy-alerts', alertData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-alerts'] })
      toast.success('Policy alert created successfully')
      setShowCreateForm(false)
      setFormData({
        title: '',
        message: '',
        region: '',
        severity: 'normal',
        startDate: '',
        endDate: '',
        isActive: true
      })
    },
    onError: () => {
      toast.error('Failed to create policy alert')
    }
  })

  // Update policy alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      publicApi.put(`/api/policy-alerts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-alerts'] })
      toast.success('Policy alert updated successfully')
    },
    onError: () => {
      toast.error('Failed to update policy alert')
    }
  })

  // Delete policy alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => publicApi.delete(`/api/policy-alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-alerts'] })
      toast.success('Policy alert deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete policy alert')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createAlertMutation.mutate(formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleToggleActive = (alertId: string, currentStatus: boolean) => {
    updateAlertMutation.mutate({
      id: alertId,
      data: { isActive: !currentStatus }
    })
  }

  const handleDelete = (alertId: string) => {
    if (window.confirm('Are you sure you want to delete this policy alert?')) {
      deleteAlertMutation.mutate(alertId)
    }
  }

  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    normal: 'bg-green-100 text-green-800',
    high: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  }

  const regionOptions = [
    'All Regions',
    'Zurich',
    'Geneva',
    'Vaud',
    'Bern',
    'Basel',
    'Lucerne',
    'St. Gallen',
    'Ticino',
    'Valais',
    'Aargau',
    'Thurgau',
    'Grisons',
    'Neuchâtel',
    'Schwyz',
    'Solothurn',
    'Fribourg',
    'Appenzell Ausserrhoden',
    'Appenzell Innerrhoden',
    'Schaffhausen',
    'Jura',
    'Nidwalden',
    'Obwalden',
    'Glarus',
    'Uri'
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-swiss-teal mr-3" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Policy Alerts Management</h3>
              <p className="text-sm text-gray-500">Create and manage regional policy alerts for your network.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center rounded-lg bg-swiss-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-swiss-mint"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </button>
        </div>

        {/* Create Alert Form */}
        {showCreateForm && (
          <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Alert Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter alert title"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="region" className="block text-sm font-medium text-gray-700">Region *</label>
                <select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
                >
                  <option value="">Select region</option>
                  {regionOptions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">Alert Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={3}
                placeholder="Enter detailed alert message"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severity</label>
                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-swiss-teal focus:ring-2 focus:ring-swiss-teal/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAlertMutation.isPending}
                className="inline-flex items-center rounded-lg bg-swiss-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-swiss-mint disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {createAlertMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Alert
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Policy Alerts List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Policy Alerts</h3>
          <p className="text-sm text-gray-500">Manage regional policy alerts and notifications.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policyAlerts?.data?.map((alert: any) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{alert.message}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {alert.region}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(alert.id, alert.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alert.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {alert.isActive ? (
                        <>
                          <Bell className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <BellOff className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      Delete
                    </button>
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
    },
    {
      name: 'Policy Alerts',
      icon: AlertTriangle,
      component: PolicyAlertsTab,
      description: 'Create and manage regional policy alerts'
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
