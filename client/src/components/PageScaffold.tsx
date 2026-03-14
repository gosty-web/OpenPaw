import type { ReactNode } from 'react'

type PageScaffoldProps = {
  title: string
  description: string
  children?: ReactNode
}

export function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-8">
      <h1 className="mb-1 text-2xl font-semibold text-paw-text">{title}</h1>
      <p className="mb-8 text-sm text-paw-muted">{description}</p>

      <div className="card flex min-h-[320px] flex-1 items-center justify-center border-dashed text-sm text-paw-faint">
        {children ?? 'Loading...'}
      </div>
    </div>
  )
}
