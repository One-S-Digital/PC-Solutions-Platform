
import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { ALL_USERS_MOCK, ICON_INPUT_FIELD, STANDARD_INPUT_FIELD } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UsersIcon, MagnifyingGlassIcon, FunnelIcon, EyeIcon, PencilIcon, ShieldExclamationIcon, ChevronRightIcon, PlusIcon, ArrowUturnLeftIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext'; 
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface UserRowProps {
  user: User;
  onUserSelect: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  isSuperAdmin: boolean;
}

const UserRow: React.FC<UserRowProps> = ({ user, onUserSelect, onDeleteUser, isSuperAdmin }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const statusColors = {
    Active: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Inactive: 'bg-red-100 text-red-700',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (currentUser?.id === user.id) {
      alert(t('usersPage.cannotDeleteOwnAccount'));
      return;
    }
    onDeleteUser(user.id);
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUserSelect(user); // Opens drawer, drawer will handle edit specific logic
  };


  return (
    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onUserSelect(user)}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <img className="h-10 w-10 rounded-full" src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=48CFAE&color=fff`} alt={user.name} />
          <div className="ml-4">
            <div className="text-sm font-medium text-swiss-charcoal">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t(`userRoles.${user.role}`, user.role)}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[user.status || 'Pending']}`}>
          {user.status ? t(`usersPage.status.${user.status.toLowerCase()}`, user.status) : t('usersPage.status.pending', 'Pending')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.region || 'N/A'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isSuperAdmin ? (
          <div className="flex space-x-2 justify-end">
            <Button variant="ghost" size="xs" onClick={handleEdit} leftIcon={PencilIcon}>{t('buttons.edit')}</Button>
            {currentUser?.id !== user.id && (
              <Button variant="ghost" size="xs" onClick={handleDelete} leftIcon={TrashIcon} className="text-red-600 hover:text-red-700">{t('buttons.delete')}</Button>
            )}
          </div>
        ) : (
           <Button variant="ghost" size="sm" onClick={(e) => {e.stopPropagation(); onUserSelect(user);}}>{t('buttons.view')}</Button>
        )}
      </td>
    </tr>
  );
};

