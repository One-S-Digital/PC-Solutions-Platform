import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Content() {
  const { t } = useTranslation(['admin', 'common'])

  const tabBase = 'px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap'
  const tabActive = 'bg-swiss-mint/10 text-swiss-mint border-swiss-mint/30'
  const tabInactive = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin:content.title', 'Content Management')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('admin:content.description', 'Upload and manage e-learning materials, HR documents, and state policies')}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            <NavLink
              to="hr-documents"
              className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
            >
              {t('admin:content.hrDocuments.title', 'HR Documents')}
            </NavLink>
            <NavLink
              to="state-policies"
              className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
            >
              {t('admin:content.statePolicies.title', 'State Policies')}
            </NavLink>
          </div>
        </div>

        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

