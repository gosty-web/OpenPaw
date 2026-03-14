import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CommandPalette } from './components/CommandPalette'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { socket } from './lib/socket'
import { useAppStore } from './lib/store'
import { AgentConfig } from './pages/AgentConfig'
import { AgentDetail } from './pages/AgentDetail'
import { Agents } from './pages/Agents'
import { Channels } from './pages/Channels'
import { Chat } from './pages/Chat'
import { ChatDetail } from './pages/ChatDetail'
import { CronJobs } from './pages/CronJobs'
import { Dashboard } from './pages/Dashboard'
import { Docs } from './pages/Docs'
import { Import } from './pages/Import'
import { Instances } from './pages/Instances'
import { LearningMode } from './pages/LearningMode'
import { MCPs } from './pages/MCPs'
import { Settings } from './pages/Settings'
import { Skills } from './pages/Skills'
import { Workspaces } from './pages/Workspaces'

function App() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-paw-bg font-sans text-paw-text">
      <Sidebar connected={connected} collapsed={sidebarCollapsed} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar connected={connected} />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:agentId" element={<ChatDetail />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/agents/:id/config" element={<AgentConfig />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/instances" element={<Instances />} />
            <Route path="/mcps" element={<MCPs />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/cron" element={<CronJobs />} />
            <Route path="/learning" element={<LearningMode />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/import" element={<Import />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}

export default App
