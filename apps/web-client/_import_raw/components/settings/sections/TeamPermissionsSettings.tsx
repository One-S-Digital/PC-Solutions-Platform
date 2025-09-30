

// Implement TeamPermissionsSettings.tsx
// Placeholder - This will be implemented in subsequent steps.
import React, { useState } from 'react';
import { SettingsFormData, UserRole, TeamMember } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { UsersIcon, PlusCircleIcon, EnvelopeIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import { useTranslation } from 'react-i18next';

interface TeamPermissionsSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const TeamPermissionsSettings: React.FC<TeamPermissionsSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Viewer' | 'Editor'>('Viewer');

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      email: inviteEmail,
      role: userRole === UserRole.PRODUCT_SUPPLIER ? 'Editor' : inviteRole, // Suppliers get Editor by default as per spec
      status: 'Pending',
    };
    const updatedMembers = [...(settings.teamMembers || []), newMember];
    onChange('teamMembers', updatedMembers);
    setInviteEmail('');
    // Potentially send an actual invite email here
  };
  
  const handleRemoveMember = (memberId: string) => {
     if (window.confirm(t('settingsTeamPermissions.confirmRemoveMember'))) {
        const updatedMembers = (settings.teamMembers || []).filter(m => m.id !== memberId);
        onChange('teamMembers', updatedMembers);
    }
  };
  
  const handleResetPassword = (memberId: string) => {
      alert(t('settingsTeamPermissions.passwordResetSentAlert', { memberId }));
  };

  const memberRoleOptions: { value: 'Viewer' | 'Editor', labelKey: string }[] = userRole === UserRole.PRODUCT_SUPPLIER 
    ? [{ value: 'Editor', labelKey: 'settingsTeamPermissions.roles.editor' }] 
    : [
        { value: 'Viewer', labelKey: 'settingsTeamPermissions.roles.viewer' }, 
        { value: 'Editor', labelKey: 'settingsTeamPermissions.roles.editor' }
      ];


  return (
    <SettingsSectionWrapper title={t('settingsPage.teamPermissions')} icon={UsersIcon}>
      <form onSubmit={handleInviteMember} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-md font-semibold text-swiss-charcoal mb-2">{t('settingsTeamPermissions.inviteNewMember')}</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-grow">
            <label htmlFor="inviteEmail" className="block text-xs font-medium text-gray-500 mb-1">{t('settingsTeamPermissions.emailAddress')}</label>
            <input
              type="email"
              id="inviteEmail"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settingsTeamPermissions.emailPlaceholder')}
              required
            />
          </div>
          {userRole === UserRole.SERVICE_PROVIDER && ( // Role selection only for Service Provider as per simplified spec
            <div>
                <label htmlFor="inviteRole" className="block text-xs font-medium text-gray-500 mb-1">{t('settingsTeamPermissions.role')}</label>
                <select 
                    id="inviteRole" 
                    value={inviteRole} 
                    onChange={(e) => setInviteRole(e.target.value as 'Viewer' | 'Editor')} 
                    className={STANDARD_INPUT_FIELD}
                >
                    {memberRoleOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                </select>
            </div>
          )}
          <Button type="submit" variant="secondary" leftIcon={PlusCircleIcon} className="w-full sm:w-auto">
            {t('settingsTeamPermissions.sendInvite')}
          </Button>
        </div>
      </form>

      <h3 className="text-md font-semibold text-swiss-charcoal mb-3">{t('settingsTeamPermissions.currentTeamMembers')}</h3>
      {(settings.teamMembers || []).length === 0 ? (
        <p className="text-gray-500">{t('settingsTeamPermissions.noTeamMembers')}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsTeamPermissions.table.email')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsTeamPermissions.table.role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsTeamPermissions.table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('settingsTeamPermissions.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(settings.teamMembers || []).map(member => (
                <tr key={member.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{member.role === 'Editor' ? t('settingsTeamPermissions.roles.editor') : t('settingsTeamPermissions.roles.viewer')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="ghost" size="xs" onClick={() => handleResetPassword(member.id)} title={t('settingsTeamPermissions.resetPasswordTooltip')}>
                        <ArrowPathIcon className="w-4 h-4"/>
                    </Button>
                    <Button variant="ghost" size="xs" className="text-swiss-coral" onClick={() => handleRemoveMember(member.id)} title={t('settingsTeamPermissions.removeMemberTooltip')}>
                        <TrashIcon className="w-4 h-4"/>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsSectionWrapper>
  );
};

export default TeamPermissionsSettings;