interface UserDetailDrawerProps {
    user: User | null;
    onClose: () => void;
    onUpdateUser: (updatedUser: User) => void;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ user, onClose, onUpdateUser }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
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


  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-1/3 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out"
         style={{ transform: user ? 'translateX(0)' : 'translateX(100%)' }}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('usersPage.userDetailDrawer.title')}</h2>
          <Button variant="ghost" onClick={onClose}>{t('buttons.close')}</Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=48CFAE&color=fff`} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4" />
          <p className="text-center text-lg font-medium">{user.name}</p>
          <p className="text-center text-sm text-gray-500 mb-4">{user.email}</p>
          
          <div className="space-y-2 text-sm">
            <p><strong>{t('usersPage.userDetailDrawer.roleLabel')}</strong> {t(`userRoles.${user.role}`, user.role)}</p>
            <p><strong>{t('usersPage.userDetailDrawer.statusLabel')}</strong> {user.status ? t(`usersPage.status.${user.status.toLowerCase()}`, user.status) : 'N/A'}</p>
            <p><strong>{t('usersPage.userDetailDrawer.regionLabel')}</strong> {user.region || 'N/A'}</p>
            <p><strong>{t('usersPage.userDetailDrawer.lastLoginLabel')}</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</p>
            {user.orgName && <p><strong>{t('usersPage.userDetailDrawer.orgLabel')}</strong> {user.orgName}</p>}
          </div>

          { isSuperAdmin && (
            <div className="mt-6 border-t pt-4">
                <h3 className="text-md font-semibold mb-2">{t('usersPage.userDetailDrawer.adminActionsTitle')}</h3>
                 {canPerformActions ? (
                    <>
                        <div className="mb-3">
                            <label htmlFor="roleSelect" className="block text-xs font-medium text-gray-500 mb-1">{t('usersPage.userDetailDrawer.changeRoleLabel')}</label>
                            <select 
                                id="roleSelect"
                                value={selectedRole} 
                                onChange={(e) => setSelectedRole(e.target.value as UserRole)} 
                                className={`${STANDARD_INPUT_FIELD} w-full mb-2`}
                            > 
                                {Object.values(UserRole).map(r => <option key={r} value={r}>{t(`userRoles.${r}`, r)}</option>)}
                            </select>
                            <Button variant="secondary" className="w-full" onClick={handleRoleUpdate}>{t('usersPage.userDetailDrawer.updateRoleButton')}</Button>
                        </div>
                        {user.status === 'Active' ? (
                            <Button variant="danger" className="w-full" onClick={() => handleStatusUpdate('Inactive')} leftIcon={XCircleIcon}>{t('usersPage.userDetailDrawer.suspendUserButton')}</Button>
                        ) : (
                            <Button variant="primary" className="w-full" onClick={() => handleStatusUpdate('Active')} leftIcon={CheckCircleIcon}>{t('usersPage.userDetailDrawer.activateUserButton')}</Button>
                        )}
                    </>
                 ) : (
                    <p className="text-xs text-gray-500 italic">{t('usersPage.userDetailDrawer.cannotModifyOwnAccount')}</p>
                 )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const UserListPage: React.FC<{ roleFilter?: UserRole }> = ({ roleFilter }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const [usersData, setUsersData] = useState<User[]>(() => 
    JSON.parse(JSON.stringify(ALL_USERS_MOCK))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const pageTitle = roleFilter ? t('usersPage.rolePageTitle', { role: t(`userRoles.${roleFilter}`, roleFilter) }) : t('usersPage.allUsersTitle');
  
  const filteredUsers = useMemo(() => {
    return usersData.filter(user =>
      (!roleFilter || user.role === roleFilter) &&
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (user.region && user.region.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [searchTerm, roleFilter, usersData]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };
  
  const handleCloseDrawer = () => {
    setSelectedUser(null);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm(t('usersPage.confirmDeleteUser'))) {
        setUsersData(currentUsers => currentUsers.filter(user => user.id !== userId));
        if (selectedUser?.id === userId) {
            setSelectedUser(null); 
        }
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsersData(currentUsers => currentUsers.map(user => user.id === updatedUser.id ? updatedUser : user));
    setSelectedUser(updatedUser); 
    alert(t('usersPage.userProfileUpdated', { name: updatedUser.name }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{pageTitle}</h1>
        { currentUser?.role === UserRole.SUPER_ADMIN && (
          <Button variant="primary" leftIcon={PlusIcon} onClick={() => alert(t('usersPage.addNewUserTBD'))}>{t('usersPage.addNewUserButton')}</Button>
        )}
      </div>
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                type="text"
                placeholder={t('usersPage.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={ICON_INPUT_FIELD} 
                />
            </div>
            <Button variant="outline" leftIcon={FunnelIcon} onClick={() => alert(t('usersPage.filtersTBD'))}>{t('usersPage.filtersButton')}</Button>
        </div>
      </Card>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('usersPage.table.nameOrg')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('usersPage.table.role')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('usersPage.table.status')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('usersPage.table.region')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('usersPage.table.lastLogin')}</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('usersPage.table.actions')}</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <UserRow 
                key={user.id} 
                user={user} 
                onUserSelect={handleUserSelect} 
                onDeleteUser={handleDeleteUser}
                isSuperAdmin={currentUser?.role === UserRole.SUPER_ADMIN}
              />
            ))}
          </tbody>
        </table>
      </div>
      {filteredUsers.length === 0 && <p className="text-center text-gray-500 py-8">{t('usersPage.emptyState')}</p>}
      <UserDetailDrawer user={selectedUser} onClose={handleCloseDrawer} onUpdateUser={handleUpdateUser} />
      {selectedUser && <div className="fixed inset-0 bg-black/30 z-40" onClick={handleCloseDrawer}></div>}
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
        <Route index element={<UserListPage />} /> {/* Default to all users */}
      </Routes>
  );
};

export default UsersPage;
