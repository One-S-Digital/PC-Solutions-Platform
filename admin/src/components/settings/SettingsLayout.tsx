import React from 'react'
import { Tab } from '@headlessui/react'
import GeneralSettings from './GeneralSettings'
import BrandingSettings from './BrandingSettings'
import ContentSettings from './ContentSettings'
import NotificationSettings from './NotificationSettings'
import IntegrationSettings from './IntegrationSettings'
import EmailNotificationPage from '../../pages/EmailNotificationPage'
import SystemConfigurationPage from '../../pages/SystemConfigurationPage'

const tabs = [
  { name: 'General', component: GeneralSettings },
  { name: 'Branding', component: BrandingSettings },
  { name: 'Content', component: ContentSettings },
  { name: 'Notifications', component: NotificationSettings },
  { name: 'Integrations', component: IntegrationSettings },
  { name: 'Email Templates', component: EmailNotificationPage },
  { name: 'System Config', component: SystemConfigurationPage },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const SettingsLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your application settings and preferences
            </p>
          </div>

          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                      'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                      selected
                        ? 'bg-white text-blue-700 shadow'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                    )
                  }
                >
                  <span>{tab.name}</span>
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels>
              {tabs.map((tab, idx) => (
                <Tab.Panel
                  key={idx}
                  className="rounded-xl bg-white p-6 shadow-sm ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2"
                >
                  <tab.component />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  )
}

export default SettingsLayout
