import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  function toggleSidebar() {
    setIsExpanded((v) => !v)
  }

  function toggleMobileSidebar() {
    setIsMobileOpen((v) => !v)
  }

  return (
    <SidebarContext.Provider
      value={{ isExpanded, isHovered, isMobileOpen, setIsHovered, toggleSidebar, toggleMobileSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider')
  return ctx
}
