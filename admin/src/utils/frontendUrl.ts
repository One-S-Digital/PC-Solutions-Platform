export function getFrontendBaseUrl(): string {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL as string | undefined
  if (frontendUrl) {
    return frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl
  }

  // Best-effort fallback when VITE_FRONTEND_URL isn't configured.
  // Tries common patterns:
  // - admin.domain.com -> domain.com
  // - admin-staging.domain.com -> staging.domain.com
  // - staging-admin.domain.com -> staging.domain.com
  // - domain.com -> app.domain.com
  // - localhost:3001 -> localhost:3000
  const currentUrl = new URL(window.location.href)
  const { protocol, hostname, port } = currentUrl

  let derivedHostname = hostname
  if (hostname.startsWith('admin.')) {
    derivedHostname = hostname.replace(/^admin\./, '')
  } else if (hostname.startsWith('admin-')) {
    derivedHostname = hostname.replace(/^admin-/, '')
  } else if (hostname.endsWith('-admin')) {
    derivedHostname = hostname.replace(/-admin$/, '')
  }

  const hostnameLabels = derivedHostname.split('.')
  const isLocalhostLike = derivedHostname === 'localhost' || derivedHostname.endsWith('.localhost')
  if (!isLocalhostLike && derivedHostname === hostname && hostnameLabels.length === 2) {
    derivedHostname = `app.${derivedHostname}`
  }

  const derivedPort = port === '3001' ? '3000' : port
  const derivedHost = derivedPort ? `${derivedHostname}:${derivedPort}` : derivedHostname
  return `${protocol}//${derivedHost}`
}

