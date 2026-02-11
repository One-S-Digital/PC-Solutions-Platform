import React, { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { MailingFilters } from '../../types/api'

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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={() => onChange({ excludeUnsubscribed: true })}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <Section title="Role / Account Type" defaultOpen>
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
                  {SUBSCRIPTION_TIERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        const current = filters.subscriptionTiers || []
                        const next = current.includes(t)
                          ? current.filter((x) => x !== t)
                          : [...current, t]
                        update({ subscriptionTiers: next.length > 0 ? next : undefined })
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        filters.subscriptionTiers?.includes(t)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t}
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

      <Section title="Communication">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={filters.excludeUnsubscribed !== false}
              onChange={(e) => update({ excludeUnsubscribed: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Exclude unsubscribed
          </label>
          <select
            value={filters.marketingOptIn === undefined ? '' : String(filters.marketingOptIn)}
            onChange={(e) =>
              update({ marketingOptIn: e.target.value === '' ? undefined : e.target.value === 'true' })
            }
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any opt-in status</option>
            <option value="true">Marketing opted-in only</option>
            <option value="false">Marketing opted-out only</option>
          </select>
        </div>
      </Section>

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
