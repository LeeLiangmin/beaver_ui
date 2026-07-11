import { memo } from 'react'
import { Search, Zap, Cpu, CalendarDays, Clock, SlidersHorizontal, HardDrive } from 'lucide-react'

interface WelcomeProps {
  tabs: { id: string; label: string; icon: string; description?: string }[]
  onSelectTab: (id: string) => void
}

const descriptions: Record<string, string> = {
  filesearch: '实时递归文件搜索，支持磁盘快速选择',
  fastopener: '收藏常用文件和目录，一键快速打开',
  process: '查看和管理 Windows 进程，支持结束与重启',
  calendar: '中国传统万年历，节气与农历信息',
  clock: '服务器时间显示与倒计时功能',
  env: '查看和编辑 Windows 环境变量',
  cleaner: '磁盘清理 + 大文件查找，AI 智能建议',
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

export default memo(function Welcome({ tabs, onSelectTab }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Beaver</h1>
      <p className="text-gray-500 mb-8">Daily Work Assistant</p>
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon]
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-200 hover:border-primary/40 hover:shadow-card transition-all text-center group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary-light text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                {Icon && <Icon size={24} />}
              </div>
              <span className="font-medium text-gray-700 text-sm">{tab.label}</span>
              <span className="text-xs text-gray-400">{descriptions[tab.id] || ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})
