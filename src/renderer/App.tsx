import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import ProgressBar from './components/ProgressBar'

const Welcome = lazy(() => import('./components/Welcome'))
const FileSearch = lazy(() => import('./components/FileSearch'))
const FastOpener = lazy(() => import('./components/FastOpener'))
const ProcessManager = lazy(() => import('./components/ProcessManager'))
const Calendar = lazy(() => import('./components/Calendar'))
const ClockTimer = lazy(() => import('./components/ClockTimer'))
const EnvManager = lazy(() => import('./components/EnvManager'))

type TabId = 'welcome' | 'filesearch' | 'fastopener' | 'process' | 'calendar' | 'clock' | 'env'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'filesearch', label: '文件搜索', icon: 'Search' },
  { id: 'fastopener', label: '快速打开', icon: 'Zap' },
  { id: 'process', label: '进程管理', icon: 'Cpu' },
  { id: 'calendar', label: '万年历', icon: 'CalendarDays' },
  { id: 'clock', label: '时钟计时', icon: 'Clock' },
  { id: 'env', label: '环境变量', icon: 'SlidersHorizontal' },
]

function TabFallback() {
  return <div className="flex items-center justify-center h-32"><ProgressBar /></div>
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('welcome')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key)
        if (idx >= 1 && idx <= 6) {
          e.preventDefault()
          setActiveTab(tabs[idx - 1].id)
        }
        if (e.key === '0' || e.key === 'Escape') {
          e.preventDefault()
          setActiveTab('welcome')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectTab = useCallback((id: string) => setActiveTab(id as TabId), [])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-alt">
      <Sidebar tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
      <main className="flex-1 overflow-auto p-6 bg-surface-alt">
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'welcome' && <Welcome tabs={tabs} onSelectTab={selectTab} />}
          {activeTab === 'filesearch' && <FileSearch />}
          {activeTab === 'fastopener' && <FastOpener />}
          {activeTab === 'process' && <ProcessManager />}
          {activeTab === 'calendar' && <Calendar />}
          {activeTab === 'clock' && <ClockTimer />}
          {activeTab === 'env' && <EnvManager />}
        </Suspense>
      </main>
    </div>
  )
}
