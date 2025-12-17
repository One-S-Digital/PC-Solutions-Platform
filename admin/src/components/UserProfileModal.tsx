import React, { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { 
  X, 
  User as UserIcon,
  Building2, 
  Mail, 
  Phone,
  MapPin,
  Globe,
  FileText,
  ShoppingBag,
  Wrench,
  MessageSquare,
  ExternalLink,
  Download,
  Calendar,
  Tag,
  Star,
  Clock,
  Loader2,
  AlertCircle,
  Send,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { useTranslation } from 'react-i18next'
import { User, Organization, Product, Service, OrganizationDocument } from '../types/api'
import { UserRole } from '../types'
import Card from './design-system/Card'
import Button from './design-system/Button'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import logger from '../utils/logger'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

// Helper function to get document type icon
const getDocumentTypeIcon = (type: string) => {
  switch (type) {
    case 'CATALOG':
      return <BookOpen className="h-4 w-4 text-blue-500" />
    case 'PRICELIST':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />
    case 'BROCHURE':
      return <FileText className="h-4 w-4 text-purple-500" />
    case 'CERTIFICATION':
      return <Star className="h-4 w-4 text-yellow-500" />
    default:
      return <FileText className="h-4 w-4 text-gray-500" />
  }
}

// Helper function to format file size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState(0)
  const [messageContent, setMessageContent] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  const isSupplier = user?.role === UserRole.PRODUCT_SUPPLIER
  const isServiceProvider = user?.role === UserRole.SERVICE_PROVIDER
  const hasOrganization = !!user?.orgId
  
  // Fetch organization details
  const { data: orgResponse, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization', user?.orgId],
    queryFn: () => apiService.getOrganizationById(apiClient, user!.orgId!),
    enabled: isOpen && hasOrganization,
  })
  
  const organization = orgResponse?.data?.data
  
  // Fetch organization documents
  const { data: docsResponse, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['organization-documents', user?.orgId],
    queryFn: () => apiService.getOrganizationDocuments(apiClient, user!.orgId!),
    enabled: isOpen && hasOrganization && (isSupplier || isServiceProvider),
  })
  
  const documents = docsResponse?.data?.data || []
  
  // Fetch products for suppliers
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['supplier-products', user?.orgId],
    queryFn: () => apiService.getProductsBySupplier(apiClient, user!.orgId!),
    enabled: isOpen && hasOrganization && isSupplier,
  })
  
  const products = productsResponse?.data?.data || []
  
  // Fetch services for service providers
  const { data: servicesResponse, isLoading: isLoadingServices } = useQuery({
    queryKey: ['provider-services', user?.orgId],
    queryFn: () => apiService.getServicesByProvider(apiClient, user!.orgId!),
    enabled: isOpen && hasOrganization && isServiceProvider,
  })
  
  const services = servicesResponse?.data?.data || []
  
  // Create conversation mutation for messaging
  const createConversationMutation = useMutation({
    mutationFn: async (content: string) => {
      // First try to create or find a conversation with the user
      const conversationData = {
        participantId: user!.id,
        participantName: user!.name || user!.email || 'Unknown',
        participantType: user!.role,
        organizationName: organization?.name,
      }
      const convResponse = await apiService.createConversation(apiClient, conversationData)
      const conversationId = convResponse.data?.data?.id
      
      if (conversationId) {
        // Send the message
        await apiService.sendMessage(apiClient, { conversationId, content })
      }
      return convResponse
    },
    onSuccess: () => {
      setMessageContent('')
      setIsSendingMessage(false)
      logger.log('Message sent successfully')
      // Show success indication
    },
    onError: (error) => {
      logger.error('Failed to send message:', error)
      setIsSendingMessage(false)
    }
  })
  
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !user) return
    setIsSendingMessage(true)
    try {
      await createConversationMutation.mutateAsync(messageContent)
    } catch (error) {
      // Error handled in mutation
    }
  }
  
  const handleOpenDocument = (doc: OrganizationDocument) => {
    const url = doc.publicUrl || doc.asset?.publicUrl
    if (url) {
      window.open(url, '_blank')
    }
  }
  
  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.type || 'OTHER'
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {} as Record<string, OrganizationDocument[]>)
  
  // Filter specific document types
  const catalogs = documentsByType['CATALOG'] || []
  const pricelists = documentsByType['PRICELIST'] || []
  const otherDocuments = [...(documentsByType['BROCHURE'] || []), ...(documentsByType['CERTIFICATION'] || []), ...(documentsByType['OTHER'] || [])]
  
  if (!user) return null
  
  const roleColors: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-800',
    [UserRole.ADMIN]: 'bg-orange-100 text-orange-800',
    [UserRole.FOUNDATION]: 'bg-swiss-teal/10 text-swiss-teal',
    [UserRole.PRODUCT_SUPPLIER]: 'bg-swiss-mint/10 text-swiss-mint',
    [UserRole.SERVICE_PROVIDER]: 'bg-blue-100 text-blue-700',
    [UserRole.EDUCATOR]: 'bg-indigo-100 text-indigo-800',
    [UserRole.PARENT]: 'bg-swiss-coral/10 text-swiss-coral',
  }
  
  const tabs = [
    { id: 'overview', label: t('admin:users.profile.tabs.overview', 'Overview'), icon: UserIcon },
    ...(isSupplier || isServiceProvider ? [
      { id: 'documents', label: t('admin:users.profile.tabs.documents', 'Documents'), icon: FileText },
    ] : []),
    ...(isSupplier ? [
      { id: 'catalog', label: t('admin:users.profile.tabs.catalog', 'Catalog & Products'), icon: ShoppingBag },
    ] : []),
    ...(isServiceProvider ? [
      { id: 'services', label: t('admin:users.profile.tabs.services', 'Services'), icon: Wrench },
    ] : []),
    { id: 'message', label: t('admin:users.profile.tabs.message', 'Message'), icon: MessageSquare },
  ]
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl bg-white shadow-xl rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-swiss-teal to-swiss-teal/80">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white/50">
                      {user.avatarUrl || user.imageUrl ? (
                        <img 
                          src={user.avatarUrl || user.imageUrl} 
                          alt={user.name || 'User'} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-swiss-teal font-bold text-2xl">
                          {(user.name || user.email || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-white">
                        {user.name || t('admin:users.labels.unknown', 'Unknown User')}
                      </Dialog.Title>
                      <p className="text-white/80 text-sm">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {user.role}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
                  <Tab.List className="flex space-x-1 border-b border-gray-200 px-6 bg-gray-50">
                    {tabs.map((tab) => (
                      <Tab
                        key={tab.id}
                        className={({ selected }) =>
                          `flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors outline-none ${
                            selected
                              ? 'border-swiss-teal text-swiss-teal'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`
                        }
                      >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </Tab>
                    ))}
                  </Tab.List>

                  <Tab.Panels className="flex-1 overflow-y-auto p-6">
                    {/* Overview Tab */}
                    <Tab.Panel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Info */}
                        <Card className="p-5">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <UserIcon className="h-5 w-5 mr-2 text-swiss-teal" />
                            {t('admin:users.profile.userInfo', 'User Information')}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-start">
                              <Mail className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">{t('common:email', 'Email')}</p>
                                <p className="text-sm text-gray-900">{user.email || '-'}</p>
                              </div>
                            </div>
                            {(user.firstName || user.lastName) && (
                              <div className="flex items-start">
                                <UserIcon className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-500">{t('common:fullName', 'Full Name')}</p>
                                  <p className="text-sm text-gray-900">
                                    {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                                  </p>
                                </div>
                              </div>
                            )}
                            {user.region && (
                              <div className="flex items-start">
                                <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-500">{t('common:region', 'Region')}</p>
                                  <p className="text-sm text-gray-900">{user.region}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start">
                              <Calendar className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-500">{t('admin:users.profile.memberSince', 'Member Since')}</p>
                                <p className="text-sm text-gray-900">
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {user.lastLogin && (
                              <div className="flex items-start">
                                <Clock className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-500">{t('admin:users.profile.lastLogin', 'Last Login')}</p>
                                  <p className="text-sm text-gray-900">
                                    {new Date(user.lastLogin).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>

                        {/* Organization Info */}
                        <Card className="p-5">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Building2 className="h-5 w-5 mr-2 text-swiss-teal" />
                            {t('admin:users.profile.organization', 'Organization')}
                          </h3>
                          {isLoadingOrg ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-swiss-teal" />
                            </div>
                          ) : organization ? (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 mb-4">
                                {organization.logoUrl ? (
                                  <img 
                                    src={organization.logoUrl} 
                                    alt={organization.name} 
                                    className="h-12 w-12 rounded-lg object-contain bg-gray-50 border"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-swiss-teal/10 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-swiss-teal" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-gray-900">{organization.name}</p>
                                  <p className="text-xs text-gray-500">{organization.type}</p>
                                </div>
                              </div>
                              {organization.description && (
                                <p className="text-sm text-gray-600 line-clamp-3">{organization.description}</p>
                              )}
                              {organization.region && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                  {organization.region}
                                </div>
                              )}
                              {organization.website && (
                                <a 
                                  href={organization.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-swiss-teal hover:underline"
                                >
                                  <Globe className="h-4 w-4 mr-2" />
                                  {t('admin:users.profile.visitWebsite', 'Visit Website')}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              )}
                              {organization.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                  {organization.phone}
                                </div>
                              )}
                              {organization.tags && organization.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {organization.tags.slice(0, 5).map((tag) => (
                                    <span key={tag} className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">{t('admin:users.profile.noOrganization', 'No organization associated')}</p>
                            </div>
                          )}
                        </Card>
                      </div>
                    </Tab.Panel>

                    {/* Documents Tab - Only for Suppliers/Service Providers */}
                    {(isSupplier || isServiceProvider) && (
                      <Tab.Panel>
                        <div className="space-y-6">
                          {isLoadingDocs ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-swiss-teal" />
                            </div>
                          ) : documents.length > 0 ? (
                            <>
                              {/* Catalogs Section */}
                              {catalogs.length > 0 && (
                                <Card className="p-5">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                                    {t('admin:users.profile.catalogs', 'Catalogs')}
                                  </h3>
                                  <div className="space-y-2">
                                    {catalogs.map((doc) => (
                                      <div 
                                        key={doc.id} 
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center">
                                          {getDocumentTypeIcon(doc.type)}
                                          <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                                            <p className="text-xs text-gray-500">
                                              {formatFileSize(doc.size || doc.asset?.size)} • {doc.filename || doc.asset?.filename}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDocument(doc)}
                                          leftIcon={ExternalLink}
                                        >
                                          {t('common:view', 'View')}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </Card>
                              )}

                              {/* Pricelists Section */}
                              {pricelists.length > 0 && (
                                <Card className="p-5">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <FileSpreadsheet className="h-5 w-5 mr-2 text-green-500" />
                                    {t('admin:users.profile.pricelists', 'Price Lists')}
                                  </h3>
                                  <div className="space-y-2">
                                    {pricelists.map((doc) => (
                                      <div 
                                        key={doc.id} 
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center">
                                          {getDocumentTypeIcon(doc.type)}
                                          <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                                            <p className="text-xs text-gray-500">
                                              {formatFileSize(doc.size || doc.asset?.size)} • {doc.filename || doc.asset?.filename}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDocument(doc)}
                                          leftIcon={ExternalLink}
                                        >
                                          {t('common:view', 'View')}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </Card>
                              )}

                              {/* Other Documents Section */}
                              {otherDocuments.length > 0 && (
                                <Card className="p-5">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <FileText className="h-5 w-5 mr-2 text-gray-500" />
                                    {t('admin:users.profile.otherDocuments', 'Other Documents')}
                                  </h3>
                                  <div className="space-y-2">
                                    {otherDocuments.map((doc) => (
                                      <div 
                                        key={doc.id} 
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center">
                                          {getDocumentTypeIcon(doc.type)}
                                          <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                                            <p className="text-xs text-gray-500">
                                              {doc.type} • {formatFileSize(doc.size || doc.asset?.size)}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDocument(doc)}
                                          leftIcon={ExternalLink}
                                        >
                                          {t('common:view', 'View')}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </Card>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-12">
                              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500">{t('admin:users.profile.noDocuments', 'No documents uploaded')}</p>
                            </div>
                          )}
                        </div>
                      </Tab.Panel>
                    )}

                    {/* Catalog & Products Tab - Only for Suppliers */}
                    {isSupplier && (
                      <Tab.Panel>
                        <div className="space-y-6">
                          {isLoadingProducts ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-swiss-teal" />
                            </div>
                          ) : products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {products.map((product) => (
                                <Card key={product.id} className="p-4">
                                  <div className="flex items-start space-x-3">
                                    {product.imageUrl ? (
                                      <img 
                                        src={product.imageUrl} 
                                        alt={product.title} 
                                        className="h-16 w-16 rounded-lg object-cover bg-gray-100"
                                      />
                                    ) : (
                                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-gray-900 truncate">{product.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{product.description}</p>
                                      {product.price && (
                                        <p className="text-sm font-semibold text-swiss-teal mt-2">
                                          CHF {product.price.toFixed(2)}
                                        </p>
                                      )}
                                      {product.stockStatus && (
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                                          product.stockStatus === 'In Stock' ? 'bg-green-100 text-green-700' :
                                          product.stockStatus === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          {product.stockStatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500">{t('admin:users.profile.noProducts', 'No products listed')}</p>
                            </div>
                          )}
                        </div>
                      </Tab.Panel>
                    )}

                    {/* Services Tab - Only for Service Providers */}
                    {isServiceProvider && (
                      <Tab.Panel>
                        <div className="space-y-6">
                          {isLoadingServices ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-swiss-teal" />
                            </div>
                          ) : services.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {services.map((service) => (
                                <Card key={service.id} className="p-4">
                                  <div className="flex items-start space-x-3">
                                    {service.imageUrl ? (
                                      <img 
                                        src={service.imageUrl} 
                                        alt={service.title} 
                                        className="h-16 w-16 rounded-lg object-cover bg-gray-100"
                                      />
                                    ) : (
                                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Wrench className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-gray-900 truncate">{service.title}</h4>
                                      <p className="text-xs text-gray-500 mt-1">{service.category}</p>
                                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{service.description}</p>
                                      {service.priceInfo && (
                                        <p className="text-sm font-semibold text-swiss-teal mt-2">
                                          {service.priceInfo}
                                        </p>
                                      )}
                                      {service.deliveryType && (
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                          {service.deliveryType}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500">{t('admin:users.profile.noServices', 'No services listed')}</p>
                            </div>
                          )}
                        </div>
                      </Tab.Panel>
                    )}

                    {/* Message Tab */}
                    <Tab.Panel>
                      <Card className="p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <MessageSquare className="h-5 w-5 mr-2 text-swiss-teal" />
                          {t('admin:users.profile.sendMessage', 'Send Message')}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              {t('admin:users.profile.messageTo', 'Sending message to:')} <span className="font-medium">{user.name || user.email}</span>
                            </p>
                            {organization && (
                              <p className="text-xs text-gray-500">
                                {t('admin:users.profile.organization', 'Organization')}: {organization.name}
                              </p>
                            )}
                          </div>
                          <textarea
                            className={`${STANDARD_INPUT_FIELD} min-h-[120px]`}
                            placeholder={t('admin:users.profile.messagePlaceholder', 'Type your message here...')}
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            rows={5}
                          />
                          <div className="flex justify-end">
                            <Button
                              variant="primary"
                              leftIcon={isSendingMessage ? Loader2 : Send}
                              onClick={handleSendMessage}
                              disabled={!messageContent.trim() || isSendingMessage}
                              className={isSendingMessage ? 'animate-pulse' : ''}
                            >
                              {isSendingMessage 
                                ? t('admin:users.profile.sending', 'Sending...') 
                                : t('admin:users.profile.sendMessageButton', 'Send Message')}
                            </Button>
                          </div>
                          {createConversationMutation.isSuccess && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              {t('admin:users.profile.messageSent', 'Message sent successfully!')}
                            </div>
                          )}
                          {createConversationMutation.isError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              {t('admin:users.profile.messageFailed', 'Failed to send message. Please try again.')}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default UserProfileModal
