import { UserCheck, X } from 'lucide-react'

interface ImpersonationBannerProps {
  targetName: string
  targetEmail: string
  onExit: () => void
}

export function ImpersonationBanner({ targetName, targetEmail, onExit }: ImpersonationBannerProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 shrink-0" />
        <span>
          Editing as <strong>{targetName || targetEmail}</strong>
          {targetName && targetEmail !== targetName && (
            <span className="ml-1 opacity-70">({targetEmail})</span>
          )}
          — changes are made on behalf of this user
        </span>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-amber-50 transition-colors hover:bg-amber-700"
      >
        <X className="h-3 w-3" />
        Exit impersonation
      </button>
    </div>
  )
}
