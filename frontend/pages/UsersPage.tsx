
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { User, UserRole } from '../types';
import { ICON_INPUT_FIELD, STANDARD_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MagnifyingGlassIcon, FunnelIcon, PencilIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// Maximum users fetched per request. Referenced in the truncation warning message.
const PAGE_LIMIT = 100;

// Map backend status strings (uppercase or isActive boolean) to the legacy frontend title-case values.
const toFrontendStatus = (status: string | undefined, isActive: boolean): 'Active' | 'Pending' | 'Inactive' => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'PENDING') return 'Pending';
  if (status === 'INACTIVE') return 'Inactive';
  return isActive ? 'Active' : 'Inactive';
};

// Shape returned by the /admin/users endpoint before transformation.
// appUserId is the AppUser.id injected by user-management.service.ts; this is the
// identifier expected by /users/:id mutation endpoints (PATCH, DELETE).
interface RawApiUser {
  id: string;
  appUserId?: string | null;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status?: string;
  isActive: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
  region?: string;
  orgName?: string;
  [key: string]: unknown;
}

const transformApiUser = (u: RawApiUser): User => ({
  ...(u as unknown as User),
  // Prefer appUserId so that PATCH/DELETE calls reach the correct /users/:id endpoint.
  id: u.appUserId || u.id,
  name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Unknown User',
  status: toFrontendStatus(u.status, u.isActive),
  lastLogin: u.lastActiveAt,
  memberSince: u.createdAt,
});

interface UserRowProps {
  user: User;
  onUserSelect: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  isSuperAdmin: boolean;
}

const UserRow: React.FC<UserRowProps> = ({ user, onUserSelect, onDeleteUser, isSuperAdmin }) => {
  const { t, i18n } = useTranslation(['users', 'common']);
  const { currentUser } = useAppContext();
  const statusColors: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Inactive: 'bg-red-100 text-red-700',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.id === user.id) {
      alert(t('roleManagement.cannotDeleteOwnAccount'));
      return;
    }
    onDeleteUser(user.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUserSelect(user);
  };

  const displayName = user.name || user.email || 'Unknown';
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?${new URLSearchParams({ name: displayName, background: '48CFAE', color: 'fff' }).toString()}`;

  return (
    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onUserSelect(user)}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <img
            className="h-10 w-10 rounded-full"
            src={user.avatarUrl || fallbackAvatarUrl}
            alt={displayName}
          />
          <div className="ml-4">
            <div className="text-sm font-medium text-swiss-charcoal">{displayName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t(`common:userRoles.${user.role}`, user.role)}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[user.status ?? 'Pending'] ?? 'bg-gray-100 text-gray-700'}`}>
          {user.status ? t(`usersPage.status.${user.status.toLowerCase()}`, user.status) : t('roleManagement.status.pending', 'Pending')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.region || 'N/A'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString(i18n.language) : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isSuperAdmin ? (
          <div className="flex space-x-2 justify-end">
            <Button variant="ghost" size="xs" onClick={handleEdit} leftIcon={PencilIcon}>{t('common:buttons.edit')}</Button>
            {currentUser?.id !== user.id && (
              <Button variant="ghost" size="xs" onClick={handleDelete} leftIcon={TrashIcon} className="text-red-600 hover:text-red-700">
                {t('common:buttons.delete')}
              </Button>
            )}
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onUserSelect(user); }}>
            {t('common:buttons.view')}
          </Button>
        )}
      </td>
    </tr>
  );
};

