import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, Search, User, Building2, Mail } from 'lucide-react'
import { useApiClient, apiService } from '../../services/api'
import { User as UserType } from '../../types/api'
import LoadingSpinner from '../ui/LoadingSpinner'
import { toast } from 'sonner'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onConversationCreated: (conversationId: string) => void
  currentUserId?: string
}

const isDev = import.meta.env.DEV

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search query (400ms delay)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 400)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Reset search when modal closes, trigger initial load when opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setDebouncedSearchQuery('')
      setSelectedUser(null)
    } else {
      // Trigger initial load when modal opens
      setDebouncedSearchQuery('')
    }
  }, [isOpen])

  // Fetch recipients - load initial list on open (empty search), then search when query has 2+ characters
  const shouldFetch = isOpen && !!apiClient && (debouncedSearchQuery.trim().length === 0 || debouncedSearchQuery.trim().length >= 2)
  
  const { data: usersResponse, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['messagingRecipients', debouncedSearchQuery],
    queryFn: async () => {
      if (isDev) {
        console.log('🔍 Fetching recipients for query:', debouncedSearchQuery || '(initial load)')
      }
      
      try {
        // Use the new messaging recipients endpoint for consistency
        const response = await apiClient.get('/messaging/recipients', {
          params: {
            page: 1,
            limit: 50,
            ...(debouncedSearchQuery.trim().length >= 2 && { search: debouncedSearchQuery.trim() }),
          },
        })
        
        if (isDev) {
          // Handle both response structures: direct or wrapped in ApiResponse
          const recipients = response?.data?.recipients || response?.data?.data?.recipients || []
          const recipientCount = recipients.length
          console.log(`✅ GET /messaging/recipients responded with ${recipientCount} recipients`)
        }
        
        return response
      } catch (error: any) {
        if (isDev) {
          console.error('❌ Error fetching recipients:', error)
        }
        throw error
      }
    },
    enabled: shouldFetch,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  })

  const users = useMemo(() => {
    // Backend already filters by role-based access, so we just need to transform the response
    // Handle both response structures: direct or wrapped in ApiResponse
    const recipients = usersResponse?.data?.recipients || usersResponse?.data?.data?.recipients || []
    
    // Transform recipients to UserType format
    return recipients.map((recipient: any) => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      firstName: recipient.name.split(' ')[0] || '',
      lastName: recipient.name.split(' ').slice(1).join(' ') || '',
      role: recipient.role,
      orgName: recipient.organizationName || undefined,
    } as UserType))
  }, [usersResponse])

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!currentUserId) {
        throw new Error('Current user ID is required')
      }
      
      // Check if conversation already exists
      // Handle both response shapes: wrapped ApiResponse or raw array
      const conversationsResponse = await apiService.getConversations(apiClient)
      const existingConversations =
        conversationsResponse?.data?.data || // wrapped ApiResponse
        conversationsResponse?.data ||       // raw array
        []
      
      // Find existing conversation with this participant
      // The backend returns participants with user.id (database User.id)
      const existingConv = existingConversations.find((conv: any) => {
        const participants = conv.participants || []
        const hasParticipant = participants.some(
          (p: any) => {
            // Check both userId (which might be User.id) and user.id
            const participantUserId = p.userId || p.user?.id
            return participantUserId === participantId
          }
        )
        const hasCurrentUser = participants.some(
          (p: any) => {
            const participantUserId = p.userId || p.user?.id
            return participantUserId === currentUserId
          }
        )
        return hasParticipant && hasCurrentUser && participants.length === 2
      })

      if (existingConv) {
        // Return existing conversation in a simpler shape that onSuccess can handle
        // onSuccess will check both response?.data?.data and response?.data
        return { data: existingConv }
      }

      // Create new conversation
      // The backend service accepts: AppUser.id, User.id (database), or Clerk ID
      // We're passing User.id (database ID) which the service will handle
      return apiService.createConversation(apiClient, {
        type: 'DIRECT',
        participantIds: [participantId], // User.id (database ID) - backend will convert
      })
    },
    onSuccess: (response) => {
      // Handle both response shapes: wrapped ApiResponse or raw conversation
      const conversation =
        response?.data?.data || // wrapped ApiResponse
        response?.data          // raw conversation
      
      const conversationId = conversation?.id
      
      if (!conversationId) {
        if (import.meta.env.DEV) {
          console.warn('[NewConversationModal] Missing conversation id from createConversation response', response)
        }
        toast.error(t('admin:messaging.newConversation.error', 'Failed to start conversation'))
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success(t('admin:messaging.newConversation.success', 'Conversation started!'))
      onConversationCreated(conversationId)
      onClose()
      setSearchQuery('')
      setSelectedUser(null)
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 
        t('admin:messaging.newConversation.error', 'Failed to start conversation')
      toast.error(errorMessage)
    },
  })

  const handleStartConversation = () => {
    if (!selectedUser) return
    createConversationMutation.mutate(selectedUser.id)
  }

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin:messaging.newConversation.title', 'New Conversation')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            disabled={createConversationMutation.isPending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:messaging.newConversation.searchPlaceholder', 'Search users by name or email...')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Trigger search on Enter if query is valid
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    setDebouncedSearchQuery(searchQuery.trim())
                  }
                }}
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-4">
            {usersError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm font-medium text-red-600 mb-1">
                  {t('admin:messaging.newConversation.error', 'Failed to load users')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('admin:messaging.newConversation.tryAgain', 'Please try again')}
                </p>
              </div>
            ) : isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {searchQuery.trim().length > 0
                    ? t('admin:messaging.newConversation.noUsersFound', 'No users found')
                    : t('admin:messaging.newConversation.noUsersAvailable', 'No users available')
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {searchQuery.trim().length >= 2
                    ? t('admin:messaging.newConversation.tryDifferentSearch', 'Try a different search term')
                    : searchQuery.trim().length > 0
                    ? t('admin:messaging.newConversation.typeAtLeast', 'Type at least 2 characters to search')
                    : ''
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user: UserType) => {
                  const isSelected = selectedUser?.id === user.id
                  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-swiss-teal bg-swiss-teal/5'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-swiss-teal rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {fullName}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.orgName && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Building2 className="h-3 w-3 mr-1" />
                              <span className="truncate">{user.orgName}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {user.role}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-2 flex-shrink-0">
                            <div className="w-5 h-5 bg-swiss-teal rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={createConversationMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            onClick={handleStartConversation}
            disabled={!selectedUser || createConversationMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-swiss-mint hover:bg-swiss-teal rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createConversationMutation.isPending
              ? t('admin:messaging.newConversation.starting', 'Starting...')
              : t('admin:messaging.newConversation.start', 'Start Conversation')
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewConversationModal

