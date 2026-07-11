import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import ProgressBar from './components/ProgressBar'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'

const Welcome = lazy(() => import('./components/Welcome'))
const FileSearch = lazy(() => import('./components/FileSearch'))
const FastOpener = lazy(() => import('./components/FastOpener'))
const ProcessManager = lazy(() => import('./components/ProcessManager'))
const Calendar = lazy(() => import('./components/Calendar'))
const ClockTimer = lazy(() => import('./components/ClockTimer'))
const EnvManager = lazy(() => import('./components/EnvManager'))
const DiskCleaner = lazy(() => import('./components/DiskCleaner'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))

type TabId = 'welcome' | 'filesearch' | 'fastopener' | 'process' | 'calendar' | 'clock' | 'env' | 'cleaner' | 'settings'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'filesearch', label: '文件搜索', icon: 'Search' },
  { id: 'fastopener', label: '快速打开', icon: 'Zap' },
  { id: 'process', label: '进程管理', icon: 'Cpu' },
  { id: 'calendar', label: '万年历', icon: 'CalendarDays' },
  { id: 'clock', label: '时钟计时', icon: 'Clock' },
  { id: 'env', label: '环境变量', icon: 'SlidersHorizontal' },
  { id: 'cleaner', label: '磁盘清理', icon: 'HardDrive' },
]

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <ProgressBar />
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('welcome')
  const [cmdOpen, setCmdOpen] = useState(false)

  const selectTab = useCallback((id: string) => setActiveTab(id as TabId), [])

  const commands = useMemo(() => [
    ...tabs.map((t, i) => ({
      id: t.id,
      label: t.label,
      shortcut: `Ctrl+${i + 1}`,
      action: () => setActiveTab(t.id),
    })),
    { id: 'home', label: '首页', shortcut: 'Ctrl+0', action: () => setActiveTab('welcome') },
    { id: 'settings-cmd', label: '全局设置', action: () => setActiveTab('settings') },
  ], [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.altKey) {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
        return
      }
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key, 10)
        if (idx >= 1 && idx <= 7) {
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

  return (
    <div className="flex h-screen overflow-hidden bg-surface-alt">
      <Sidebar tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
      <main className="flex-1 overflow-hidden p-6 bg-surface-alt">
        <Suspense fallback={<TabFallback />}>
          <ErrorBoundary key={activeTab}>
            <div className="animate-tab-enter h-full">
            {activeTab === 'welcome' && <Welcome tabs={tabs} onSelectTab={selectTab} />}
            {activeTab === 'filesearch' && <FileSearch />}
            {activeTab === 'fastopener' && <FastOpener />}
            {activeTab === 'process' && <ProcessManager />}
            {activeTab === 'calendar' && <Calendar />}
            {activeTab === 'clock' && <ClockTimer />}
            {activeTab === 'env' && <EnvManager />}
            {activeTab === 'cleaner' && <DiskCleaner />}
            {activeTab === 'settings' && <SettingsPage />}
            </div>
          </ErrorBoundary>
        </Suspense>
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  )
}