interface UserDetailDrawerProps {
  user: User | null;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
  isSaving: boolean;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ user, onClose, onUpdateUser, isSaving }) => {
  const { t } = useTranslation(['users', 'common']);
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(user?.role);

  useEffect(() => {
    setSelectedRole(user?.role);
  }, [user]);

  if (!user) return null;

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const canPerformActions = isSuperAdmin && currentUser?.id !== user.id;

  const handleRoleUpdate = () => {
    if (selectedRole && canPerformActions) {
      onUpdateUser({ ...user, role: selectedRole });
    }
  };

  const handleStatusUpdate = (newStatus: 'Active' | 'Inactive') => {
    if (canPerformActions) {
      onUpdateUser({ ...user, status: newStatus });
    }
  };

  const displayName = user.name || user.email || 'Unknown';
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?${new URLSearchParams({ name: displayName, background: '48CFAE', color: 'fff' }).toString()}`;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full md:w-1/3 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out"
      style={{ transform: 'translateX(0)' }}
    >
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('roleManagement.userDetailDrawer.title')}</h2>
          <Button variant="ghost" onClick={onClose}>{t('common:buttons.close')}</Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <img
            src={user.avatarUrl || fallbackAvatarUrl}
            alt={displayName}
            className="w-24 h-24 rounded-full mx-auto mb-4"
          />
          <p className="text-center text-lg font-medium">{displayName}</p>
          <p className="text-center text-sm text-gray-500 mb-4">{user.email}</p>

          <div className="space-y-2 text-sm">
            <p><strong>{t('roleManagement.userDetailDrawer.roleLabel')}</strong> {t(`common:userRoles.${user.role}`, user.role)}</p>
            <p><strong>{t('roleManagement.userDetailDrawer.statusLabel')}</strong> {user.status ? t(`usersPage.status.${user.status.toLowerCase()}`, user.status) : 'N/A'}</p>
            <p><strong>{t('roleManagement.userDetailDrawer.regionLabel')}</strong> {user.region || 'N/A'}</p>
            <p><strong>{t('roleManagement.userDetailDrawer.lastLoginLabel')}</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</p>
            {user.orgName && <p><strong>{t('roleManagement.userDetailDrawer.orgLabel')}</strong> {user.orgName}</p>}
          </div>

          {isSuperAdmin && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">{t('roleManagement.userDetailDrawer.adminActionsTitle')}</h3>
              {canPerformActions ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full mb-3"
                    onClick={() => navigate(`/users/full-edit/${user.id}`)}
                    leftIcon={PencilIcon}
                  >
                    Full Edit (Impersonation)
                  </Button>
                  <div className="mb-3">
                    <label htmlFor="roleSelect" className="block text-xs font-medium text-gray-500 mb-1">
                      {t('roleManagement.userDetailDrawer.changeRoleLabel')}
                    </label>
                    <select
                      id="roleSelect"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className={`${STANDARD_INPUT_FIELD} w-full mb-2`}
                      disabled={isSaving}
                    >
                      {Object.values(UserRole).map(r => (
                        <option key={r} value={r}>{t(`common:userRoles.${r}`, r)}</option>
                      ))}
                    </select>
                    <Button variant="secondary" className="w-full" onClick={handleRoleUpdate} disabled={isSaving}>
                      {isSaving ? t('common:saving', 'Saving...') : t('roleManagement.userDetailDrawer.updateRoleButton')}
                    </Button>
                  </div>
                  {user.status === 'Active' ? (
                    <Button variant="danger" className="w-full" onClick={() => handleStatusUpdate('Inactive')} leftIcon={XCircleIcon} disabled={isSaving}>
                      {t('roleManagement.userDetailDrawer.suspendUserButton')}
                    </Button>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={() => handleStatusUpdate('Active')} leftIcon={CheckCircleIcon} disabled={isSaving}>
                      {t('roleManagement.userDetailDrawer.activateUserButton')}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500 italic">{t('roleManagement.userDetailDrawer.cannotModifyOwnAccount')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const UserListPage: React.FC<{ roleFilter?: UserRole }> = ({ roleFilter }) => {
  const { t } = useTranslation(['users', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  const [usersData, setUsersData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncatedTotal, setTruncatedTotal] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const pageTitle = roleFilter
    ? t('roleManagement.rolePageTitle', { role: t(`common:userRoles.${roleFilter}`, roleFilter) })
    : t('roleManagement.allUsersTitle');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTruncatedTotal(null);
    try {
      const params = new URLSearchParams({ page: '1', limit: String(PAGE_LIMIT) });
      if (roleFilter) params.set('role', roleFilter);

      const response = await authenticatedRequest<{ users: RawApiUser[]; total: number }>(`/admin/users?${params.toString()}`);

      // The response shape may be { data: { users: [...] } } or { users: [...] } depending on wrapping.
      const payload = (response as any)?.data ?? response;
      const rawUsers: RawApiUser[] = Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload)
        ? payload
        : [];

      setUsersData(rawUsers.map(transformApiUser));

      // Surface a notice when the backend has more records than the page returned.
      const total: number = typeof payload?.total === 'number' ? payload.total : rawUsers.length;
      if (total > rawUsers.length) {
        setTruncatedTotal(total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('roleManagement.fetchError', 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedRequest, roleFilter, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return usersData;
    const lower = searchTerm.toLowerCase();
    return usersData.filter(user =>
      (user.name || '').toLowerCase().includes(lower) ||
      user.email.toLowerCase().includes(lower) ||
      (user.region && user.region.toLowerCase().includes(lower))
    );
  }, [searchTerm, usersData]);

  const handleUserSelect = (user: User) => setSelectedUser(user);
  const handleCloseDrawer = () => setSelectedUser(null);

  const handleDeleteUser = async (userId: string) => {
    const userName = usersData.find(u => u.id === userId)?.name || 'this user';
    const confirmMessage = t(
      'roleManagement.confirmDeleteUser',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      { userName },
    );
    if (!window.confirm(confirmMessage)) return;
    try {
      // Use the standard (soft) delete path. Hard-delete flags are omitted
      // to preserve referential integrity and allow potential recovery.
      await authenticatedRequest(`/users/${userId}`, { method: 'DELETE' });
      setUsersData(prev => prev.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('roleManagement.deleteError', 'Failed to delete user'));
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setIsSaving(true);
    try {
      // Map frontend status back to backend format for the PATCH call.
      const statusMap: Record<string, string> = { Active: 'ACTIVE', Inactive: 'INACTIVE', Pending: 'PENDING' };
      const patchBody: Record<string, unknown> = { role: updatedUser.role };
      if (updatedUser.status) patchBody.status = statusMap[updatedUser.status] ?? updatedUser.status;

      await authenticatedRequest(`/users/${updatedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      });

      setUsersData(prev => {
        const next = prev.map(u => (u.id === updatedUser.id ? updatedUser : u));
        return roleFilter ? next.filter(u => u.role === roleFilter) : next;
      });
      if (roleFilter && updatedUser.role !== roleFilter) {
        setSelectedUser(null);
      } else {
        setSelectedUser(updatedUser);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t('roleManagement.updateError', 'Failed to update user'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{pageTitle}</h1>
        <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? t('common:loading', 'Loading...') : t('roleManagement.refreshButton', 'Refresh')}
        </Button>
      </div>
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('roleManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={ICON_INPUT_FIELD}
            />
          </div>
        </div>
      </Card>

      {truncatedTotal !== null && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
          {t('roleManagement.truncatedWarning', `Showing ${PAGE_LIMIT} of ${truncatedTotal} users. Refine your search to find specific users.`, { limit: PAGE_LIMIT, total: truncatedTotal })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button className="ml-3 underline" onClick={fetchUsers}>{t('common:retry', 'Retry')}</button>
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('roleManagement.table.nameOrg')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('roleManagement.table.role')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('roleManagement.table.status')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('roleManagement.table.region')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('roleManagement.table.lastLogin')}</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('roleManagement.table.actions')}</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {t('common:loading', 'Loading...')}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onUserSelect={handleUserSelect}
                  onDeleteUser={handleDeleteUser}
                  isSuperAdmin={currentUser?.role === UserRole.SUPER_ADMIN}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && filteredUsers.length === 0 && !error && (
        <p className="text-center text-gray-500 py-8">
          {searchTerm.trim()
            ? t('roleManagement.noSearchResults', 'No users match your search')
            : t('roleManagement.emptyState')}
        </p>
      )}
      <UserDetailDrawer
        user={selectedUser}
        onClose={handleCloseDrawer}
        onUpdateUser={handleUpdateUser}
        isSaving={isSaving}
      />
      {selectedUser && <div className="fixed inset-0 bg-black/30 z-40" onClick={handleCloseDrawer} />}
    </div>
  );
};

const SuperAdminUserFullEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!id || !isSuperAdmin) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        setOrganization(null);
        setProducts([]);
        setServices([]);
        setDocuments([]);
        setAuditEvents([]);
        const profileRes = await authenticatedRequest<{ data: any }>(`/admin/users/${id}/profile`);
        setProfile(profileRes.data);
        const [userAudit] = await Promise.all([
          authenticatedRequest<{ data?: any[]; logs?: any[] }>(`/admin/audit-logs?entityId=${id}&limit=25`),
        ]);
        const userLogs = (userAudit as any)?.data?.logs ?? (userAudit as any)?.logs ?? [];
        setAuditEvents(userLogs);
        if (profileRes.data?.organization?.id) {
          const orgId = profileRes.data.organization.id;
          const orgRes = await authenticatedRequest<{ data: any }>(`/admin/organizations/${orgId}/profile`);
          setOrganization(orgRes.data);
          const [productsRes, servicesRes, documentsRes] = await Promise.all([
            authenticatedRequest<{ data: any[] }>(`/admin/organizations/${orgId}/products`),
            authenticatedRequest<{ data: any[] }>(`/admin/organizations/${orgId}/services`),
            authenticatedRequest<{ data: any[] }>(`/admin/organizations/${orgId}/documents`),
          ]);
          setProducts(productsRes.data ?? []);
          setServices(servicesRes.data ?? []);
          setDocuments(documentsRes.data ?? []);
          const [orgAudit] = await Promise.all([
            authenticatedRequest<{ data?: any[]; logs?: any[] }>(`/admin/audit-logs?entityId=${orgId}&limit=25`),
          ]);
          const organizationLogs = (orgAudit as any)?.data?.logs ?? (orgAudit as any)?.logs ?? [];
          setAuditEvents((prev) => [...prev, ...organizationLogs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load editable profile');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [authenticatedRequest, id, isSuperAdmin]);

  if (!isSuperAdmin) {
    return <div className="p-6 text-red-600">Only Super Admin can access full edit parity mode.</div>;
  }

  const onSave = async () => {
    if (!id || !profile) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const userPayload = {
        firstName: profile.firstName, lastName: profile.lastName, email: profile.email, contactEmail: profile.contactEmail,
        phoneNumber: profile.phoneNumber, region: profile.region, jobRole: profile.jobRole, cities: profile.cities,
        workExperience: profile.workExperience, education: profile.education, certifications: profile.certifications,
        workExperienceItems: profile.workExperienceItems, educationItems: profile.educationItems, certificationItems: profile.certificationItems,
        skills: profile.skills, availability: profile.availability, cvUrl: profile.cvUrl, shortBio: profile.shortBio,
        candidatePoolVisible: profile.candidatePoolVisible, avatarAssetId: profile.avatarAssetId, coverAssetId: profile.coverAssetId,
      };
      await authenticatedRequest(`/admin/users/${id}/profile`, { method: 'PATCH', body: JSON.stringify(userPayload) });
      if (organization?.id) {
        const orgPayload = {
          name: organization.name, type: organization.type, contactEmail: organization.contactEmail, phoneNumber: organization.phoneNumber,
          contactPerson: organization.contactPerson, region: organization.region, canton: organization.canton, city: organization.city,
          regionsServed: organization.regionsServed, description: organization.description, vatNumber: organization.vatNumber, languages: organization.languages,
          capacity: organization.capacity, pedagogy: organization.pedagogy, productCategory: organization.productCategory,
          minimumOrderQuantity: organization.minimumOrderQuantity, directOrderLink: organization.directOrderLink, catalogUrl: organization.catalogUrl,
          websiteUrl: organization.websiteUrl, serviceType: organization.serviceType, serviceCategories: organization.serviceCategories,
          deliveryType: organization.deliveryType, bookingLink: organization.bookingLink, logoAssetId: organization.logoAssetId, coverAssetId: organization.coverAssetId,
        };
        await authenticatedRequest(`/admin/organizations/${organization.id}/profile`, { method: 'PATCH', body: JSON.stringify(orgPayload) });
      }
      setSuccess('Profile changes saved permanently.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/users/all')} leftIcon={ArrowLeftIcon}>Back to Users</Button>
        <Button variant="primary" onClick={onSave} disabled={isSaving || isLoading}>
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-green-700">{success}</div>}
      {isLoading ? (
        <Card className="p-6">Loading full edit parity profile...</Card>
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Impersonation Mode · User Profile</h2>
            <input className={STANDARD_INPUT_FIELD} value={profile?.firstName ?? ''} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} placeholder="First Name" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.lastName ?? ''} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} placeholder="Last Name" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.email ?? ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.contactEmail ?? ''} onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })} placeholder="Contact Email" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.phoneNumber ?? ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} placeholder="Phone Number" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.region ?? ''} onChange={(e) => setProfile({ ...profile, region: e.target.value })} placeholder="Region" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.jobRole ?? ''} onChange={(e) => setProfile({ ...profile, jobRole: e.target.value })} placeholder="Job Role" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.availability ?? ''} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} placeholder="Availability" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(profile?.candidatePoolVisible)}
                onChange={(e) => setProfile({ ...profile, candidatePoolVisible: e.target.checked })}
              />
              Candidate Pool Visible
            </label>
            <textarea className={STANDARD_INPUT_FIELD} value={profile?.shortBio ?? ''} onChange={(e) => setProfile({ ...profile, shortBio: e.target.value })} placeholder="Short Bio" />
            <textarea className={STANDARD_INPUT_FIELD} value={profile?.workExperience ?? ''} onChange={(e) => setProfile({ ...profile, workExperience: e.target.value })} placeholder="Work Experience" />
            <textarea className={STANDARD_INPUT_FIELD} value={profile?.education ?? ''} onChange={(e) => setProfile({ ...profile, education: e.target.value })} placeholder="Education" />
            <input className={STANDARD_INPUT_FIELD} value={profile?.cvUrl ?? ''} onChange={(e) => setProfile({ ...profile, cvUrl: e.target.value })} placeholder="CV URL" />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.cities ?? JSON.stringify(profile?.cities ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, cities: v }));
                try { setProfile({ ...profile, cities: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Cities JSON (e.g. ["Zurich","Bern"])'
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.skills ?? JSON.stringify(profile?.skills ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, skills: v }));
                try { setProfile({ ...profile, skills: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Skills JSON (e.g. ["Childcare","First Aid"])'
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.certifications ?? JSON.stringify(profile?.certifications ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, certifications: v }));
                try { setProfile({ ...profile, certifications: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Certifications JSON (e.g. ["CPR","Montessori"])'
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.workExperienceItems ?? JSON.stringify(profile?.workExperienceItems ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, workExperienceItems: v }));
                try { setProfile({ ...profile, workExperienceItems: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder="Educator Work Experience Items JSON"
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.educationItems ?? JSON.stringify(profile?.educationItems ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, educationItems: v }));
                try { setProfile({ ...profile, educationItems: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder="Educator Education Items JSON"
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.certificationItems ?? JSON.stringify(profile?.certificationItems ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, certificationItems: v }));
                try { setProfile({ ...profile, certificationItems: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder="Educator Certification Items JSON"
            />
          </Card>
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Organization Profile</h2>
            <input className={STANDARD_INPUT_FIELD} value={organization?.name ?? ''} onChange={(e) => setOrganization({ ...organization, name: e.target.value })} placeholder="Organization Name" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.contactEmail ?? ''} onChange={(e) => setOrganization({ ...organization, contactEmail: e.target.value })} placeholder="Contact Email" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.phoneNumber ?? ''} onChange={(e) => setOrganization({ ...organization, phoneNumber: e.target.value })} placeholder="Phone Number" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.contactPerson ?? ''} onChange={(e) => setOrganization({ ...organization, contactPerson: e.target.value })} placeholder="Contact Person" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.websiteUrl ?? ''} onChange={(e) => setOrganization({ ...organization, websiteUrl: e.target.value })} placeholder="Website URL" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.city ?? ''} onChange={(e) => setOrganization({ ...organization, city: e.target.value })} placeholder="City" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.canton ?? ''} onChange={(e) => setOrganization({ ...organization, canton: e.target.value })} placeholder="Canton" />
            <textarea className={STANDARD_INPUT_FIELD} value={organization?.description ?? ''} onChange={(e) => setOrganization({ ...organization, description: e.target.value })} placeholder="Description" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.capacity ?? ''} onChange={(e) => setOrganization({ ...organization, capacity: Number(e.target.value || 0) })} placeholder="Daycare Capacity" />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.pedagogy ?? JSON.stringify(organization?.pedagogy ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, pedagogy: v }));
                try { setOrganization({ ...organization, pedagogy: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Daycare Pedagogy JSON (e.g. ["Montessori","Play-based"])'
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.languages ?? JSON.stringify(organization?.languages ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, languages: v }));
                try { setOrganization({ ...organization, languages: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Languages JSON (e.g. ["EN","FR","DE"])'
            />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.regionsServed ?? JSON.stringify(organization?.regionsServed ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, regionsServed: v }));
                try { setOrganization({ ...organization, regionsServed: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Regions Served JSON (e.g. ["Zurich","Vaud"])'
            />
            <input className={STANDARD_INPUT_FIELD} value={organization?.serviceType ?? ''} onChange={(e) => setOrganization({ ...organization, serviceType: e.target.value })} placeholder="Service Provider Type" />
            <textarea
              className={STANDARD_INPUT_FIELD}
              value={jsonDrafts.serviceCategories ?? JSON.stringify(organization?.serviceCategories ?? [])}
              onChange={(e) => {
                const v = e.target.value; setJsonDrafts((d) => ({ ...d, serviceCategories: v }));
                try { setOrganization({ ...organization, serviceCategories: JSON.parse(v || '[]') }); } catch {}
              }}
              placeholder='Service Categories JSON (e.g. ["Cleaning","Training"])'
            />
            <input className={STANDARD_INPUT_FIELD} value={organization?.deliveryType ?? ''} onChange={(e) => setOrganization({ ...organization, deliveryType: e.target.value })} placeholder="Service Delivery Type" />
            <input className={STANDARD_INPUT_FIELD} value={organization?.bookingLink ?? ''} onChange={(e) => setOrganization({ ...organization, bookingLink: e.target.value })} placeholder="Booking Link" />
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Phase 2 · Products (Hard Delete)</h2>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded p-2">
                  <div>{p.title}</div>
                  <Button variant="danger" size="xs" onClick={async () => {
                    if (!organization?.id) return;
                    if (!window.confirm(`Permanently delete product "${p.title}"?`)) return;
                    try {
                      await authenticatedRequest(`/admin/organizations/${organization.id}/products/${p.id}`, { method: 'DELETE' });
                      setProducts((prev) => prev.filter((x) => x.id !== p.id));
                    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete product'); }
                  }}>Hard Delete</Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Phase 2 · Services (Hard Delete)</h2>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded p-2">
                  <div>{s.title}</div>
                  <Button variant="danger" size="xs" onClick={async () => {
                    if (!organization?.id) return;
                    if (!window.confirm(`Permanently delete service "${s.title}"?`)) return;
                    try {
                      await authenticatedRequest(`/admin/organizations/${organization.id}/services/${s.id}`, { method: 'DELETE' });
                      setServices((prev) => prev.filter((x) => x.id !== s.id));
                    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete service'); }
                  }}>Hard Delete</Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Phase 2 · Documents (Hard Delete)</h2>
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between border rounded p-2">
                  <div>{d.title || d.documentType}</div>
                  <Button variant="danger" size="xs" onClick={async () => {
                    if (!organization?.id) return;
                    if (!window.confirm(`Permanently delete document "${d.title || d.documentType}"?`)) return;
                    try {
                      await authenticatedRequest(`/admin/organizations/${organization.id}/documents/${d.id}`, { method: 'DELETE' });
                      setDocuments((prev) => prev.filter((x) => x.id !== d.id));
                    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete document'); }
                  }}>Hard Delete</Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Phase 4 · Audit Visibility</h2>
            {auditEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No recent audit events found for this user/organization.</p>
            ) : (
              <div className="space-y-2">
                {auditEvents.map((event, idx) => (
                  <div key={`${event.id || idx}`} className="border rounded p-2 text-sm">
                    <div className="font-medium">{event.action || 'UPDATE'} · {event.entity || 'Unknown entity'}</div>
                    <div className="text-gray-600">{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Unknown time'}</div>
                    {event.actorId && <div className="text-gray-500">Actor: {event.actorId}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};


const UsersPage: React.FC = () => {
  return (
    <Routes>
      <Route path="all" element={<UserListPage />} />
      <Route path="admins" element={<UserListPage roleFilter={UserRole.ADMIN} />} />
      <Route path="foundations" element={<UserListPage roleFilter={UserRole.FOUNDATION} />} />
      <Route path="suppliers" element={<UserListPage roleFilter={UserRole.PRODUCT_SUPPLIER} />} />
      <Route path="service-providers" element={<UserListPage roleFilter={UserRole.SERVICE_PROVIDER} />} />
      <Route path="parents" element={<UserListPage roleFilter={UserRole.PARENT} />} />
      <Route path="full-edit/:id" element={<SuperAdminUserFullEditPage />} />
      <Route index element={<UserListPage />} />
    </Routes>
  );
};

export default UsersPage;
