import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import Card from './design-system/Card'
import LoadingSpinner from './ui/LoadingSpinner'

interface WeeklyPoint { week: string; count: number }
interface HeatmapPoint { day: string; count: number }
interface CohortRow { week: string; size: number; retention: number[] }

interface ClerkOverviewData {
  stats: { active: number; new: number; retained: number; total: number }
  weeklySignups: WeeklyPoint[]
  weeklySignins: WeeklyPoint[]
  activityHeatmap: HeatmapPoint[]
  cohortRetention: CohortRow[]
  lastUpdated: string
}

interface Props {
  data: ClerkOverviewData | null | undefined
  isLoading: boolean
}

function formatWeek(isoDate: string) {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Fill gaps in weekly series so every week in the last 13 has an entry
function fillWeeklySeries(points: WeeklyPoint[], weeks = 13): WeeklyPoint[] {
  const now = new Date()
  const day = now.getUTCDay()
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))

  const map = new Map(points.map(p => [p.week.split('T')[0], p.count]))
  const result: WeeklyPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(currentWeekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    result.push({ week: key, count: map.get(key) ?? 0 })
  }
  return result
}

// Build a full-year grid of day cells (Sun–Sat rows, week columns)
function buildHeatmapGrid(heatmap: HeatmapPoint[]) {
  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const map = new Map(heatmap.map(h => [h.day, h.count]))
  const maxCount = Math.max(1, ...heatmap.map(h => h.count))

  // Build columns = weeks, rows = days of week (0=Sun … 6=Sat)
  const cols: { date: string; count: number; intensity: number }[][] = []
  const startDow = yearStart.getUTCDay() // day-of-week for Jan 1

  let col: { date: string; count: number; intensity: number }[] = []
  // pad first column with empty slots
  for (let i = 0; i < startDow; i++) col.push({ date: '', count: 0, intensity: -1 })

  const daysInYear = ((now.getUTCFullYear() % 4 === 0 && now.getUTCFullYear() % 100 !== 0) || now.getUTCFullYear() % 400 === 0) ? 366 : 365
  for (let d = 0; d < daysInYear; d++) {
    const date = new Date(yearStart.getTime() + d * 86400000)
    if (date > now) break
    const key = date.toISOString().split('T')[0]
    const count = map.get(key) ?? 0
    const intensity = count === 0 ? 0 : Math.ceil((count / maxCount) * 4)
    col.push({ date: key, count, intensity })
    if (col.length === 7) {
      cols.push(col)
      col = []
    }
  }
  if (col.length > 0) {
    while (col.length < 7) col.push({ date: '', count: 0, intensity: -1 })
    cols.push(col)
  }
  return cols
}

const INTENSITY_COLORS = [
  'bg-gray-100',        // 0 — no activity
  'bg-indigo-100',      // 1
  'bg-indigo-300',      // 2
  'bg-indigo-500',      // 3
  'bg-indigo-700',      // 4
]

function intensityColor(intensity: number) {
  if (intensity < 0) return 'bg-transparent'
  return INTENSITY_COLORS[Math.min(intensity, 4)]
}

