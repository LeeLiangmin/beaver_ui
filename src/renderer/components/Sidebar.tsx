import { memo } from 'react'
import { Search, Zap, Cpu, CalendarDays, Clock, SlidersHorizontal, Home, HardDrive, Settings } from 'lucide-react'

type TabId = string

interface Tab {
  id: TabId
  label: string
  icon: string
}

interface SidebarProps {
  tabs: Tab[]
  activeTab: TabId
  onSelectTab: (id: TabId) => void
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Search,
  Zap,
  Cpu,
  CalendarDays,
  Clock,
  SlidersHorizontal,
  HardDrive,
}

export default memo(function Sidebar({ tabs, activeTab, onSelectTab }: SidebarProps) {
  return (
    <nav className="w-16 bg-sidebar-bg border-r border-gray-200 flex flex-col items-center py-4 gap-1 shrink-0">
      <button
        onClick={() => onSelectTab('welcome')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          activeTab === 'welcome'
            ? 'bg-primary-light text-primary shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="首页"
      >
        <Home size={20} />
      </button>
      <div className="w-8 h-px bg-gray-200 my-2" />
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon]
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all relative group ${
              isActive
                ? 'bg-primary-light text-primary shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={tab.label}
          >
            {Icon && <Icon size={20} />}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
            )}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-md">
              {tab.label}
            </span>
          </button>
        )
      })}
      <div className="flex-1" />
      <div className="w-8 h-px bg-gray-200 my-2" />
      <button
        onClick={() => onSelectTab('settings')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all relative group ${
          activeTab === 'settings'
            ? 'bg-primary-light text-primary shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="全局设置"
      >
        <Settings size={20} />
        {activeTab === 'settings' && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
        )}
        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-md">
          全局设置
        </span>
      </button>
    </nav>
  )
})
