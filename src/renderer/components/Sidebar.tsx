import { Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal, Home } from 'lucide-react'

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
  Search, Zap, Cpu, Calendar, Clock, SlidersHorizontal,
}

export default function Sidebar({ tabs, activeTab, onSelectTab }: SidebarProps) {
  return (
    <nav className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-1 shrink-0">
      <button
        onClick={() => onSelectTab('welcome')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          activeTab === 'welcome'
            ? 'bg-blue-100 text-blue-600'
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
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative group ${
              isActive
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={tab.label}
          >
            {Icon && <Icon size={20} />}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
