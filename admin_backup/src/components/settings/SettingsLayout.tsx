import React from 'react'
import { Tab } from '@headlessui/react'
import { Settings as SettingsIcon } from 'lucide-react'
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <SettingsIcon className="h-8 w-8 mr-3 text-swiss-teal" />
          Settings
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your application settings and preferences
        </p>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200">
        <Tab.Group>
          <div className="border-b border-gray-200">
            <Tab.List className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    classNames(
                      'py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
                      selected
                        ? 'border-swiss-teal text-swiss-teal'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )
                  }
                >
                  {tab.name}
                </Tab>
              ))}
            </Tab.List>
          </div>
          
          <Tab.Panels>
            {tabs.map((tab, idx) => (
              <Tab.Panel
                key={idx}
                className="p-6"
              >
                <tab.component />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}

export default SettingsLayout
