import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { User } from '../types/api'
import { UserRole, UserStatus } from '../types'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'

export interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSave: (user: User) => Promise<void>
  isLoading: boolean
  currentUserRole?: UserRole
  showCandidatePoolControls?: boolean
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  isLoading,
  currentUserRole,
  showCandidatePoolControls,
}) => {
  const [formData, setFormData] = useState<Partial<User>>({})
  const { t } = useTranslation(['common', 'admin'])
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
        candidatePoolVisible: showCandidatePoolControls ? Boolean(user.candidatePoolVisible) : undefined,
      })
      setError(null)
    }
  }, [user, isOpen, showCandidatePoolControls])

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
        id: user!.id,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        status: formData.status,
        ...(showCandidatePoolControls
          ? { candidatePoolVisible: Boolean(formData.candidatePoolVisible) }
          : {}),
      } as User
      await onSave(updatePayload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:users.editUser.updateFailed', 'Failed to update user'))
    }
  }

  if (!isOpen || !user) return null

  const canAssignSuperAdmin = currentUserRole === UserRole.SUPER_ADMIN
  const isEditingSuperAdmin = user.role === UserRole.SUPER_ADMIN
  const lockRole = !canAssignSuperAdmin && isEditingSuperAdmin

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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:users.editUser.email', 'Email')} <span className="text-red-500">*</span>
              </label>
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
                disabled={lockRole}
              >
                {(canAssignSuperAdmin || isEditingSuperAdmin) && (
                  <option value={UserRole.SUPER_ADMIN}>{t('common:superadmin')}</option>
                )}
                <option value={UserRole.ADMIN}>{t('common:admin')}</option>
                <option value={UserRole.FOUNDATION}>{t('common:foundation')}</option>
                <option value={UserRole.PRODUCT_SUPPLIER}>{t('common:productsupplier')}</option>
                <option value={UserRole.SERVICE_PROVIDER}>{t('common:serviceprovider')}</option>
                <option value={UserRole.EDUCATOR}>{t('common:educator')}</option>
                <option value={UserRole.PARENT}>{t('common:parent')}</option>
              </select>
              {!canAssignSuperAdmin && (
                <p className="mt-1 text-xs text-gray-500">
                  {t('admin:users.editUser.roleHint', 'You cannot assign the Super Admin role.')}
                </p>
              )}
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

            {showCandidatePoolControls && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:users.editUser.candidatePool', 'Candidate pool')}
                </label>
                <select
                  className={STANDARD_INPUT_FIELD}
                  value={formData.candidatePoolVisible ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({ ...formData, candidatePoolVisible: e.target.value === 'true' })
                  }
                >
                  <option value="true">
                    {t('admin:users.editUser.candidatePoolIn', 'In pool')}
                  </option>
                  <option value="false">
                    {t('admin:users.editUser.candidatePoolOut', 'Not in pool')}
                  </option>
                </select>
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

export default EditUserModal
