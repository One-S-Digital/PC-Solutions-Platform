import React, { useRef } from 'react'
import DOMPurify from 'dompurify'
import { useQuery } from '@tanstack/react-query'
import { useApiClient, apiService } from '../../services/api'

// Sample values shown in preview for per-recipient tokens
const SAMPLE_TOKENS: Record<string, string> = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  role: 'FOUNDATION',
  orgName: 'Example Foundation',
  canton: 'VD',
  unsubscribeUrl: '#',
}

function resolveTokens(html: string, vars: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

interface Props {
  html: string
  className?: string
}

const EmailPreview: React.FC<Props> = ({ html, className = '' }) => {
  const apiClient = useApiClient()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch platform branding so {{logoUrl}} / {{iconUrl}} resolve to real URLs in preview
  const { data: settings } = useQuery({
    queryKey: ['platform-branding-preview'],
    queryFn: async () => {
      const res = await apiService.getFrontendSettings(apiClient)
      return res.data?.data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const logoUrl = settings?.logoAsset?.publicUrl || ''
  const iconUrl = settings?.faviconAsset?.publicUrl || ''

  const tokens: Record<string, string> = {
    ...SAMPLE_TOKENS,
    logoUrl,
    iconUrl,
  }

  const resolved = resolveTokens(DOMPurify.sanitize(html), tokens)

  // Wrap in a full HTML document so email styles render properly and images
  // respect max-width so nothing overflows the preview pane.
  const srcDoc = [
    '<!DOCTYPE html><html><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<style>',
    '*{box-sizing:border-box;}',
    'html,body{margin:0;padding:0;width:100%;}',
    'body{padding:12px;font-family:Arial,sans-serif;font-size:14px;color:#111;word-break:break-word;overflow-x:hidden;}',
    'img{max-width:100%!important;height:auto!important;display:block;}',
    'table{max-width:100%!important;width:100%!important;}',
    'td,th{word-break:break-word;}',
    'a{color:#3b82f6;}',
    '</style>',
    '</head><body>',
    resolved,
    '</body></html>',
  ].join('')

  const handleLoad = () => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (doc?.documentElement) {
      // Auto-size height to content so no double scroll bar
      iframeRef.current.style.height = `${doc.documentElement.scrollHeight}px`
    }
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className={`w-full border-0 block ${className}`}
      style={{ minHeight: '180px' }}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      title="Email preview"
    />
  )
}

export default EmailPreview
