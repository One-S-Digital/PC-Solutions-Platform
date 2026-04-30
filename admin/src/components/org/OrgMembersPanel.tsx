import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, ExternalLink, Search } from 'lucide-react';
import { useApiClient, apiService } from '../../services/api';
import Card from '../design-system/Card';
import Button from '../design-system/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';
import { UserRole } from '../../types';

interface Member {
  userId: string;
  role: string;
  name: string;
  email: string;
}

interface OrgMembersPanelProps {
  orgId: string;
  orgType: string;
  members: Member[];
  onMembersChanged: () => void;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: UserRole.EDUCATOR, label: 'Educator' },
  { value: UserRole.PRODUCT_SUPPLIER, label: 'Product Supplier' },
  { value: UserRole.SERVICE_PROVIDER, label: 'Service Provider' },
  { value: UserRole.FOUNDATION, label: 'Foundation' },
];

const defaultRoleForOrgType = (orgType: string): string => {
  switch (orgType) {
    case 'FOUNDATION': return UserRole.EDUCATOR;
    case 'PRODUCT_SUPPLIER': return UserRole.PRODUCT_SUPPLIER;
    case 'SERVICE_PROVIDER': return UserRole.SERVICE_PROVIDER;
    default: return UserRole.EDUCATOR;
  }
};

const OrgMembersPanel: React.FC<OrgMembersPanelProps> = ({ orgId, orgType, members, onMembersChanged }) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(defaultRoleForOrgType(orgType));
  const [removeId, setRemoveId] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', orgId] });
    onMembersChanged();
  }, [queryClient, orgId, onMembersChanged]);

  const addMutation = useMutation({
    mutationFn: () => apiService.addAdminOrgMember(apiClient, orgId, selectedUser!.id, selectedRole),
    onSuccess: () => {
      invalidate();
      setIsAddFormOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole(defaultRoleForOrgType(orgType));
      toast.success(t('admin:orgMembers.added', 'Member added to organization'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:orgMembers.addError', 'Failed to add member')),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiService.removeAdminOrgMember(apiClient, orgId, userId),
    onSuccess: () => {
      invalidate();
      setRemoveId(null);
      toast.success(t('admin:orgMembers.removed', 'Member removed from organization'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:orgMembers.removeError', 'Failed to remove member')),
  });

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      setSelectedUser(null);
      if (q.trim().length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const res = await apiService.getAdminUsers(apiClient, { search: q.trim(), limit: 10 });
        setSearchResults(res.data?.data?.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [apiClient],
  );

  const alreadyMemberIds = new Set(members.map((m) => m.userId));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2 text-swiss-teal" />
          {t('admin:orgProfile.members', 'Organization Members')}
          {members.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({members.length})</span>
          )}
        </h3>
        <Button
          variant="secondary"
          leftIcon={UserPlus}
          size="sm"
          onClick={() => { setIsAddFormOpen(true); setSearchQuery(''); setSearchResults([]); setSelectedUser(null); setSelectedRole(defaultRoleForOrgType(orgType)); }}
        >
          {t('admin:orgMembers.addMember', 'Add Member')}
        </Button>
      </div>

      {/* Add member form */}
      {isAddFormOpen && (
        <div className="mb-4 p-4 border border-swiss-teal/30 rounded-lg bg-teal-50">
          <p className="font-medium text-sm text-gray-800 mb-3">
            {t('admin:orgMembers.addMemberTitle', 'Add a member to this organization')}
          </p>
          <div className="space-y-3">
            {/* User search */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('admin:orgMembers.searchUser', 'Search by name or email')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={`${STANDARD_INPUT_FIELD} pl-9`}
                  placeholder={t('admin:orgMembers.searchPlaceholder', 'Type at least 2 characters...')}
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="small" />
                  </span>
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && !selectedUser && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => {
                    const isMember = alreadyMemberIds.has(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={isMember}
                        onClick={() => { setSelectedUser(user); setSearchQuery(`${user.name || ''} — ${user.email}`); setSearchResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.email} · {user.role}{isMember ? ` · ${t('admin:orgMembers.alreadyMember', 'already a member')}` : ''}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && !selectedUser && (
                <p className="mt-1 text-xs text-gray-500">{t('admin:orgMembers.noResults', 'No users found')}</p>
              )}
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('admin:orgMembers.role', 'Role in organization')}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className={STANDARD_INPUT_FIELD}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={addMutation.isPending}
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={!selectedUser || addMutation.isPending}
                className="px-3 py-1.5 text-sm text-white bg-swiss-teal rounded-md hover:bg-swiss-teal/90 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {addMutation.isPending && <LoadingSpinner size="small" />}
                {t('admin:orgMembers.addButton', 'Add Member')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current members list */}
      {members.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {t('admin:orgProfile.noMembers', 'No members yet. Click "Add Member" to add one.')}
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900">{member.name || t('admin:orgProfile.unknownMember', 'Unknown')}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-swiss-teal/10 text-swiss-teal rounded-full whitespace-nowrap">
                  {member.role}
                </span>
                <button
                  type="button"
                  title={t('admin:orgProfile.editMember', 'Edit user profile')}
                  onClick={() => navigate(`/users/${member.userId}/profile`)}
                  className="p-1.5 text-gray-400 hover:text-swiss-teal hover:bg-white rounded"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title={t('admin:orgMembers.remove', 'Remove from organization')}
                  onClick={() => setRemoveId(member.userId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"
                  disabled={removeMutation.isPending && removeId === member.userId}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remove confirmation */}
      {removeId && (
        <div className="mt-3 p-3 border border-red-200 rounded-lg bg-red-50 flex items-center justify-between">
          <p className="text-sm text-red-700">
            {t('admin:orgMembers.removeConfirm', 'Remove this member from the organization?')}
          </p>
          <div className="flex gap-2 ml-3">
            <button
              type="button"
              onClick={() => setRemoveId(null)}
              className="px-3 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => removeMutation.mutate(removeId)}
              disabled={removeMutation.isPending}
              className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {removeMutation.isPending && <LoadingSpinner size="small" />}
              {t('admin:orgMembers.remove', 'Remove')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default OrgMembersPanel;
