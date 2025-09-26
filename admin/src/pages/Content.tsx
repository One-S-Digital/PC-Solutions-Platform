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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficultyLevel: 'beginner',
    estimatedDuration: '60',
    category: '',
    tags: '',
    objectives: ''
  })

  const { data: coursesResponse, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiService.getCourses(apiClient),
    enabled: !!apiClient,
  })

  const courses = coursesResponse?.data?.data || []

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
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
      uploadFormData.append('tags', formData.tags)
      uploadFormData.append('objectives', formData.objectives)

      const response = await apiService.uploadCourseContent(apiClient, uploadFormData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'E-learning content uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        // Reset form
        setSelectedFile(null)
        setFormData({
          title: '',
          description: '',
          difficultyLevel: 'beginner',
          estimatedDuration: '60',
          category: '',
          tags: '',
          objectives: ''
        })
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
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <BookOpen className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload E-learning Content</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Course Content File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-swiss-teal transition-colors">
              {selectedFile ? (
                <div className="space-y-2">
                  <File className="h-12 w-12 text-swiss-teal mx-auto" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer">
                      <span className="font-medium text-swiss-teal hover:text-swiss-mint">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.ppt,.pptx"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                    </label>
                    <p className="text-gray-500">or drag and drop</p>
                    <p className="text-xs text-gray-400">PDF, DOC, DOCX, MP4, AVI, MOV, PPT, PPTX (max 100MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Course Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="Enter course title"
              />
            </div>

            <div>
              <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level *
              </label>
              <select
                id="difficultyLevel"
                name="difficultyLevel"
                value={formData.difficultyLevel}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes) *
              </label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="60"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="e.g., Child Development, Safety"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Course Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Describe what this course covers and what learners will gain"
            />
          </div>

          <div>
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-2">
              Learning Objectives
            </label>
            <textarea
              id="objectives"
              name="objectives"
              value={formData.objectives}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="List the key learning objectives (one per line)"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Enter tags separated by commas"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="bg-swiss-teal hover:bg-swiss-mint disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Course
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg mt-4 ${
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'HR_PROCEDURE',
    department: '',
    effectiveDate: '',
    reviewDate: '',
    version: '1.0',
    tags: ''
  })

  const { data: hrDocumentsResponse, isLoading } = useQuery({
    queryKey: ['hrDocuments'],
    queryFn: () => apiService.getHrDocuments(apiClient),
    enabled: !!apiClient,
  })

  const documents: HrDocument[] = hrDocumentsResponse?.data?.data || []

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
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
      uploadFormData.append('category', formData.category)
      uploadFormData.append('department', formData.department)
      uploadFormData.append('effectiveDate', formData.effectiveDate)
      uploadFormData.append('reviewDate', formData.reviewDate)
      uploadFormData.append('version', formData.version)
      uploadFormData.append('tags', formData.tags)

      const response = await apiService.uploadHrDocument(apiClient, uploadFormData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'HR procedure uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['hrDocuments'] })
        // Reset form
        setSelectedFile(null)
        setFormData({
          title: '',
          description: '',
          category: 'HR_PROCEDURE',
          department: '',
          effectiveDate: '',
          reviewDate: '',
          version: '1.0',
          tags: ''
        })
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
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Users className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload HR Procedures</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              HR Document File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-swiss-teal transition-colors">
              {selectedFile ? (
                <div className="space-y-2">
                  <File className="h-12 w-12 text-swiss-teal mx-auto" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer">
                      <span className="font-medium text-swiss-teal hover:text-swiss-mint">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                    </label>
                    <p className="text-gray-500">or drag and drop</p>
                    <p className="text-xs text-gray-400">PDF, DOC, DOCX (max 50MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Document Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Document Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="Enter document title"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              >
                <option value="HR_PROCEDURE">HR Procedure</option>
                <option value="POLICY">Policy</option>
                <option value="GUIDELINE">Guideline</option>
                <option value="FORM">Form</option>
                <option value="TEMPLATE">Template</option>
              </select>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="e.g., Human Resources, Operations"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
                Version
              </label>
              <input
                type="text"
                id="version"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="1.0"
              />
            </div>

            <div>
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date
              </label>
              <input
                type="date"
                id="effectiveDate"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700 mb-2">
                Review Date
              </label>
              <input
                type="date"
                id="reviewDate"
                name="reviewDate"
                value={formData.reviewDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Describe the purpose and scope of this HR document"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Enter tags separated by commas"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="bg-swiss-teal hover:bg-swiss-mint disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg mt-4 ${
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

  const { data: policiesResponse, isLoading } = useQuery({
    queryKey: ['statePolicies'],
    queryFn: () => apiService.getStatePolicies(apiClient),
    enabled: !!apiClient,
  })

  const policies = policiesResponse?.data?.data || []

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
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
      uploadFormData.append('category', formData.category)
      uploadFormData.append('policyType', formData.policyType)
      uploadFormData.append('jurisdiction', formData.jurisdiction)
      uploadFormData.append('effectiveDate', formData.effectiveDate)
      uploadFormData.append('expirationDate', formData.expirationDate)
      uploadFormData.append('version', formData.version)
      uploadFormData.append('referenceNumber', formData.referenceNumber)
      uploadFormData.append('tags', formData.tags)

      const response = await apiService.uploadStatePolicy(apiClient, uploadFormData)
      
      if (response.success) {
        setUploadStatus({ type: 'success', message: 'State policy uploaded successfully!' })
        queryClient.invalidateQueries({ queryKey: ['statePolicies'] })
        // Reset form
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
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-swiss-teal mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Upload State Policy Updates</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Policy Document File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-swiss-teal transition-colors">
              {selectedFile ? (
                <div className="space-y-2">
                  <File className="h-12 w-12 text-swiss-teal mx-auto" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer">
                      <span className="font-medium text-swiss-teal hover:text-swiss-mint">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                    </label>
                    <p className="text-gray-500">or drag and drop</p>
                    <p className="text-xs text-gray-400">PDF, DOC, DOCX (max 50MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policy Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Policy Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="Enter policy title"
              />
            </div>

            <div>
              <label htmlFor="policyType" className="block text-sm font-medium text-gray-700 mb-2">
                Policy Type *
              </label>
              <select
                id="policyType"
                name="policyType"
                value={formData.policyType}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              >
                <option value="">Select policy type</option>
                <option value="CHILD_SAFETY">Child Safety</option>
                <option value="HEALTH_REGULATIONS">Health Regulations</option>
                <option value="EDUCATION_STANDARDS">Education Standards</option>
                <option value="STAFF_QUALIFICATIONS">Staff Qualifications</option>
                <option value="FACILITY_REQUIREMENTS">Facility Requirements</option>
                <option value="LICENSING">Licensing</option>
                <option value="COMPLIANCE">Compliance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700 mb-2">
                Jurisdiction *
              </label>
              <input
                type="text"
                id="jurisdiction"
                name="jurisdiction"
                value={formData.jurisdiction}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="e.g., State of California, Federal"
              />
            </div>

            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="e.g., CA-2024-001"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
                Version
              </label>
              <input
                type="text"
                id="version"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                placeholder="1.0"
              />
            </div>

            <div>
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date *
              </label>
              <input
                type="date"
                id="effectiveDate"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                id="expirationDate"
                name="expirationDate"
                value={formData.expirationDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Policy Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Describe the policy requirements, scope, and impact on childcare operations"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
              placeholder="Enter tags separated by commas"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="bg-swiss-teal hover:bg-swiss-mint disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Policy
                </>
              )}
            </button>
          </div>
        </form>

        {uploadStatus.type && (
          <div className={`flex items-center p-3 rounded-lg mt-4 ${
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
