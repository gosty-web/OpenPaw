import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navigationGroups } from '../lib/routes'
import { useAppStore } from '../lib/store'

type SidebarProps = {
  connected: boolean
  collapsed: boolean
}

export function Sidebar({ connected, collapsed }: SidebarProps) {
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <aside
      className="flex h-screen flex-col overflow-hidden border-r border-paw-border bg-paw-surface transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: collapsed ? 64 : 240 }}
    >
      <div className="flex h-12 items-center gap-3 border-b border-paw-border-subtle px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-paw-accent text-sm text-white">🐾</div>
        {!collapsed && (
          <>
            <div className="min-w-0 animate-fade-in text-sm font-semibold text-paw-text">OpenPaw</div>
            <div className="ml-auto text-[10px] text-paw-faint">v0.1</div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {navigationGroups.map((group) => (
          <div key={group.name} className="mb-2 last:mb-0">
            {!collapsed && (
              <div className="px-3 pb-1 pt-5 text-[10px] font-medium uppercase tracking-widest text-paw-faint">
                {group.name}
              </div>
            )}

            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      [
                        'relative mx-2 my-0.5 flex h-9 items-center gap-3 overflow-hidden rounded-lg px-3 text-xs font-medium transition-colors duration-150',
                        collapsed ? 'justify-center' : '',
                        isActive
                          ? 'bg-paw-accent-bg text-paw-accent before:absolute before:-left-2 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-paw-accent'
                          : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text',
                      ].join(' ')
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate text-xs font-medium">{item.label}</span>}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-paw-border-subtle px-3 pb-4 pt-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-0'}`}>
          <div className={collapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'}>
            <span
              className={`h-2 w-2 rounded-full ${connected ? 'bg-paw-success animate-pulse-soft' : 'bg-paw-danger'}`}
            />
            {!collapsed && (
              <span className="text-xs text-paw-muted">{connected ? 'Connected' : 'Disconnected'}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="btn-ghost mx-auto mt-4 flex h-8 w-8 items-center justify-center rounded-lg p-0"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
  )
}
