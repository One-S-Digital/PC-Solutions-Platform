import React, { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { MailingFilters } from '../../types/api'
import { useTranslation } from 'react-i18next'

const ROLES = [
  { value: 'FOUNDATION', label: 'Foundation / Daycare' },
  { value: 'PRODUCT_SUPPLIER', label: 'Supplier' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider' },
  { value: 'EDUCATOR', label: 'Educator' },
  { value: 'PARENT', label: 'Parent' },
]

const SUBSCRIPTION_STATUSES = [
  'ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'PAUSED', 'PENDING', 'GRACE_PERIOD',
]

const EDUCATOR_APPROVAL_STATUSES = [
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const SUBSCRIPTION_TIERS = ['BASIC', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE']

interface Props {
  filters: MailingFilters
  onChange: (filters: MailingFilters) => void
}

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-3 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

const MailingFilterPanel: React.FC<Props> = ({ filters, onChange }) => {
  const { t } = useTranslation(['admin'])

  const update = (partial: Partial<MailingFilters>) => {
    onChange({ ...filters, ...partial })
  }

  const toggleRole = (role: string) => {
    const current = filters.roles || []
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    update({ roles: next.length > 0 ? next : undefined })
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && k !== 'excludeUnsubscribed',
  ).length

  // Derive audience mode from current filter state
  const audienceMode: 'all' | 'subscribed' | 'unsubscribed' =
    filters.marketingOptIn === false
      ? 'unsubscribed'
      : filters.excludeUnsubscribed === true
        ? 'subscribed'
        : 'all'

  const setAudienceMode = (mode: 'all' | 'subscribed' | 'unsubscribed') => {
    switch (mode) {
      case 'all':
        update({ excludeUnsubscribed: false, marketingOptIn: undefined })
        break
      case 'subscribed':
        update({ excludeUnsubscribed: true, marketingOptIn: undefined })
        break
      case 'unsubscribed':
        update({ excludeUnsubscribed: false, marketingOptIn: false })
        break
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{t('admin:mailing.filters.title', 'Filters')}</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={() => onChange({ excludeUnsubscribed: false })}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> {t('admin:mailing.filters.clearAll', 'Clear all')}
          </button>
        )}
      </div>

      {/* Audience type — always visible at top */}
      <Section title={t('admin:mailing.filters.audience', 'Audience')} defaultOpen>
        <div className="space-y-1.5">
          {([
            {
              value: 'all' as const,
              label: t('admin:mailing.filters.audienceAll', 'All users'),
              desc: t('admin:mailing.filters.audienceAllDesc', 'Broadcasts, service notices, required updates'),
            },
            {
              value: 'subscribed' as const,
              label: t('admin:mailing.filters.audienceSubscribed', 'Newsletter subscribers'),
              desc: t('admin:mailing.filters.audienceSubscribedDesc', 'Only users who opted in to marketing'),
            },
            {
              value: 'unsubscribed' as const,
              label: t('admin:mailing.filters.audienceUnsubscribed', 'Unsubscribed only'),
              desc: t('admin:mailing.filters.audienceUnsubscribedDesc', 'Users who opted out of marketing'),
            },
          ]).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 -mx-2 transition-colors ${
                audienceMode === opt.value ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="audienceMode"
                checked={audienceMode === opt.value}
                onChange={() => setAudienceMode(opt.value)}
                className="mt-0.5 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className={`font-medium ${audienceMode === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {audienceMode === 'all' && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            {t('admin:mailing.filters.audienceAllWarning', 'Includes users who opted out of marketing emails. Use for essential service communications only.')}
          </div>
        )}
      </Section>

      <Section title={t('admin:mailing.filters.role', 'Role / Account Type')} defaultOpen>
        <div className="space-y-1.5">
          {ROLES.map((role) => (
            <label key={role.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.roles?.includes(role.value) || false}
                onChange={() => toggleRole(role.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {role.label}
            </label>
          ))}
        </div>
      </Section>

      {/* Show educator approval filter only when EDUCATOR role is selected, or no role filter is set */}
      {(!filters.roles?.length || filters.roles.includes('EDUCATOR')) && (
        <Section title={t('admin:mailing.filters.educatorApproval', 'Educator Approval Status')} defaultOpen={filters.educatorApprovalStatuses !== undefined}>
          <p className="text-xs text-gray-500 mb-2">
            {t('admin:mailing.filters.educatorApprovalDesc', 'Filter by profile approval status (applies to Educator accounts only)')}
          </p>
          <div className="space-y-1.5">
            {EDUCATOR_APPROVAL_STATUSES.map((status) => (
              <label key={status.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.educatorApprovalStatuses?.includes(status.value) || false}
                  onChange={() => {
                    const current = filters.educatorApprovalStatuses || []
                    const next = current.includes(status.value)
                      ? current.filter((s) => s !== status.value)
                      : [...current, status.value]
                    update({ educatorApprovalStatuses: next.length > 0 ? next : undefined })
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`inline-flex items-center gap-1 ${
                    status.value === 'APPROVED'
                      ? 'text-green-700'
                      : status.value === 'REJECTED'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  }`}
                >
                  {status.label}
                </span>
              </label>
            ))}
          </div>
          {filters.educatorApprovalStatuses?.length ? (
            <button
              onClick={() => update({ educatorApprovalStatuses: undefined })}
              className="mt-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {t('admin:mailing.filters.clearSelection', 'Clear selection')}
            </button>
          ) : null}
        </Section>
      )}

      <Section title="Account Status">
        <div className="space-y-1.5">
          {[
            { label: 'All', value: undefined },
            { label: 'Active only', value: true },
            { label: 'Inactive only', value: false },
          ].map((opt) => (
            <label key={String(opt.value)} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="radio"
                name="isActive"
                checked={filters.isActive === opt.value}
                onChange={() => update({ isActive: opt.value })}
                className="border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Subscription">
        <div className="space-y-2">
          <select
            value={filters.hasSubscription === undefined ? '' : String(filters.hasSubscription)}
            onChange={(e) =>
              update({ hasSubscription: e.target.value === '' ? undefined : e.target.value === 'true' })
            }
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any</option>
            <option value="true">Has subscription</option>
            <option value="false">No subscription</option>
          </select>
          {filters.hasSubscription !== false && (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <div className="flex flex-wrap gap-1">
                  {SUBSCRIPTION_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const current = filters.subscriptionStatuses || []
                        const next = current.includes(s)
                          ? current.filter((x) => x !== s)
                          : [...current, s]
                        update({ subscriptionStatuses: next.length > 0 ? next : undefined })
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        filters.subscriptionStatuses?.includes(s)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tier</label>
                <div className="flex flex-wrap gap-1">
                  {SUBSCRIPTION_TIERS.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => {
                        const current = filters.subscriptionTiers || []
                        const next = current.includes(tier)
                          ? current.filter((x) => x !== tier)
                          : [...current, tier]
                        update({ subscriptionTiers: next.length > 0 ? next : undefined })
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        filters.subscriptionTiers?.includes(tier)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Location & Language">
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cantons (comma-separated)</label>
            <input
              type="text"
              placeholder="VD, GE, FR..."
              value={filters.cantons?.join(', ') || ''}
              onChange={(e) => {
                const vals = e.target.value
                  .split(',')
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean)
                update({ cantons: vals.length > 0 ? vals : undefined })
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cities (comma-separated)</label>
            <input
              type="text"
              placeholder="Lausanne, Geneva..."
              value={filters.cities?.join(', ') || ''}
              onChange={(e) => {
                const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                update({ cities: vals.length > 0 ? vals : undefined })
              }}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Languages</label>
            <div className="flex gap-2">
              {['FR', 'DE', 'EN'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const current = filters.languages || []
                    const next = current.includes(lang)
                      ? current.filter((l) => l !== lang)
                      : [...current, lang]
                    update({ languages: next.length > 0 ? next : undefined })
                  }}
                  className={`text-xs px-3 py-1 rounded border ${
                    filters.languages?.includes(lang)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Communication section replaced by Audience selector at top */}

      <Section title="Date Ranges">
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Created after</label>
            <input
              type="date"
              value={filters.createdFrom?.slice(0, 10) || ''}
              onChange={(e) => update({ createdFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Created before</label>
            <input
              type="date"
              value={filters.createdTo?.slice(0, 10) || ''}
              onChange={(e) => update({ createdTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Last active after</label>
            <input
              type="date"
              value={filters.lastActiveFrom?.slice(0, 10) || ''}
              onChange={(e) => update({ lastActiveFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </Section>

      <Section title="Search">
        <input
          type="text"
          placeholder="Search email, name..."
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
        />
      </Section>
    </div>
  )
}

export default MailingFilterPanel
