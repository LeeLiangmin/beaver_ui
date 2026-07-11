import { memo, useState, useCallback } from 'react'
import { Search, Zap, Cpu, CalendarDays, Clock, SlidersHorizontal, Home, HardDrive, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

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
  const [expanded, setExpanded] = useState(() => localStorage.getItem('beaver-sidebar-expanded') === 'true')

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev
      localStorage.setItem('beaver-sidebar-expanded', String(next))
      return next
    })
  }, [])

  const btnClass = (active: boolean) =>
    `flex items-center gap-3 rounded-2xl transition-all relative ${
      expanded ? 'w-full px-3' : 'w-10 justify-center'
    } h-10 ${
      active
        ? 'bg-primary-light text-primary shadow-sm'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`

  return (
    <nav className={`${expanded ? 'w-52' : 'w-16'} bg-sidebar-bg backdrop-blur-xl flex flex-col items-center py-4 gap-1 shrink-0 transition-all duration-200 overflow-hidden`}>
      <button
        onClick={() => onSelectTab('welcome')}
        className={btnClass(activeTab === 'welcome')}
        title="首页"
      >
        <Home size={20} className="shrink-0" />
        {expanded && <span className="text-sm font-medium truncate">首页</span>}
        {!expanded && activeTab === 'welcome' && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
        )}
        {!expanded && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-md">
            首页
          </span>
        )}
      </button>
      <div className={`${expanded ? 'w-full px-3' : 'w-8'} h-px bg-gray-200 my-2 transition-all`} />
      {tabs.map((tab, idx) => {
        const Icon = iconMap[tab.icon]
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`${btnClass(isActive)} group`}
            title={tab.label}
          >
            {Icon && <Icon size={20} className="shrink-0" />}
            {isActive && !expanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
            )}
            {expanded && (
              <span className="text-sm font-medium truncate">{tab.label}</span>
            )}
            {!expanded && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-md">
                {tab.label} (Ctrl+{idx + 1})
              </span>
            )}
          </button>
        )
      })}
      <div className="flex-1" />
      <div className={`${expanded ? 'w-full px-3' : 'w-8'} h-px bg-gray-200 my-2 transition-all`} />
      <button
        onClick={() => onSelectTab('settings')}
        className={`${btnClass(activeTab === 'settings')} group`}
        title="全局设置"
      >
        <Settings size={20} className="shrink-0" />
        {expanded && <span className="text-sm font-medium truncate">全局设置</span>}
        {activeTab === 'settings' && !expanded && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
        )}
        {!expanded && (
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-md">
            全局设置
          </span>
        )}
      </button>
      <button
        onClick={toggleExpanded}
        className="w-10 h-10 flex items-center justify-center rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-1"
        title={expanded ? '收起侧边栏' : '展开侧边栏'}
      >
        {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>
    </nav>
  )
})
