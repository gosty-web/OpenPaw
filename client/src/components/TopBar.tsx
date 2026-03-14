import { useLocation } from 'react-router-dom'
import { getPageTitle } from '../lib/routes'

type TopBarProps = {
  connected: boolean
}

export function TopBar({ connected }: TopBarProps) {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)
  const pathParts = location.pathname.split('/').filter(Boolean)
  const parentPath = pathParts.length > 1 ? `/${pathParts[0]}` : null
  const parentLabel = parentPath ? getPageTitle(parentPath) : null

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-paw-border-subtle bg-paw-bg/80 px-6 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-sm font-medium text-paw-text">{pageTitle}</h1>
        {parentLabel && parentLabel !== pageTitle ? (
          <span className="text-sm text-paw-faint">› {parentLabel}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 text-xs text-paw-muted">
        <div className="flex items-center gap-1">
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">K</kbd>
        </div>
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
