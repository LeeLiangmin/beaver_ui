import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import FileSearch from './components/FileSearch'
import FastOpener from './components/FastOpener'
import ProcessManager from './components/ProcessManager'
import Calendar from './components/Calendar'
import ClockTimer from './components/ClockTimer'
import EnvManager from './components/EnvManager'

type TabId = 'welcome' | 'filesearch' | 'fastopener' | 'process' | 'calendar' | 'clock' | 'env'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'filesearch', label: '文件搜索', icon: 'Search' },
  { id: 'fastopener', label: '快速打开', icon: 'Zap' },
  { id: 'process', label: '进程管理', icon: 'Cpu' },
  { id: 'calendar', label: '万年历', icon: 'Calendar' },
  { id: 'clock', label: '时钟计时', icon: 'Clock' },
  { id: 'env', label: '环境变量', icon: 'SlidersHorizontal' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('welcome')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key)
        if (idx >= 1 && idx <= 6) {
          e.preventDefault()
          const realTabs = tabs.map(t => t.id)
          setActiveTab(realTabs[idx - 1])
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar tabs={tabs} activeTab={activeTab} onSelectTab={(id) => setActiveTab(id as TabId)} />
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'welcome' && <Welcome tabs={tabs} onSelectTab={(id) => setActiveTab(id as TabId)} />}
        {activeTab === 'filesearch' && <FileSearch />}
        {activeTab === 'fastopener' && <FastOpener />}
        {activeTab === 'process' && <ProcessManager />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'clock' && <ClockTimer />}
        {activeTab === 'env' && <EnvManager />}
      </main>
    </div>
  )
}
