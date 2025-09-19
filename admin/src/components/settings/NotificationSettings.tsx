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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure email notifications and SMTP settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
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
                  settings?.notifyNewUsers ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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
                <label className="text-sm font-medium text-gray-700">
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
                  settings?.notifyApplications ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">SMTP Configuration</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700">
                  Notification Email
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  id="notificationEmail"
                  defaultValue={settings?.notificationEmail || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700">
                  SMTP Host
                </label>
                <input
                  type="text"
                  name="smtpHost"
                  id="smtpHost"
                  defaultValue={settings?.smtpHost || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700">
                  SMTP Port
                </label>
                <input
                  type="number"
                  name="smtpPort"
                  id="smtpPort"
                  defaultValue={settings?.smtpPort || 587}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700">
                  SMTP Username
                </label>
                <input
                  type="text"
                  name="smtpUser"
                  id="smtpUser"
                  defaultValue={settings?.smtpUser || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700">
                  SMTP Password
                </label>
                <input
                  type="password"
                  name="smtpPassword"
                  id="smtpPassword"
                  defaultValue={settings?.smtpPassword || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NotificationSettings
