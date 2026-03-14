import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  activeAgentId: string | null
  cmdPaletteOpen: boolean
  toggleSidebar: () => void
  setActiveAgent: (id: string | null) => void
  openCmdPalette: () => void
  closeCmdPalette: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  activeAgentId: null,
  cmdPaletteOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveAgent: (id) => set({ activeAgentId: id }),
  openCmdPalette: () => set({ cmdPaletteOpen: true }),
  closeCmdPalette: () => set({ cmdPaletteOpen: false }),
}))