function retentionColor(pct: number) {
  if (pct === 0) return 'bg-gray-100 text-gray-400'
  if (pct < 20) return 'bg-indigo-100 text-indigo-700'
  if (pct < 40) return 'bg-indigo-200 text-indigo-800'
  if (pct < 60) return 'bg-indigo-400 text-white'
  if (pct < 80) return 'bg-indigo-600 text-white'
  return 'bg-indigo-800 text-white'
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const UserAnalyticsSection: React.FC<Props> = ({ data, isLoading }) => {
  const { t } = useTranslation('admin')
  const signupsData = useMemo(() => fillWeeklySeries(data?.weeklySignups ?? []), [data])
  const signinsData = useMemo(() => fillWeeklySeries(data?.weeklySignins ?? []), [data])

  // Merge signups + signins into a single weekly series for the main bar chart
  const combinedWeekly = useMemo(() => {
    return signupsData.map((s, i) => ({
      week: s.week,
      signups: s.count,
      signins: signinsData[i]?.count ?? 0,
    }))
  }, [signupsData, signinsData])

  const heatmapCols = useMemo(() => buildHeatmapGrid(data?.activityHeatmap ?? []), [data])

  // Month label positions: find first column where month changes
  const monthPositions = useMemo(() => {
    const positions: { label: string; col: number }[] = []
    let lastMonth = -1
    heatmapCols.forEach((col, i) => {
      const firstValid = col.find(c => c.date !== '')
      if (!firstValid) return
      const month = new Date(firstValid.date).getUTCMonth()
      if (month !== lastMonth) {
        positions.push({ label: MONTH_LABELS[month], col: i })
        lastMonth = month
      }
    })
    return positions
  }, [heatmapCols])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-40">
          <LoadingSpinner size="medium" />
        </div>
      </Card>
    )
  }

  if (!data) return null

  const { stats, cohortRetention } = data
  const currentWeek = combinedWeekly[combinedWeekly.length - 1]

  const statCards = [
    { label: t('dashboard.userAnalytics.stats.active'), value: stats.active, sub: t('dashboard.userAnalytics.stats.thisWeek') },
    { label: t('dashboard.userAnalytics.stats.new'), value: stats.new, sub: t('dashboard.userAnalytics.stats.thisWeek') },
    { label: t('dashboard.userAnalytics.stats.retained'), value: stats.retained, sub: t('dashboard.userAnalytics.stats.thisWeek') },
    { label: t('dashboard.userAnalytics.stats.totalSignups'), value: stats.total, sub: t('dashboard.userAnalytics.stats.allTime') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-swiss-charcoal">{t('dashboard.userAnalytics.title')}</h2>
        <span className="text-xs text-gray-400">
          {t('dashboard.userAnalytics.updated', { time: new Date(data.lastUpdated).toLocaleTimeString() })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold text-swiss-charcoal mt-1">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Main weekly bar chart */}
      <Card className="p-6">
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> {t('dashboard.userAnalytics.chart.signups')}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200" /> {t('dashboard.userAnalytics.chart.signins')}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={combinedWeekly} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeek}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              labelFormatter={v => t('dashboard.userAnalytics.chart.weekOf', { date: formatWeek(String(v)) })}
              formatter={(value: number, name: string) => [value, name === 'signups' ? t('dashboard.userAnalytics.chart.signups') : t('dashboard.userAnalytics.chart.signins')]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="signups" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="signins" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Mini charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.userAnalytics.miniCharts.signupsPerWeek')}</p>
          <p className="text-2xl font-bold text-swiss-charcoal mt-1">{currentWeek?.signups ?? 0}</p>
          <p className="text-xs text-gray-400 mb-3">{t('dashboard.userAnalytics.stats.thisWeek')}</p>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={signupsData}>
              <defs>
                <linearGradient id="suGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#suGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.userAnalytics.miniCharts.signinsPerWeek')}</p>
          <p className="text-2xl font-bold text-swiss-charcoal mt-1">{currentWeek?.signins ?? 0}</p>
          <p className="text-xs text-gray-400 mb-3">{t('dashboard.userAnalytics.stats.thisWeek')}</p>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={signinsData}>
              <defs>
                <linearGradient id="siGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#siGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.userAnalytics.stats.totalSignups')}</p>
          <p className="text-2xl font-bold text-swiss-charcoal mt-1">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mb-3">{t('dashboard.userAnalytics.stats.allTime')}</p>
          {/* Cumulative growth line */}
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart
              data={signupsData.reduce<{ week: string; cumulative: number }[]>((acc, p) => {
                const prev = acc[acc.length - 1]?.cumulative ?? (stats.total - signupsData.reduce((s, x) => s + x.count, 0))
                acc.push({ week: p.week, cumulative: prev + p.count })
                return acc
              }, [])}
            >
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} fill="url(#totalGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Activity heatmap */}
      <Card className="p-6">
        <p className="text-sm font-semibold text-swiss-charcoal mb-4">{t('dashboard.userAnalytics.heatmap.title', { year: new Date().getUTCFullYear() })}</p>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-0.5">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              <div className="h-4" /> {/* spacer for month labels */}
              {DOW_LABELS.map((d, i) => (
                <div key={i} className="h-3 w-4 text-[9px] text-gray-400 flex items-center justify-end pr-1 leading-none">
                  {i % 2 === 1 ? d : ''}
                </div>
              ))}
            </div>
            {/* Week columns */}
            {heatmapCols.map((col, ci) => {
              const monthPos = monthPositions.find(m => m.col === ci)
              return (
                <div key={ci} className="flex flex-col gap-0.5">
                  <div className="h-4 text-[9px] text-gray-400 whitespace-nowrap leading-4">
                    {monthPos ? monthPos.label : ''}
                  </div>
                  {col.map((cell, ri) => (
                    <div
                      key={ri}
                      title={cell.date ? `${cell.date}: ${cell.count} active user${cell.count !== 1 ? 's' : ''}` : ''}
                      className={`w-3 h-3 rounded-sm ${intensityColor(cell.intensity)}`}
                    />
                  ))}
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
            <span>{t('dashboard.userAnalytics.heatmap.less')}</span>
            {INTENSITY_COLORS.map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span>{t('dashboard.userAnalytics.heatmap.more')}</span>
          </div>
        </div>
      </Card>

      {/* Cohort retention table */}
      {cohortRetention.length > 0 && (
        <Card className="p-6">
          <p className="text-sm font-semibold text-swiss-charcoal mb-1">{t('dashboard.userAnalytics.cohort.title')}</p>
          <p className="text-xs text-gray-400 mb-4">{t('dashboard.userAnalytics.cohort.subtitle')}</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left font-medium text-gray-500 pb-2 pr-4 whitespace-nowrap">{t('dashboard.userAnalytics.cohort.cohortWeek')}</th>
                  <th className="text-right font-medium text-gray-500 pb-2 pr-3 whitespace-nowrap">{t('dashboard.userAnalytics.cohort.size')}</th>
                  {Array.from({ length: 9 }, (_, i) => (
                    <th key={i} className="text-center font-medium text-gray-500 pb-2 px-1 whitespace-nowrap">
                      W{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortRetention.map(row => (
                  <tr key={row.week}>
                    <td className="pr-4 py-0.5 text-gray-600 whitespace-nowrap">{formatWeek(row.week)}</td>
                    <td className="pr-3 py-0.5 text-right text-gray-500">{row.size}</td>
                    {row.retention.map((pct, wi) => (
                      <td key={wi} className="px-1 py-0.5">
                        <div className={`rounded px-1 py-0.5 text-center font-medium ${retentionColor(pct)}`}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default UserAnalyticsSection
