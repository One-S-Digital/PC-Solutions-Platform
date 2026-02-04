import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  ShieldCheck,
  Building2,
  X,
  AlertTriangle,
  UserCog,
  ExternalLink,
  Ban,
  CheckCircle,
  UserX,
  UserCheck as UserCheckIcon
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner'

import logger from '../utils/logger'

import { User } from '../types/api'
import { UserRole, UserStatus } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import EditUserModal from '../components/EditUserModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

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
  const [confirmText, setConfirmText] = useState('')
  const requiredPhrase = 'SUDO DELETE USER'

  useEffect(() => {
    if (isOpen) {
      setConfirmText('')
    }
  }, [isOpen])

  if (!isOpen || !user) return null
  const canConfirm = confirmText.trim() === requiredPhrase

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

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:users.deleteUser.typeToConfirm', 'Type the phrase below to confirm')}
            </label>
            <div className="text-xs text-gray-600 mb-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{requiredPhrase}</span>
            </div>
            <input
              type="text"
              className={STANDARD_INPUT_FIELD}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredPhrase}
              disabled={isLoading}
              autoFocus
            />
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
            disabled={isLoading || !canConfirm}
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

// Add User Modal Component (invites user via Clerk)
interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (payload: { email: string; role: UserRole }) => Promise<void>
  isLoading: boolean
  canInviteSuperAdmin: boolean
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  isLoading,
  canInviteSuperAdmin,
}) => {
  const { t } = useTranslation(['common', 'admin'])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.PARENT)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setRole(UserRole.PARENT)
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t('admin:users.addUser.emailRequired', 'Email is required'))
      return
    }

    if (!canInviteSuperAdmin && role === UserRole.SUPER_ADMIN) {
      setError(t('admin:users.addUser.superAdminNotAllowed', 'Only Super Admin can add a Super Admin'))
      return
    }

    try {
      await onInvite({ email: email.trim(), role })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:users.addUser.failed', 'Failed to invite user'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('admin:users.addUser', 'Add User')}</h2>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:users.addUser.email', 'Email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={STANDARD_INPUT_FIELD}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('common:placeholders.emailaddress')}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  'admin:users.addUser.emailHint',
                  'We will send an invitation email. The user will appear in the list after they sign up.',
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:users.addUser.role', 'Role')}
              </label>
              <select
                className={STANDARD_INPUT_FIELD}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {canInviteSuperAdmin && <option value={UserRole.SUPER_ADMIN}>{t('common:superadmin')}</option>}
                <option value={UserRole.ADMIN}>{t('common:admin')}</option>
                <option value={UserRole.FOUNDATION}>{t('common:foundation')}</option>
                <option value={UserRole.PRODUCT_SUPPLIER}>{t('common:productsupplier')}</option>
                <option value={UserRole.SERVICE_PROVIDER}>{t('common:serviceprovider')}</option>
                <option value={UserRole.EDUCATOR}>{t('common:educator')}</option>
                <option value={UserRole.PARENT}>{t('common:parent')}</option>
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
              {isLoading ? t('admin:users.addUser.sending', 'Sending...') : t('admin:users.addUser.sendInvite', 'Send Invite')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Suspend user modal (with preset reasons)
interface SuspendUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onConfirm: (payload: { reasonCode: string; reasonText: string }) => Promise<void>
  isLoading: boolean
}

const getSuspendReasonPresets = (t: (key: string, defaultValue?: string) => string) => [
  {
    code: 'TERMS_VIOLATION',
    label: t('admin:users.suspend.reasons.termsViolation.label', 'Violation of terms'),
    message: t(
      'admin:users.suspend.reasons.termsViolation.message',
      'Your account has been suspended due to a violation of our terms of service.',
    ),
  },
  {
    code: 'SUSPICIOUS_ACTIVITY',
    label: t('admin:users.suspend.reasons.suspiciousActivity.label', 'Suspicious activity'),
    message: t(
      'admin:users.suspend.reasons.suspiciousActivity.message',
      'Your account has been suspended due to suspicious activity. Please contact support to restore access.',
    ),
  },
  {
    code: 'PAYMENT_ISSUE',
    label: t('admin:users.suspend.reasons.paymentIssue.label', 'Payment or billing issue'),
    message: t(
      'admin:users.suspend.reasons.paymentIssue.message',
      'Your account has been suspended due to a billing issue. Please contact support for help.',
    ),
  },
  {
    code: 'REQUESTED_BY_USER',
    label: t('admin:users.suspend.reasons.requestedByUser.label', 'Requested by user'),
    message: t('admin:users.suspend.reasons.requestedByUser.message', 'Your account has been deactivated at your request.'),
  },
  {
    code: 'OTHER',
    label: t('admin:users.suspend.reasons.other.label', 'Other'),
    message: '',
  },
]

const SuspendUserModal: React.FC<SuspendUserModalProps> = ({ isOpen, onClose, user, onConfirm, isLoading }) => {
  const { t } = useTranslation(['common', 'admin'])
  const [selectedCode, setSelectedCode] = useState<string>('TERMS_VIOLATION')
  const [customReason, setCustomReason] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedCode('TERMS_VIOLATION')
      setCustomReason('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen || !user) return null

  const presets = getSuspendReasonPresets(t)
  const preset = presets.find((p) => p.code === selectedCode) || presets[0]
  const reasonText = selectedCode === 'OTHER' ? customReason.trim() : preset.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!reasonText) {
      setError(t('admin:users.suspend.reasonRequired', 'Please provide a reason'))
      return
    }
    await onConfirm({ reasonCode: selectedCode, reasonText })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin:users.suspend.title', 'Suspend account')}
          </h2>
          <button onClick={onClose} disabled={isLoading} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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

            <div className="text-sm text-gray-700">
              {t('admin:users.suspend.userLabel', 'User')}: <span className="font-medium">{user.name || user.email}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:users.suspend.reason', 'Reason')}
              </label>
              <select
                className={STANDARD_INPUT_FIELD}
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
              >
                {presets.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedCode === 'OTHER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:users.suspend.customReason', 'Custom message')}
                </label>
                <textarea
                  className={STANDARD_INPUT_FIELD}
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={t('admin:users.suspend.customReasonPlaceholder', 'Write the message the user will see on login...')}
                />
              </div>
            )}

            {selectedCode !== 'OTHER' && (
              <div className="text-xs text-gray-500">
                {t('admin:users.suspend.preview', 'User message preview')}: {preset.message}
              </div>
            )}
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? t('admin:users.suspend.suspending', 'Suspending...') : t('admin:users.suspend.confirm', 'Suspend')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const Users: React.FC = () => {
  const { t } = useTranslation(['common', 'admin']);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isElevateModalOpen, setIsElevateModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false)
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
  const canInviteSuperAdmin = isSuperAdmin

  // Reset to first page when filters/page-size change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedRole, pageSize])

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, pageSize, debouncedSearch, selectedRole],
    queryFn: () =>
      apiService.getAdminUsers(apiClient, {
        page,
        limit: pageSize,
        search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        role: selectedRole || undefined,
      }),
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
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
    // Delete is a permanent hard delete (Suspend is handled by status update).
    mutationFn: (userId: string) => apiService.deleteUserHard(apiClient, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setIsDeleteModalOpen(false)
      setSelectedUser(null)
      toast.success(t('admin:users.deleteUser.success', 'User deleted'))
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
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setIsElevateModalOpen(false)
      setSelectedUser(null)
      logger.log('User elevated to admin successfully:', response.data)
    },
    onError: (error) => {
      logger.error('Failed to elevate user:', error)
      // Don't rethrow - let mutateAsync handle the rejection in the modal's try/catch
    },
  })

  // Invite user mutation (Admin + Super Admin; backend blocks ADMIN -> SUPER_ADMIN)
  const inviteUserMutation = useMutation({
    mutationFn: (payload: { email: string; role: UserRole }) => apiService.inviteUser(apiClient, payload),
    onSuccess: () => {
      setIsAddUserModalOpen(false)
      toast.success(t('admin:users.addUser.inviteSent', 'Invitation sent'))
      logger.log('User invitation created successfully')
    },
    onError: (error: any) => {
      logger.error('Failed to invite user:', error)
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        t('admin:users.addUser.failed', 'Failed to send invitation')
      toast.error(message)
    },
  })

  const { users, meta } = React.useMemo(() => {
    // /admin/users returns DB users directly (not wrapped like many other endpoints).
    const raw = (usersResponse as any)?.data?.data ?? (usersResponse as any)?.data

    const payload = raw && typeof raw === 'object' ? raw : undefined
    const list = Array.isArray(payload?.users) ? payload.users : []

    const normalizeDbUser = (u: any): User => {
      const orgMemberships = Array.isArray(u?.organizations) ? u.organizations : []
      const primaryOrg = orgMemberships[0]?.organization
      const primaryOrgId = orgMemberships[0]?.organizationId

      const firstName = (u?.firstName ?? undefined) as string | undefined
      const lastName = (u?.lastName ?? undefined) as string | undefined
      const email = (u?.email ?? undefined) as string | undefined
      const displayName = `${firstName || ''} ${lastName || ''}`.trim() || email || u?.name || ''

      return {
        // IMPORTANT:
        // - `id` is used by Users page mutations (/users/:id) which expect AppUser.id
        // - `profileId` is the DB User.id (profile UUID) used by subscriptions and profile linkage
        id: u.appUserId || u.id,
        profileId: u.id,
        clerkId: u.clerkId,
        name: displayName,
        email: email || '',
        firstName,
        lastName,
        role: u.role,
        orgId: primaryOrgId,
        orgIds: orgMemberships.map((m: any) => m.organizationId).filter(Boolean),
        orgName: primaryOrg?.name,
        status: u.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        candidatePoolVisible: u.candidatePoolVisible,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        lastLogin: u.lastActiveAt ? new Date(u.lastActiveAt) : undefined,
      } as User
    }

    return {
      users: list.map(normalizeDbUser),
      meta: {
        total: payload?.total ?? list.length,
        page: payload?.page ?? 1,
        limit: payload?.limit ?? pageSize,
        totalPages: payload?.totalPages ?? 1,
      },
    }
  }, [usersResponse, pageSize])

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: any }) =>
      apiService.updateUser(apiClient, userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const updateCandidatePoolVisibilityMutation = useMutation({
    mutationFn: ({ userId, candidatePoolVisible }: { userId: string; candidatePoolVisible: boolean }) =>
      apiService.updateUser(apiClient, userId, { candidatePoolVisible } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const roleColors: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-800',
    [UserRole.ADMIN]: 'bg-orange-100 text-orange-800',
    [UserRole.FOUNDATION]: 'bg-swiss-teal/10 text-swiss-teal',
    [UserRole.PRODUCT_SUPPLIER]: 'bg-swiss-mint/10 text-swiss-mint',
    [UserRole.SERVICE_PROVIDER]: 'bg-swiss-sand/20 text-swiss-sand',
    [UserRole.EDUCATOR]: 'bg-indigo-100 text-indigo-800',
    [UserRole.PARENT]: 'bg-swiss-coral/10 text-swiss-coral',
  }

  const totalUsers = typeof meta?.total === 'number' ? meta.total : users.length
  const totalPages = typeof meta?.totalPages === 'number' ? meta.totalPages : 1
  const showingFrom = totalUsers === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalUsers === 0 ? 0 : Math.min(page * pageSize, totalUsers)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  // Handle opening edit modal
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleSuspendClick = (user: User) => {
    setSelectedUser(user)
    setIsSuspendModalOpen(true)
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

  // Handle viewing user profile - opens the frontend organization profile page
  const handleViewProfile = (user: User) => {
    if (!user.orgId) {
      toast.error(t('admin:users.viewProfile.noOrganization', 'This user has no organization profile to view'))
      return
    }

    // Prefer explicit frontend URL to avoid 404s in environments without SPA rewrites / predictable hostnames.
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL as string | undefined

    const openOrganizationProfile = (baseUrl: string) => {
      // Use relative join so baseUrl may include a path prefix (e.g. https://domain.com/app)
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
      const url = new URL(`profile/organization/${user.orgId}`, normalizedBase)
      window.open(url.toString(), '_blank', 'noopener,noreferrer')
    }

    if (frontendUrl) {
      openOrganizationProfile(frontendUrl)
      return
    }

    // Best-effort fallback when VITE_FRONTEND_URL isn't configured.
    // Tries common patterns:
    // - admin.domain.com -> domain.com
    // - admin-staging.domain.com -> staging.domain.com
    // - staging-admin.domain.com -> staging.domain.com
    // - domain.com -> app.domain.com (common SPA deployment)
    // - localhost:3001 -> localhost:3000
    const currentUrl = new URL(window.location.href)
    const { protocol, hostname, port } = currentUrl

    let derivedHostname = hostname
    if (hostname.startsWith('admin.')) {
      derivedHostname = hostname.replace(/^admin\./, '')
    } else if (hostname.startsWith('admin-')) {
      derivedHostname = hostname.replace(/^admin-/, '')
    } else if (hostname.endsWith('-admin')) {
      derivedHostname = hostname.replace(/-admin$/, '')
    }

    // If admin is hosted on the apex domain but the frontend lives on app.<domain>,
    // prefer that convention (e.g. procrechesolutions.com -> app.procrechesolutions.com).
    // This is only applied when we couldn't derive a different hostname via admin-* patterns.
    const hostnameLabels = derivedHostname.split('.')
    const isLocalhostLike = derivedHostname === 'localhost' || derivedHostname.endsWith('.localhost')
    if (!isLocalhostLike && derivedHostname === hostname && hostnameLabels.length === 2) {
      derivedHostname = `app.${derivedHostname}`
    }

    const derivedPort = port === '3001' ? '3000' : port
    const derivedHost = derivedPort ? `${derivedHostname}:${derivedPort}` : derivedHostname
    const derivedUrl = `${protocol}//${derivedHost}`

    // Observability: help debug non-standard deployments where derivation may be wrong.
    // eslint-disable-next-line no-console
    console.warn(
      `VITE_FRONTEND_URL not configured. Derived frontend URL: ${derivedUrl}. ` +
        `For reliable profile links, set VITE_FRONTEND_URL in the admin environment configuration.`,
    )

    openOrganizationProfile(derivedUrl)
  }

  // Handle saving user updates
  const handleUpdateUser = async (updatedUser: User) => {
    await updateUserMutation.mutateAsync(updatedUser)
  }

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (selectedUser) {
      try {
        await deleteUserMutation.mutateAsync(selectedUser.id)
      } catch (err: any) {
        // Keep modal open; provide actionable feedback.
        const apiError =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          t('admin:users.deleteUser.failed', 'Failed to delete user')

        const apiCode = err?.response?.data?.error?.code
        if (apiCode === 'HARD_DELETE_BLOCKED') {
          toast.error(
            t(
              'admin:users.deleteUser.blocked',
              'Cannot permanently delete this user because they have dependent records (messages/subscriptions/etc.). Suspend the account instead.',
            ),
          )
        } else {
          toast.error(apiError)
        }
      }
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

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false)
  }

  const handleCloseSuspendModal = () => {
    setIsSuspendModalOpen(false)
    setSelectedUser(null)
  }

  const handleInviteUser = async (payload: { email: string; role: UserRole }) => {
    await inviteUserMutation.mutateAsync(payload)
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
            {t('admin:users.subtitle', 'Manage all users across the platform')} ({totalUsers} {t('common:total', 'total')})
          </p>
        </div>
        <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddUserModalOpen(true)}>
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
              <option value="">{t('common:filters.roles.all')}</option>
              <option value={UserRole.SUPER_ADMIN}>{t('common:superadmin')}</option>
              <option value={UserRole.ADMIN}>{t('common:admin')}</option>
              <option value={UserRole.FOUNDATION}>{t('common:foundation')}</option>
              <option value={UserRole.PRODUCT_SUPPLIER}>{t('common:productsupplier')}</option>
              <option value={UserRole.SERVICE_PROVIDER}>{t('common:serviceprovider')}</option>
              <option value={UserRole.EDUCATOR}>{t('common:educator')}</option>
              <option value={UserRole.PARENT}>{t('common:parent')}</option>
            </select>
          </div>
          <div className="sm:w-48">
            <select
              className={`${STANDARD_INPUT_FIELD} pr-10`}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 25</option>
              <option value={50}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 50</option>
              <option value={100}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 100</option>
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
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="large" />
                    </div>
                  </td>
                </tr>
              ) : users.map((user) => (
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
                                  onClick={() =>
                                    user.status === 'ACTIVE'
                                      ? handleSuspendClick(user)
                                      : updateUserStatusMutation.mutate({ userId: user.id, payload: { status: 'ACTIVE' } })
                                  }
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  disabled={updateUserStatusMutation.isPending}
                                >
                                  {user.status === 'ACTIVE' ? (
                                    <>
                                      <Ban className="h-4 w-4 mr-2" />
                                      {t('admin:users.actions.suspend', 'Suspend')}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {t('admin:users.actions.reactivate', 'Reactivate')}
                                    </>
                                  )}
                                </button>
                              )}
                            </Menu.Item>

                            {user.role === UserRole.EDUCATOR && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() =>
                                      updateCandidatePoolVisibilityMutation.mutate({
                                        userId: user.id,
                                        candidatePoolVisible: !user.candidatePoolVisible,
                                      })
                                    }
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                    disabled={updateCandidatePoolVisibilityMutation.isPending}
                                  >
                                    {user.candidatePoolVisible ? (
                                      <>
                                        <UserX className="h-4 w-4 mr-2" />
                                        {t('admin:users.actions.removeFromPool', 'Remove from candidate pool')}
                                      </>
                                    ) : (
                                      <>
                                        <UserCheckIcon className="h-4 w-4 mr-2" />
                                        {t('admin:users.actions.addToPool', 'Add to candidate pool')}
                                      </>
                                    )}
                                  </button>
                                )}
                              </Menu.Item>
                            )}

                            {/* Edit Full Profile - Navigate to full profile edit page */}
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => navigate(`/users/${user.id}/profile`)}
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-swiss-teal font-medium`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('admin:users.editFullProfile', 'Edit Full Profile')}
                                </button>
                              )}
                            </Menu.Item>
                            {/* View Profile - Only for users with organizations (suppliers/service providers) */}
                            {user.orgId && (user.role === UserRole.PRODUCT_SUPPLIER || user.role === UserRole.SERVICE_PROVIDER) && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleViewProfile(user)}
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    {t('admin:users.viewProfile.title', 'View Profile')}
                                  </button>
                                )}
                              </Menu.Item>
                            )}
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
        
        {users.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:users.emptyState.title', 'No users found')}</h3>
            <p className="text-gray-600">{t('admin:users.emptyState.description', 'Try adjusting your search criteria or add a new user.')}</p>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          {t(
            'admin:users.pagination.showing',
            'Showing {{from}}-{{to}} of {{total}}',
            { from: showingFrom, to: showingTo, total: totalUsers },
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canGoPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('admin:users.pagination.previous', 'Previous')}
          </button>
          <span className="text-sm text-gray-600 px-2">
            {t('admin:users.pagination.pageOf', 'Page {{page}} of {{totalPages}}', { page, totalPages })}
          </span>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canGoNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t('admin:users.pagination.next', 'Next')}
          </button>
        </div>
        <div className="hidden sm:block" />
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        user={selectedUser}
        onSave={handleUpdateUser}
        isLoading={updateUserMutation.isPending}
        isFetchingUser={false}
        currentUserRole={currentUser?.role}
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

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={handleCloseAddUserModal}
        onInvite={handleInviteUser}
        isLoading={inviteUserMutation.isPending}
        canInviteSuperAdmin={canInviteSuperAdmin}
      />

      {/* Suspend Modal */}
      <SuspendUserModal
        isOpen={isSuspendModalOpen}
        onClose={handleCloseSuspendModal}
        user={selectedUser}
        isLoading={updateUserStatusMutation.isPending}
        onConfirm={async ({ reasonCode, reasonText }) => {
          if (!selectedUser) return
          await updateUserStatusMutation.mutateAsync({
            userId: selectedUser.id,
            payload: {
              status: 'INACTIVE',
              deactivatedReasonCode: reasonCode,
              deactivatedReasonText: reasonText,
            },
          })
          setIsSuspendModalOpen(false)
          setSelectedUser(null)
        }}
      />
    </div>
  )
}

export default Users
