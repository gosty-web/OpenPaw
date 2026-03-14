type StatusMeta = {
  label: string
  color: string
  dot: string
  pulse: boolean
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'OP'
}

export function getStatusMeta(status?: string): StatusMeta {
  const value = String(status ?? 'idle').toLowerCase()

  if (value.includes('think')) {
    return { label: 'Thinking', color: 'text-paw-warning', dot: 'bg-paw-warning', pulse: true }
  }

  if (value.includes('work') || value.includes('run') || value.includes('busy')) {
    return { label: 'Working', color: 'text-paw-info', dot: 'bg-paw-info', pulse: true }
  }

  if (value.includes('online') || value.includes('active') || value.includes('ready')) {
    return { label: 'Online', color: 'text-paw-success', dot: 'bg-paw-success', pulse: true }
  }

  if (value.includes('error') || value.includes('fail')) {
    return { label: 'Error', color: 'text-paw-danger', dot: 'bg-paw-danger', pulse: false }
  }

  if (value.includes('sleep')) {
    return { label: 'Sleeping', color: 'text-paw-faint', dot: 'bg-paw-faint', pulse: false }
  }

  return { label: 'Idle', color: 'text-paw-muted', dot: 'bg-paw-faint', pulse: false }
}

export function AgentAvatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs'

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-paw-accent-bg font-semibold text-paw-accent`}>
      {getInitials(name)}
    </div>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  const meta = getStatusMeta(status)

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.color}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse-soft' : ''}`} />
      {meta.label}
    </span>
  )
}
