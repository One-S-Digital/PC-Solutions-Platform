import React, { useState } from 'react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications' | 'security'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  
  const { user, isLoading, error } = useCurrentUser()

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'organization', label: 'Organization', icon: '🏢' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' }
  ]

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Failed to load settings</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          Settings
        </h1>
        <p className="text-gray-600">
          Manage your account and organization settings.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex">
          {/* Settings Navigation */}
          <div className="w-64 border-r border-gray-200">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Settings</h3>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'profile' | 'organization' | 'notifications' | 'security')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn btn-secondary"
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.firstName || ''}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.lastName || ''}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email || ''}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      defaultValue={user?.phone || ''}
                      disabled={!isEditing}
                      className="input-field"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button className="btn btn-secondary">Cancel</button>
                    <button className="btn btn-primary">Save Changes</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'organization' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Organization Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.organization?.name || ''}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Type
                    </label>
                    <select className="input-field">
                      <option>Daycare Center</option>
                      <option>Preschool</option>
                      <option>After School Program</option>
                      <option>Summer Camp</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      className="input-field"
                      placeholder="Enter organization address"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="btn btn-primary">Save Organization</button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Push Notifications</h4>
                      <p className="text-sm text-gray-600">Receive push notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">Receive SMS updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="btn btn-primary">Save Preferences</button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Change Password</h4>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="input-field"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="input-field"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="input-field"
                      />
                    </div>
                    <button className="btn btn-primary mt-3">Update Password</button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add an extra layer of security to your account
                    </p>
                    <button className="btn btn-secondary">Enable 2FA</button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Active Sessions</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Manage your active login sessions
                    </p>
                    <button className="btn btn-secondary">View Sessions</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage