const STORAGE_KEY = 'adminNotificationState.v1'
const EXPIRY_DAYS = 7
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000
export const NOTIFICATION_STATE_EVENT = 'notificationStateChanged'

type NotificationState = {
  lastVisited: Record<string, string>
  dismissed: Record<string, Record<string, string>>
}

const isBrowser = () => typeof window !== 'undefined'

const getEmptyState = (): NotificationState => ({
  lastVisited: {},
  dismissed: {},
})

const loadState = (): NotificationState => {
  if (!isBrowser()) return getEmptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return getEmptyState()
    const parsed = JSON.parse(raw) as NotificationState
    return {
      lastVisited: parsed?.lastVisited ?? {},
      dismissed: parsed?.dismissed ?? {},
    }
  } catch {
    return getEmptyState()
  }
}

const saveState = (state: NotificationState) => {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

const notifyStateChanged = () => {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(NOTIFICATION_STATE_EVENT))
}

const pruneDismissed = (state: NotificationState, now = Date.now()) => {
  const cutoff = now - EXPIRY_MS
  Object.keys(state.dismissed).forEach(section => {
    const entries = state.dismissed[section]
    if (!entries) return
    Object.keys(entries).forEach(id => {
      const ts = new Date(entries[id]).getTime()
      if (Number.isNaN(ts) || ts < cutoff) {
        delete entries[id]
      }
    })
    if (Object.keys(entries).length === 0) {
      delete state.dismissed[section]
    }
  })
}

export const isWithinWindow = (value?: string | Date | null) => {
  if (!value) return false
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts <= EXPIRY_MS
}

export const getEffectiveSince = (lastVisited?: Date | null) => {
  const fallback = Date.now() - EXPIRY_MS
  if (!lastVisited) return new Date(fallback)
  const ts = lastVisited.getTime()
  return new Date(Math.max(ts, fallback))
}

export const isNewSince = (value?: string | Date | null, lastVisited?: Date | null) => {
  if (!value) return false
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return false
  const since = getEffectiveSince(lastVisited).getTime()
  return ts >= since
}

export const getLastVisited = (section: string): Date | null => {
  const state = loadState()
  const raw = state.lastVisited?.[section]
  if (!raw) return null
  const ts = new Date(raw)
  if (Number.isNaN(ts.getTime())) return null
  return ts
}

export const markVisited = (section: string, at: Date = new Date()) => {
  if (!section) return
  const state = loadState()
  state.lastVisited[section] = at.toISOString()
  saveState(state)
  notifyStateChanged()
}

export const dismissNotification = (section: string, id: string, at: Date = new Date()) => {
  if (!section || !id) return
  const state = loadState()
  pruneDismissed(state, at.getTime())
  state.dismissed[section] = state.dismissed[section] || {}
  state.dismissed[section][id] = at.toISOString()
  saveState(state)
  notifyStateChanged()
}

export const isDismissed = (section: string, id: string) => {
  if (!section || !id) return false
  const state = loadState()
  pruneDismissed(state)
  saveState(state)
  const dismissedAt = state.dismissed?.[section]?.[id]
  if (!dismissedAt) return false
  const ts = new Date(dismissedAt).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts <= EXPIRY_MS
}

export const getDismissedCount = (section: string) => {
  if (!section) return 0
  const state = loadState()
  pruneDismissed(state)
  saveState(state)
  const entries = state.dismissed?.[section]
  if (!entries) return 0
  return Object.keys(entries).length
}

export const getDismissedCountSince = (section: string, since: Date) => {
  if (!section) return 0
  const state = loadState()
  pruneDismissed(state)
  saveState(state)
  const entries = state.dismissed?.[section]
  if (!entries) return 0
  const sinceTs = since.getTime()
  return Object.values(entries).filter((value) => {
    const ts = new Date(value).getTime()
    return !Number.isNaN(ts) && ts >= sinceTs
  }).length
}
