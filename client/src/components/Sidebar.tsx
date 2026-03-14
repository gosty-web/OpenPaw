import {
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
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
      <div className="flex h-16 items-center gap-3 border-b border-paw-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paw-accent-bg text-lg text-paw-accent">
          🐾
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <div className="text-sm font-semibold text-paw-text">OpenPaw</div>
            <div className="text-xs text-paw-faint">v0.1.0</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => (
          <div key={group.name} className="mb-6 last:mb-0">
            {!collapsed && (
              <div className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-paw-faint">
                {group.name}
              </div>
            )}

            <nav className="space-y-1">
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
                        'flex h-10 items-center gap-3 overflow-hidden px-3 text-xs font-medium transition-colors duration-150',
                        collapsed ? 'justify-center rounded-xl' : 'rounded-r-xl rounded-l-lg',
                        isActive
                          ? 'border-l-2 border-paw-accent bg-paw-accent-bg text-paw-accent'
                          : 'border-l-2 border-transparent text-paw-muted hover:bg-paw-raised hover:text-paw-text',
                      ].join(' ')
                    }
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-paw-border px-3 py-3">
        <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2 px-2'}`}>
          <div
            className={collapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'}
            title={collapsed ? (connected ? 'Server connected' : 'Server disconnected') : undefined}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-paw-success animate-pulse-soft' : 'bg-paw-danger'
              }`}
            />
            {!collapsed && (
              <span className="text-xs text-paw-muted">{connected ? 'Server online' : 'Server offline'}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`btn-ghost w-full ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  )
}
