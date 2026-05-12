import { Outlet } from 'react-router-dom'
import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { ThemeProvider } from '../context/ThemeContext'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'

function LayoutContent() {
  const { isExpanded, isHovered } = useSidebar()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        }`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </ThemeProvider>
  )
}
