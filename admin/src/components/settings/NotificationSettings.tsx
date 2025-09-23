import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import LoadingSpinner from '../ui/LoadingSpinner'

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings, loading, error, saving } = useSettings()

  const handleToggle = async (setting: string, value: boolean) => {
    await updateSettings({
      [setting]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    await updateSettings({
      notificationEmail: formData.get('notificationEmail') as string,
      smtpHost: formData.get('smtpHost') as string,
      smtpPort: parseInt(formData.get('smtpPort') as string) || 587,
      smtpUser: formData.get('smtpUser') as string,
      smtpPassword: formData.get('smtpPassword') as string,
    })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-swiss-charcoal">Notification Settings</h3>
        <p className="mt-1 text-gray-500">
          Configure email notifications and SMTP settings
        </p>
      </div>

      {error && (
        <div className="rounded-card bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">Email Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-swiss-charcoal">
                  New User Registrations
                </label>
                <p className="text-sm text-gray-500">
                  Get notified when new users register
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('notifyNewUsers', !settings?.notifyNewUsers)}
                className={`${
                  settings?.notifyNewUsers ? 'bg-swiss-teal' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2`}
              >
                <span
                  className={`${
                    settings?.notifyNewUsers ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-swiss-charcoal">
                  Application Submissions
                </label>
                <p className="text-sm text-gray-500">
                  Get notified when applications are submitted
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('notifyApplications', !settings?.notifyApplications)}
                className={`${
                  settings?.notifyApplications ? 'bg-swiss-teal' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2`}
              >
                <span
                  className={`${
                    settings?.notifyApplications ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SMTP Configuration */}
        <div className="bg-white rounded-card shadow-soft border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-swiss-charcoal mb-6">SMTP Configuration</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="notificationEmail" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  id="notificationEmail"
                  defaultValue={settings?.notificationEmail || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="notifications@example.com"
                />
              </div>

              <div>
                <label htmlFor="smtpHost" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  name="smtpHost"
                  id="smtpHost"
                  defaultValue={settings?.smtpHost || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label htmlFor="smtpPort" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  name="smtpPort"
                  id="smtpPort"
                  defaultValue={settings?.smtpPort || 587}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="587"
                />
              </div>

              <div>
                <label htmlFor="smtpUser" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  name="smtpUser"
                  id="smtpUser"
                  defaultValue={settings?.smtpUser || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div>
                <label htmlFor="smtpPassword" className="block text-sm font-medium text-swiss-charcoal mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  name="smtpPassword"
                  id="smtpPassword"
                  defaultValue={settings?.smtpPassword || ''}
                  className="block w-full rounded-input border-gray-300 shadow-sm focus:border-swiss-teal focus:ring-swiss-teal sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center rounded-button bg-swiss-teal py-2.5 px-6 text-sm font-medium text-white shadow-soft hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save SMTP Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
