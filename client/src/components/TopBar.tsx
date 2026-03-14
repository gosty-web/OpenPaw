import { useLocation } from 'react-router-dom'
import { getPageTitle } from '../lib/routes'

type TopBarProps = {
  connected: boolean
}

export function TopBar({ connected }: TopBarProps) {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <header className="flex h-12 items-center justify-between border-b border-paw-border bg-paw-bg/85 px-6 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-paw-text">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3 text-xs text-paw-muted">
        <div className="kbd">⌘K</div>
        <div className="h-4 w-px bg-paw-border" />
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? 'bg-paw-success animate-pulse-soft' : 'bg-paw-danger'
            }`}
          />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </header>
  )
}
