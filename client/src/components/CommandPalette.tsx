import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Command, MessageSquare, Settings as SettingsIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '../lib/toast'
import { commandRoutes } from '../lib/routes'
import { useAppStore } from '../lib/store'

type PaletteCommand = {
  id: string
  name: string
  category: string
  keywords: string[]
  action: () => void
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) {
    return text
  }

  const normalizedQuery = query.trim().toLowerCase()
  const index = text.toLowerCase().indexOf(normalizedQuery)

  if (index === -1) {
    return text
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + normalizedQuery.length)
  const after = text.slice(index + normalizedQuery.length)

  return (
    <>
      {before}
      <span className="text-paw-accent">{match}</span>
      {after}
    </>
  )
}

export function CommandPalette() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const cmdPaletteOpen = useAppStore((state) => state.cmdPaletteOpen)
  const openCmdPalette = useAppStore((state) => state.openCmdPalette)
  const closeCmdPalette = useAppStore((state) => state.closeCmdPalette)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands = useMemo<PaletteCommand[]>(() => {
    const navigationCommands = commandRoutes.map((route) => ({
      id: `navigate:${route.path}`,
      name: route.label,
      category: route.category,
      keywords: [route.path, route.label.toLowerCase()],
      action: () => {
        navigate(route.path)
        closeCmdPalette()
      },
    }))

    return [
      ...navigationCommands,
      {
        id: 'action:new-chat',
        name: 'New Chat',
        category: 'ACTIONS',
        keywords: ['conversation', 'chat', 'start'],
        action: () => {
          navigate('/chat')
          closeCmdPalette()
          toast.info('Ready to start a new chat')
        },
      },
      {
        id: 'action:create-agent',
        name: 'Create Agent',
        category: 'ACTIONS',
        keywords: ['agent', 'new', 'create'],
        action: () => {
          navigate('/agents')
          closeCmdPalette()
          toast.info('Agent creation flow will land here next')
        },
      },
      {
        id: 'action:open-settings',
        name: 'Open Settings',
        category: 'ACTIONS',
        keywords: ['preferences', 'config', 'settings'],
        action: () => {
          navigate('/settings')
          closeCmdPalette()
        },
      },
    ]
  }, [closeCmdPalette, navigate])

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return !normalizedQuery
      ? commands
      : commands.filter((command) => {
          const haystack = `${command.name} ${command.category} ${command.keywords.join(' ')}`.toLowerCase()
          return haystack.includes(normalizedQuery)
        })
  }, [commands, query])

  const groupedCommands = useMemo(() => {
    return filteredCommands.reduce<Record<string, PaletteCommand[]>>((accumulator, command) => {
      if (!accumulator[command.category]) {
        accumulator[command.category] = []
      }

      accumulator[command.category].push(command)
      return accumulator
    }, {})
  }, [filteredCommands])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (cmdPaletteOpen) {
          closeCmdPalette()
        } else {
          openCmdPalette()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeCmdPalette, cmdPaletteOpen, openCmdPalette])

  useEffect(() => {
    if (!cmdPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      return
    }

    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [cmdPaletteOpen, location.pathname])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!cmdPaletteOpen) {
      return
    }

    const handlePaletteKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCmdPalette()
        return
      }

      if (!filteredCommands.length) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((current) => (current + 1) % filteredCommands.length)
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((current) => (current - 1 + filteredCommands.length) % filteredCommands.length)
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        filteredCommands[selectedIndex]?.action()
      }
    }

    document.addEventListener('keydown', handlePaletteKeys)
    return () => document.removeEventListener('keydown', handlePaletteKeys)
  }, [closeCmdPalette, cmdPaletteOpen, filteredCommands, selectedIndex])

  if (!cmdPaletteOpen) {
    return null
  }

  let absoluteIndex = -1

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 cursor-default"
        onClick={closeCmdPalette}
      />

      <div className="absolute left-1/2 top-[20%] w-[560px] -translate-x-1/2 overflow-hidden rounded-2xl border border-paw-border-strong bg-paw-surface shadow-2xl animate-slide-up">
        <div className="border-b border-paw-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command or search..."
            className="w-full border-0 bg-transparent px-5 py-4 text-base text-paw-text outline-none placeholder:text-paw-faint"
          />
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-paw-faint">
              No results for &quot;{query.trim() || '...'}&quot;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="px-5 py-1.5 text-[10px] uppercase tracking-wide text-paw-faint">{category}</div>

                <div className="space-y-1">
                  {items.map((command) => {
                    absoluteIndex += 1
                    const isSelected = absoluteIndex === selectedIndex

                    return (
                      <button
                        key={command.id}
                        type="button"
                        onClick={command.action}
                        className={`mx-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2 text-left transition-colors ${
                          isSelected ? 'bg-paw-raised text-paw-text' : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center text-paw-muted">
                          {command.category === 'ACTIONS' && command.name === 'Create Agent' ? (
                            <Bot size={16} />
                          ) : command.category === 'ACTIONS' && command.name === 'New Chat' ? (
                            <MessageSquare size={16} />
                          ) : command.category === 'ACTIONS' ? (
                            <SettingsIcon size={16} />
                          ) : (
                            <Command size={16} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-paw-text">{highlightMatch(command.name, query)}</div>
                        </div>
                        <span className="text-xs text-paw-faint">{command.category}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-paw-border px-5 py-3 text-xs text-paw-faint">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc dismiss</span>
        </div>
      </div>
    </div>
  )
}
