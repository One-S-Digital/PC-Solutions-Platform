import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, apiService } from '../services/api';
import { toast } from 'sonner';
import { UserStatus } from '../types';
import { STANDARD_INPUT_FIELD } from '../constants/design-system';

export interface QuickEditUserData {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  shortBio?: string | null;
  status?: UserStatus;
}

interface AdminQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: QuickEditUserData | null;
}

/**
 * Compact profile-edit modal surfaced for ADMIN role users.
 * Only allows editing the fields permitted by the backend ADMIN whitelist:
 * firstName, lastName, email, contactEmail (not shown here), phoneNumber, shortBio.
 * Status is managed via the existing /users/:id endpoint (role-level field).
 */
const AdminQuickEditModal: React.FC<AdminQuickEditModalProps> = ({ isOpen, onClose, user }) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shortBio, setShortBio] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setEmail(user.email ?? '');
      setPhoneNumber(user.phoneNumber ?? '');
      setShortBio(user.shortBio ?? '');
      setFormError(null);
    }
  }, [user, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiService.updateAdminUserProfile(apiClient, user!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-profile', user?.id] });
      toast.success(t('admin:userProfile.updateSuccess', 'Profile updated successfully'));
      onClose();
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message;
      const message = Array.isArray(raw)
        ? raw.join('; ')
        : (raw ?? t('admin:userProfile.updateError', 'Failed to update profile'));
      setFormError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError(t('admin:users.editUser.emailRequired', 'Email is required'));
      return;
    }

    updateMutation.mutate({
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim(),
      phoneNumber: phoneNumber.trim() || null,
      shortBio: shortBio.trim() || null,
    });
  };

  if (!isOpen) return null;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-swiss-teal/10 flex items-center justify-center">
              <User className="w-4 h-4 text-swiss-teal" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('admin:users.quickEdit.title', 'Quick Edit Profile')}
              </h2>
              {fullName && (
                <p className="text-xs text-gray-500">{fullName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:users.editUser.firstName', 'First Name')}
                </label>
                <input
                  type="text"
                  className={STANDARD_INPUT_FIELD}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('common:placeholders.firstname', 'First name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:users.editUser.lastName', 'Last Name')}
                </label>
                <input
                  type="text"
                  className={STANDARD_INPUT_FIELD}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('common:placeholders.lastname', 'Last name')}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('common:placeholders.emailaddress', 'Email address')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.phone', 'Phone Number')}
              </label>
              <input
                type="tel"
                className={STANDARD_INPUT_FIELD}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+41 XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.bio', 'Short Bio')}
              </label>
              <textarea
                className={STANDARD_INPUT_FIELD}
                rows={3}
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder={t('admin:userProfile.bioPlaceholder', 'A brief description...')}
              />
            </div>

            <p className="text-xs text-gray-400">
              {t(
                'admin:users.quickEdit.scopeNote',
                'Quick Edit allows updating basic profile info. For full profile editing, Super Admin access is required.',
              )}
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { onClose(); navigate(`/users/${user!.id}/profile`); }}
              className="flex items-center gap-1.5 text-sm font-medium text-swiss-teal hover:text-swiss-teal/80"
            >
              <ExternalLink className="w-4 h-4" />
              {t('admin:users.quickEdit.fullProfile', 'Full Profile')}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-swiss-teal border border-transparent rounded-md shadow-sm hover:bg-swiss-teal/90 disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? t('common:saving', 'Saving...')
                  : t('common:saveChanges', 'Save Changes')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminQuickEditModal;
