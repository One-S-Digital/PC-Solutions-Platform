import React from 'react'
import { Tab } from '@headlessui/react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import GeneralSettings from './GeneralSettings'
import BrandingSettings from './BrandingSettings'
import ContentSettings from './ContentSettings'
import NotificationSettings from './NotificationSettings'
import IntegrationSettings from './IntegrationSettings'
import EmailNotificationPage from '../../pages/EmailNotificationPage'
import SystemConfigurationPage from '../../pages/SystemConfigurationPage'
import SystemMonitorPage from '../../pages/SystemMonitor'
import DesignSystemPage from '../../pages/DesignSystem'
import TranslationsPage from '../../pages/Translations'

const SettingsLayout: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const location = useLocation()
  const navigate = useNavigate()
  
  const tabs = React.useMemo(() => [
    { name: t('admin:settings.tabs.general'), key: 'general', component: GeneralSettings },
    { name: t('admin:settings.tabs.branding'), key: 'branding', component: BrandingSettings },
    { name: t('admin:settings.tabs.content'), key: 'content', component: ContentSettings },
    { name: t('admin:settings.tabs.notifications'), key: 'notifications', component: NotificationSettings },
    { name: t('admin:settings.tabs.integrations'), key: 'integrations', component: IntegrationSettings },
    { name: t('admin:settings.tabs.emailTemplates'), key: 'emailTemplates', component: EmailNotificationPage },
    { name: t('admin:settings.tabs.systemConfig'), key: 'systemConfig', component: SystemConfigurationPage },
    {
      name: t('admin:sidebar.systemMonitoring', { defaultValue: 'System Monitoring' }),
      key: 'systemMonitoring',
      component: SystemMonitorPage,
    },
    {
      name: t('admin:settings.tabs.designSystem', { defaultValue: 'Design System' }),
      key: 'designSystem',
      component: DesignSystemPage,
    },
    {
      name: t('admin:settings.tabs.translations', { defaultValue: 'Translations' }),
      key: 'translations',
      component: TranslationsPage,
    },
  ], [t])

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

  const selectedIndex = React.useMemo(() => {
    const params = new URLSearchParams(location.search)
    const tabKey = params.get('tab')
    if (!tabKey) return 0
    const idx = tabs.findIndex((t) => t.key === tabKey)
    return idx >= 0 ? idx : 0
  }, [location.search, tabs])

  const handleTabChange = (idx: number) => {
    const tabKey = tabs[idx]?.key
    const params = new URLSearchParams(location.search)
    if (tabKey) params.set('tab', tabKey)
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <SettingsIcon className="h-8 w-8 mr-3 text-swiss-teal" />
          {t('admin:settings.title')}
        </h1>
        <p className="mt-1 text-gray-500">
          {t('admin:settings.subtitle')}
        </p>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-card shadow-soft border border-gray-200">
        <Tab.Group selectedIndex={selectedIndex} onChange={handleTabChange}>
          <div className="border-b border-gray-200">
            <Tab.List className="flex flex-wrap gap-x-8 gap-y-2 px-6">
              {tabs.map((tab) => (
                <Tab
                  key={tab.key}
                  className={({ selected }) =>
                    classNames(
                      'py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap',
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
                <Tab.Panel key={idx} className="p-6">
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
