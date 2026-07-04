import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  CleanupRule,
  CleanupScanResult,
  LargeFile,
  LargeFileScanRequest,
  AiInsights,
  ChatMessage,
  ScanPlan,
} from '../../shared/types'
import { useToast } from './Toast'

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export type ViewTab = 'dashboard' | 'rules' | 'largefiles'

export function useDiskCleaner() {
  const toast = useToast().toast

  // Global
  const [aiEnabled, setAiEnabled] = useState(false)
  const [tab, setTab] = useState<ViewTab>('dashboard')

  // Scan / cleanup
  const [rules, setRules] = useState<CleanupRule[]>([])
  const [scanResults, setScanResults] = useState<CleanupScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [permanent, setPermanent] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [cleanDialog, setCleanDialog] = useState(false)

  // AI insights
  const [insights, setInsights] = useState<AiInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [aiHighlightIds, setAiHighlightIds] = useState<Set<string>>(new Set())

  // AI scan planning + narration
  const [scanPlan, setScanPlan] = useState<ScanPlan | null>(null)
  const [narration, setNarration] = useState<string[]>([])
  const narrateTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const narratedIdsRef = useRef<Set<string>>(new Set())

  // Chat
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Large files
  const [largePath, setLargePath] = useState('C:\\')
  const [largeMinMB, setLargeMinMB] = useState(500)
  const [largeFiles, setLargeFiles] = useState<LargeFile[]>([])
  const [largeScanning, setLargeScanning] = useState(false)

  const progressMapRef = useRef<Map<string, CleanupScanResult>>(new Map())

  useEffect(() => {
    window.electronAPI.cleaner.getRules().then((res) => {
      if (res.ok) setRules(res.data)
    })
    window.electronAPI.settings.get().then((res) => {
      if (res.ok && res.data.aiEnabled) setAiEnabled(true)
    })
  }, [])

  const runInsights = useCallback(async (results: CleanupScanResult[]) => {
    setInsightsLoading(true)
    const res = await window.electronAPI.ai.generateInsights(results)
    if (res.ok) {
      setInsights(res.data)
    }
    setInsightsLoading(false)
  }, [])

  useEffect(() => {
    const unsubProgress = window.electronAPI.cleaner.onScanProgress((result) => {
      progressMapRef.current.set(result.ruleId, result)
      const current = Array.from(progressMapRef.current.values())
      setScanResults(current)

      // AI narration: debounce, call every 4 new rules discovered
      if (aiEnabled) {
        const alreadyNarrated = Array.from(narratedIdsRef.current)
        const fresh = current.filter((r) => r.accessible && r.sizeBytes > 0 && !narratedIdsRef.current.has(r.ruleId))
        if (fresh.length >= 4) {
          clearTimeout(narrateTimerRef.current)
          narrateTimerRef.current = setTimeout(async () => {
            const res = await window.electronAPI.ai.narrateScanProgress(current, alreadyNarrated)
            if (res.ok && res.data.message) {
              setNarration((prev) => [...prev, res.data.message])
            }
          }, 800)
        }
      }
    })
    const unsubComplete = window.electronAPI.cleaner.onScanComplete((results) => {
      setScanResults(results)
      setScanning(false)
      setHasScanned(true)
      narratedIdsRef.current.clear()
      runInsights(results)
    })
    const unsubLarge = window.electronAPI.cleaner.onLargeFileFound((files) => {
      setLargeFiles((prev) => [...prev, ...files])
    })
    const unsubLargeDone = window.electronAPI.cleaner.onLargeFileComplete(() => {
      setLargeScanning(false)
    })
    return () => {
      unsubProgress()
      unsubComplete()
      unsubLarge()
      unsubLargeDone()
    }
  }, [runInsights])

  const handleScan = useCallback(async () => {
    setScanning(true)
    progressMapRef.current.clear()
    setScanResults([])
    setSelectedIds(new Set())
    setInsights(null)
    setAiHighlightIds(new Set())
    setScanPlan(null)
    setNarration([])
    narratedIdsRef.current.clear()

    // AI scan planning
    if (aiEnabled) {
      const planRes = await window.electronAPI.ai.planScan()
      if (planRes.ok) setScanPlan(planRes.data)
    }

    await window.electronAPI.cleaner.scan()
  }, [aiEnabled])

  const handleCancelScan = async () => {
    await window.electronAPI.cleaner.cancelScan()
    setScanning(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyAiSelection = (ids: string[]) => {
    setSelectedIds(new Set(ids))
    setAiHighlightIds(new Set(ids))
    setTimeout(() => setAiHighlightIds(new Set()), 3000)
  }

  const addToSelection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    setAiHighlightIds(new Set(ids))
    setTimeout(() => setAiHighlightIds(new Set()), 3000)
  }

  const handleClean = async () => {
    setCleanDialog(false)
    setCleaning(true)
    const ids = Array.from(selectedIds)
    const res = await window.electronAPI.cleaner.clean(ids, permanent)
    if (res.ok) {
      let totalFreed = 0
      let totalCount = 0
      for (const r of res.data) {
        totalCount += r.deletedCount
        // Freed bytes not tracked precisely; approximate from scan result
        const scan = scanResults.find((s) => s.ruleId === r.ruleId)
        if (scan) totalFreed += scan.sizeBytes
      }
      toast(`已清理 ${totalCount.toLocaleString()} 个文件，释放约 ${formatSize(totalFreed)}`, 'success')
      // Rescan
      handleScan()
    } else {
      toast(res.error || '清理失败', 'error')
    }
    setCleaning(false)
  }

  const runPreset = (ruleIds: string[]) => {
    applyAiSelection(ruleIds)
    toast(`已勾选 ${ruleIds.length} 个类别`, 'success')
  }

  // Chat
  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    setChatLoading(true)

    const history: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(history)

    const res = await window.electronAPI.ai.chat(history, scanResults)
    if (res.ok) {
      const newMessages: ChatMessage[] = [...history, { role: 'assistant', content: res.data.reply }]
      if (res.data.selectRuleIds && res.data.selectRuleIds.length > 0) {
        applyAiSelection(res.data.selectRuleIds)
        newMessages.push({
          role: 'system',
          content: `🪄 已为你勾选 ${res.data.selectRuleIds.length} 个类别`,
        })
      }
      setChatMessages(newMessages)
    } else {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `错误：${res.error}` }])
    }
    setChatLoading(false)
  }, [chatInput, chatMessages, scanResults])

  // Large files
  const handleLargeScan = async () => {
    setLargeScanning(true)
    setLargeFiles([])
    const req: LargeFileScanRequest = { searchPath: largePath, minSizeMB: largeMinMB }
    await window.electronAPI.cleaner.scanLargeFiles(req)
  }

  const handleCancelLargeScan = async () => {
    await window.electronAPI.cleaner.cancelLargeFileScan()
    setLargeScanning(false)
  }

  const handleBrowseForLarge = async () => {
    const res = await window.electronAPI.dialog.selectDirectory()
    if (res.ok && res.data) setLargePath(res.data)
  }

  const handleLocateFile = async (filePath: string) => {
    await window.electronAPI.shell.openLocation(filePath)
  }

  // Computed
  const availableResults = scanResults.filter((r) => r.accessible && r.sizeBytes > 0)
  const inaccessibleResults = scanResults.filter((r) => !r.accessible)
  const totalReclaimable = availableResults.reduce((s, r) => s + r.sizeBytes, 0)
  const selectedBytes = availableResults.reduce(
    (s, r) => s + (selectedIds.has(r.ruleId) ? r.sizeBytes : 0),
    0,
  )
  const selectedCount = availableResults.reduce(
    (s, r) => s + (selectedIds.has(r.ruleId) ? r.fileCount : 0),
    0,
  )

  return {
    // global
    aiEnabled,
    tab,
    setTab,
    toast,

    // rules
    rules,
    scanResults,
    scanning,
    hasScanned,
    selectedIds,
    setSelectedIds,
    permanent,
    setPermanent,
    cleaning,
    cleanDialog,
    setCleanDialog,
    availableResults,
    inaccessibleResults,
    totalReclaimable,
    selectedBytes,
    selectedCount,

    // insights
    insights,
    insightsLoading,
    aiHighlightIds,
    scanPlan,
    narration,

    // chat
    chatOpen,
    setChatOpen,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    sendChat,

    // large files
    largePath,
    setLargePath,
    largeMinMB,
    setLargeMinMB,
    largeFiles,
    largeScanning,

    // actions
    handleScan,
    handleCancelScan,
    toggleSelect,
    applyAiSelection,
    addToSelection,
    handleClean,
    runPreset,
    handleLargeScan,
    handleCancelLargeScan,
    handleBrowseForLarge,
    handleLocateFile,
  }
}