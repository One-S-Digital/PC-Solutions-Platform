import React, { useMemo, useState } from 'react'

export interface TruncatedTextProps {
  text?: string | null
  limit?: number
  className?: string
  moreLabel?: string
  lessLabel?: string
  preserveNewlines?: boolean
}

const DEFAULT_LIMIT = 120

export default function TruncatedText({
  text,
  limit = DEFAULT_LIMIT,
  className = '',
  moreLabel = '...more',
  lessLabel = 'less',
  preserveNewlines = false,
}: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false)

  const normalized = useMemo(() => String(text ?? ''), [text])
  const shouldTruncate = normalized.length > limit

  const displayText = useMemo(() => {
    if (!shouldTruncate) return normalized
    if (expanded) return normalized
    return normalized.slice(0, limit).trimEnd()
  }, [expanded, limit, normalized, shouldTruncate])

  if (!normalized) return null

  const baseWrapClasses = preserveNewlines
    ? 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]'
    : 'whitespace-normal break-words [overflow-wrap:anywhere]'

  return (
    <span className={`${baseWrapClasses} ${className}`}>
      {displayText}
      {shouldTruncate && !expanded && (
        <>
          {'…'}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-1 text-swiss-teal hover:underline focus:outline-none focus:ring-2 focus:ring-swiss-mint/50 rounded-sm"
            aria-label="Show more"
          >
            {moreLabel}
          </button>
        </>
      )}
      {shouldTruncate && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="ml-2 text-gray-500 hover:underline focus:outline-none focus:ring-2 focus:ring-swiss-mint/50 rounded-sm"
          aria-label="Show less"
        >
          {lessLabel}
        </button>
      )}
    </span>
  )
}

