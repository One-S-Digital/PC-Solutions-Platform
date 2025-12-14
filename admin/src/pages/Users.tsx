import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  ShieldCheck,
  Building2,
  X,
  AlertTriangle,
  UserCog
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { useTranslation } from 'react-i18next';

import logger from '../utils/logger'

import { User } from '../types/api'
import { UserRole, UserStatus } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

// Edit User Modal Component
interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSave: (user: User) => Promise<void>
  isLoading: boolean
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave, isLoading }) => {
  const [formData, setFormData] = useState<Partial<User>>({})
  const { t } = useTranslation(['common', 'admin']);
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        status: user.status,
      })
      setError(null)
    }
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.email) {
      setError(t('admin:users.editUser.emailRequired', 'Email is required'))
      return
    }
    
    try {
      // Only send fields that are allowed by the UpdateUserDto
      // The DTO whitelist allows: email, firstName, lastName, role, orgId, phoneNumber, address, avatarUrl, status
      const updatePayload = {
        id: user!.id, // needed for the mutation to identify the user
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        status: formData.status,
      } as User
      await onSave(updatePayload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:users.editUser.updateFailed', 'Failed to update user'))
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('admin:users.editUser.title', 'Edit User')}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:users.editUser.firstName', 'First Name')}</label>
                <input
                  type="text"
                  className={STANDARD_INPUT_FIELD}
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder={t('common:placeholders.firstname')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:users.editUser.lastName', 'Last Name')}</label>
                <input
                  type="text"
                  className={STANDARD_INPUT_FIELD}
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder={t('common:placeholders.lastname')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:users.editUser.email', 'Email')} <span className="text-red-500">*</span></label>
              <input
                type="email"
                className={STANDARD_INPUT_FIELD}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('common:placeholders.emailaddress')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:users.editUser.role', 'Role')}</label>
              <select
                className={STANDARD_INPUT_FIELD}
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value={UserRole.SUPER_ADMIN}>{t('common:superadmin')}</option>
                <option value={UserRole.ADMIN}>{t('common:admin')}</option>
                <option value={UserRole.FOUNDATION}>{t('common:foundation')}</option>
                <option value={UserRole.PRODUCT_SUPPLIER}>{t('common:productsupplier')}</option>
                <option value={UserRole.SERVICE_PROVIDER}>{t('common:serviceprovider')}</option>
                <option value={UserRole.EDUCATOR}>{t('common:educator')}</option>
                <option value={UserRole.PARENT}>{t('common:parent')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:users.editUser.status', 'Status')}</label>
              <select
                className={STANDARD_INPUT_FIELD}
                value={formData.status || UserStatus.ACTIVE}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              >
                <option value={UserStatus.ACTIVE}>{t('common:active')}</option>
                <option value={UserStatus.PENDING}>{t('common:pending')}</option>
                <option value={UserStatus.INACTIVE}>{t('common:inactive')}</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-swiss-teal border border-transparent rounded-md shadow-sm hover:bg-swiss-teal/90 disabled:opacity-50"
            >
              {isLoading ? t('admin:users.editUser.saving', 'Saving...') : t('admin:users.editUser.saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onConfirm: () => Promise<void>
  isLoading: boolean
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, user, onConfirm, isLoading }) => {
  const { t } = useTranslation(['common', 'admin']);
  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin:users.deleteUser.title', 'Delete User')}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {t('admin:users.deleteUser.confirmation', 'Are you sure you want to delete')} <span className="font-medium">{user.name || user.email}</span>? 
              {t('admin:users.deleteUser.warning', ' This action cannot be undone and will permanently remove all associated data.')}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common:cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? t('admin:users.deleteUser.deleting', 'Deleting...') : t('admin:users.deleteUser.delete', 'Delete User')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Elevate to Admin Modal Component
interface ElevateToAdminModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onConfirm: (targetRole: 'ADMIN' | 'SUPER_ADMIN', reason: string) => Promise<void>
  isLoading: boolean
}

const ElevateToAdminModal: React.FC<ElevateToAdminModalProps> = ({ isOpen, onClose, user, onConfirm, isLoading }) => {
  const { t } = useTranslation(['common', 'admin']);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedRole('ADMIN')
      setReason('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!reason.trim()) {
      setError(t('admin:users.elevateUser.reasonRequired', 'Please provide a reason for this role elevation'))
      return
    }
    
    try {
      await onConfirm(selectedRole, reason)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:users.elevateUser.failed', 'Failed to elevate user'))
    }
  }

  if (!isOpen || !user) return null

  // Check if user is already an admin
  const isAlreadyAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-red-500">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2" />
            {t('admin:users.elevateUser.title', 'Elevate to Admin')}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {isAlreadyAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
                <strong>{t('admin:users.elevateUser.alreadyAdmin', 'Note:')}</strong> {t('admin:users.elevateUser.alreadyAdminMessage', 'This user already has an admin role. You can change their role level below.')}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-swiss-teal flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name || t('admin:users.labels.unknown', 'Unknown')}</p>
                  <p className="text-sm text-gray-500">{user.email || t('admin:users.labels.noEmail', 'No email')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('admin:users.elevateUser.currentRole', 'Current role:')} <span className="font-medium">{user.role}</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:users.elevateUser.selectRole', 'Select Admin Role')}
              </label>
              <div className="space-y-2">
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedRole === 'ADMIN' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="targetRole"
                    value="ADMIN"
                    checked={selectedRole === 'ADMIN'}
                    onChange={() => setSelectedRole('ADMIN')}
                    className="sr-only"
                  />
                  <Shield className={`w-5 h-5 mr-3 ${selectedRole === 'ADMIN' ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${selectedRole === 'ADMIN' ? 'text-orange-700' : 'text-gray-700'}`}>
                      {t('common:admin', 'Admin')}
                    </p>
                    <p className="text-xs text-gray-500">{t('admin:users.elevateUser.adminDescription', 'Can manage users, content, and organizations')}</p>
                  </div>
                </label>
                
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedRole === 'SUPER_ADMIN' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="targetRole"
                    value="SUPER_ADMIN"
                    checked={selectedRole === 'SUPER_ADMIN'}
                    onChange={() => setSelectedRole('SUPER_ADMIN')}
                    className="sr-only"
                  />
                  <ShieldCheck className={`w-5 h-5 mr-3 ${selectedRole === 'SUPER_ADMIN' ? 'text-red-500' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${selectedRole === 'SUPER_ADMIN' ? 'text-red-700' : 'text-gray-700'}`}>
                      {t('common:superadmin', 'Super Admin')}
                    </p>
                    <p className="text-xs text-gray-500">{t('admin:users.elevateUser.superAdminDescription', 'Full system access including role management')}</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:users.elevateUser.reason', 'Reason for Elevation')} <span className="text-red-500">*</span>
              </label>
              <textarea
                className={STANDARD_INPUT_FIELD}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin:users.elevateUser.reasonPlaceholder', 'Explain why this user needs admin privileges...')}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('admin:users.elevateUser.reasonHint', 'This reason will be recorded in the audit log.')}
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm disabled:opacity-50 ${
                selectedRole === 'SUPER_ADMIN' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {isLoading 
                ? t('admin:users.elevateUser.elevating', 'Elevating...') 
                : t('admin:users.elevateUser.confirm', 'Elevate User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const Users: React.FC = () => {
  const { t } = useTranslation(['common', 'admin']);
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isElevateModalOpen, setIsElevateModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  // Fetch current user to check if they are super admin
  const { data: currentUserResponse } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiService.getCurrentUser(apiClient),
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
  })

  const currentUser = currentUserResponse?.data?.data
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(apiClient),
    enabled: !!apiClient,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (updatedUser: User) => apiService.updateUser(apiClient, updatedUser.id, updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditModalOpen(false)
      setSelectedUser(null)
      logger.log('User updated successfully')
    },
    onError: (error) => {
      logger.error('Failed to update user:', error)
      // Don't rethrow - let mutateAsync handle the rejection in the modal's try/catch
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiService.deleteUser(apiClient, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDeleteModalOpen(false)
      setSelectedUser(null)
      logger.log('User deleted successfully')
    },
    onError: (error) => {
      logger.error('Failed to delete user:', error)
      // Don't rethrow - let mutateAsync handle the rejection in the modal's try/catch
    },
  })

  // Elevate user to admin mutation
  const elevateUserMutation = useMutation({
    mutationFn: ({ userId, targetRole, reason }: { userId: string; targetRole: 'ADMIN' | 'SUPER_ADMIN'; reason: string }) => 
      apiService.elevateUserToAdmin(apiClient, userId, targetRole, reason),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsElevateModalOpen(false)
      setSelectedUser(null)
      logger.log('User elevated to admin successfully:', response.data)
    },
    onError: (error) => {
      logger.error('Failed to elevate user:', error)
      // Don't rethrow - let mutateAsync handle the rejection in the modal's try/catch
    },
  })

  const users: User[] = usersResponse?.data?.data || []

  const roleColors: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-800',
    [UserRole.ADMIN]: 'bg-orange-100 text-orange-800',
    [UserRole.FOUNDATION]: 'bg-swiss-teal/10 text-swiss-teal',
    [UserRole.PRODUCT_SUPPLIER]: 'bg-swiss-mint/10 text-swiss-mint',
    [UserRole.SERVICE_PROVIDER]: 'bg-swiss-sand/20 text-swiss-sand',
    [UserRole.EDUCATOR]: 'bg-indigo-100 text-indigo-800',
    [UserRole.PARENT]: 'bg-swiss-coral/10 text-swiss-coral',
  }

  const filteredUsers = users.filter((user) => {
    const userName = user.name || ''
    const userEmail = user.email || ''
    const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !selectedRole || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  // Handle opening edit modal
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  // Handle opening delete modal
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  // Handle opening elevate modal
  const handleElevateClick = (user: User) => {
    setSelectedUser(user)
    setIsElevateModalOpen(true)
  }

  // Handle saving user updates
  const handleUpdateUser = async (updatedUser: User) => {
    await updateUserMutation.mutateAsync(updatedUser)
  }

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (selectedUser) {
      await deleteUserMutation.mutateAsync(selectedUser.id)
    }
  }

  // Handle confirming elevation
  const handleConfirmElevate = async (targetRole: 'ADMIN' | 'SUPER_ADMIN', reason: string) => {
    if (selectedUser) {
      await elevateUserMutation.mutateAsync({ 
        userId: selectedUser.id, 
        targetRole, 
        reason 
      })
    }
  }

  // Handle closing modals
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setSelectedUser(null)
  }

  const handleCloseElevateModal = () => {
    setIsElevateModalOpen(false)
    setSelectedUser(null)
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{t('admin:users.error.loadFailed', 'Failed to load users')}</div>
        <p className="text-gray-600">{t('admin:users.error.description', 'Please check your connection and try again.')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <UsersIcon className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:users.title', 'Users Management')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:users.subtitle', 'Manage all users across the platform')} ({users.length} {t('common:total', 'total')})
          </p>
        </div>
        <Button variant="primary" leftIcon={Plus}>
          {t('admin:users.addUser', 'Add User')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common:placeholders.searchusersbynameoremail')}
                className={`${STANDARD_INPUT_FIELD} pl-10`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className={STANDARD_INPUT_FIELD}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">{t('common:allroles')}</option>
              <option value={UserRole.SUPER_ADMIN}>{t('common:superadmin')}</option>
              <option value={UserRole.ADMIN}>{t('common:admin')}</option>
              <option value={UserRole.FOUNDATION}>{t('common:foundation')}</option>
              <option value={UserRole.PRODUCT_SUPPLIER}>{t('common:productsupplier')}</option>
              <option value={UserRole.SERVICE_PROVIDER}>{t('common:serviceprovider')}</option>
              <option value={UserRole.EDUCATOR}>{t('common:educator')}</option>
              <option value={UserRole.PARENT}>{t('common:parent')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:users.table.user', 'User')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:users.table.role', 'Role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:users.table.organization', 'Organization')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:users.table.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:users.table.lastLogin', 'Last Login')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('admin:users.table.actions', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.avatarUrl ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-swiss-teal flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || t('admin:users.labels.unknown', 'Unknown')}</div>
                        <div className="text-sm text-gray-500">{user.email || t('admin:users.labels.noEmail', 'No email')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {user.orgName ? (
                        <>
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          {user.orgName}
                        </>
                      ) : (
                        <span className="text-gray-400">{t('admin:users.labels.noOrganization', 'No organization')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('admin:users.labels.never', 'Never')}
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
                        <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('admin:users.editUser.title', 'Edit User')}
                                </button>
                              )}
                            </Menu.Item>
                            {/* Show Elevate to Admin option only for Super Admins */}
                            {isSuperAdmin && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleElevateClick(user)}
                                    className={`${active ? 'bg-orange-50' : ''} flex items-center w-full px-4 py-2 text-sm text-orange-600`}
                                  >
                                    <UserCog className="h-4 w-4 mr-2" />
                                    {user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
                                      ? t('admin:users.elevateUser.changeRole', 'Change Admin Role')
                                      : t('admin:users.elevateUser.elevate', 'Elevate to Admin')}
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDeleteClick(user)}
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('admin:users.deleteUser.delete', 'Delete User')}
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:users.emptyState.title', 'No users found')}</h3>
            <p className="text-gray-600">{t('admin:users.emptyState.description', 'Try adjusting your search criteria or add a new user.')}</p>
          </div>
        )}
      </Card>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        user={selectedUser}
        onSave={handleUpdateUser}
        isLoading={updateUserMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
        isLoading={deleteUserMutation.isPending}
      />

      {/* Elevate to Admin Modal - Only for Super Admins */}
      {isSuperAdmin && (
        <ElevateToAdminModal
          isOpen={isElevateModalOpen}
          onClose={handleCloseElevateModal}
          user={selectedUser}
          onConfirm={handleConfirmElevate}
          isLoading={elevateUserMutation.isPending}
        />
      )}
    </div>
  )
}

export default Users
