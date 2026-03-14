import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BookOpen,
  Bot,
  Clock,
  Download,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Radio,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'
import { matchPath } from 'react-router-dom'

export type NavigationGroup = {
  name: string
  items: Array<{
    label: string
    path: string
    icon: LucideIcon
  }>
}

export const navigationGroups: NavigationGroup[] = [
  {
    name: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Chat', path: '/chat', icon: MessageSquare },
      { label: 'Agents', path: '/agents', icon: Bot },
      { label: 'Workspaces', path: '/workspaces', icon: Layers },
      { label: 'Instances', path: '/instances', icon: Activity },
    ],
  },
  {
    name: 'TOOLS',
    items: [
      { label: 'MCPs', path: '/mcps', icon: Plug },
      { label: 'Skills', path: '/skills', icon: Zap },
      { label: 'Cron Jobs', path: '/cron', icon: Clock },
      { label: 'Learning', path: '/learning', icon: Sparkles },
      { label: 'Channels', path: '/channels', icon: Radio },
    ],
  },
  {
    name: 'SYSTEM',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
      { label: 'Import', path: '/import', icon: Download },
      { label: 'Docs', path: '/docs', icon: BookOpen },
    ],
  },
]

export const commandRoutes = [
  { label: 'Dashboard', path: '/', category: 'MAIN' },
  { label: 'Chat', path: '/chat', category: 'MAIN' },
  { label: 'Agent Chat', path: '/chat/demo-agent', category: 'PAGES' },
  { label: 'Agents', path: '/agents', category: 'MAIN' },
  { label: 'Agent Detail', path: '/agents/demo-agent', category: 'PAGES' },
  { label: 'Agent Configuration', path: '/agents/demo-agent/config', category: 'PAGES' },
  { label: 'Workspaces', path: '/workspaces', category: 'MAIN' },
  { label: 'Instances', path: '/instances', category: 'MAIN' },
  { label: 'MCPs', path: '/mcps', category: 'TOOLS' },
  { label: 'Skills', path: '/skills', category: 'TOOLS' },
  { label: 'Cron Jobs', path: '/cron', category: 'TOOLS' },
  { label: 'Learning', path: '/learning', category: 'TOOLS' },
  { label: 'Channels', path: '/channels', category: 'TOOLS' },
  { label: 'Settings', path: '/settings', category: 'SYSTEM' },
  { label: 'Import', path: '/import', category: 'SYSTEM' },
  { label: 'Docs', path: '/docs', category: 'SYSTEM' },
] as const

const titleMap = [
  { pattern: '/agents/:id/config', title: 'Agent Configuration' },
  { pattern: '/agents/:id', title: 'Agent Detail' },
  { pattern: '/agents', title: 'Agents' },
  { pattern: '/chat/:agentId', title: 'Agent Chat' },
  { pattern: '/chat', title: 'Chat' },
  { pattern: '/workspaces', title: 'Workspaces' },
  { pattern: '/instances', title: 'Instances' },
  { pattern: '/mcps', title: 'MCPs' },
  { pattern: '/skills', title: 'Skills' },
  { pattern: '/cron', title: 'Cron Jobs' },
  { pattern: '/learning', title: 'Learning' },
  { pattern: '/channels', title: 'Channels' },
  { pattern: '/settings', title: 'Settings' },
  { pattern: '/import', title: 'Import' },
  { pattern: '/docs', title: 'Docs' },
  { pattern: '/', title: 'Dashboard' },
]

export function getPageTitle(pathname: string) {
  const matched = titleMap.find((route) => matchPath({ path: route.pattern, end: true }, pathname))
  return matched?.title ?? 'OpenPaw'
}
