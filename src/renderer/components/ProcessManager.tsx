import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Timer,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  ShieldOff,
  AlertTriangle,
  Cpu,
} from 'lucide-react'
import type { ProcessInfo, AutoStartEntry } from '../../shared/types'
import VirtualList from './VirtualList'
import ProgressBar from './ProgressBar'
import { useToast } from './Toast'

function formatMem(mb: number): string {
  if (mb < 1024) return mb.toFixed(1) + ' MB'
  return (mb / 1024).toFixed(2) + ' GB'
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const toast = useToast().toast
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [sortCol, setSortCol] = useState('memoryMB')
  const [sortAsc, setSortAsc] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>()
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>()
  const requestVersionRef = useRef(0)

  const [killDialog, setKillDialog] = useState<{ visible: boolean; proc: ProcessInfo | null }>({
    visible: false,
    proc: null,
  })
  const [restartDialog, setRestartDialog] = useState<{
    visible: boolean
    proc: ProcessInfo | null
  }>({ visible: false, proc: null })
  const [autostartDialog, setAutostartDialog] = useState<{
    visible: boolean
    entries: AutoStartEntry[] | null
    procName: string
  }>({ visible: false, entries: null, procName: '' })

  const refresh = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    setProcesses([])
    try {
      const res = await window.electronAPI.processManager.list()
      if (!res.ok) {
        setLoading(false)
        setErrorMsg(res.error)
        return
      }
      requestVersionRef.current = res.data
    } catch (e) {
      setLoading(false)
      setErrorMsg(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    const unsubBatch = window.electronAPI.processManager.onBatch((version, batch) => {
      if (version !== requestVersionRef.current) return
      setProcesses((prev) => [...prev, ...batch])
    })
    const unsubComplete = window.electronAPI.processManager.onComplete((version) => {
      if (version !== requestVersionRef.current) return
      setLoading(false)
    })
    const unsubError = window.electronAPI.processManager.onError((version, message) => {
      if (version !== requestVersionRef.current) return
      setErrorMsg(message)
      setLoading(false)
    })
    refresh()
    return () => {
      unsubBatch()
      unsubComplete()
      unsubError()
      void window.electronAPI.processManager.cancelList()
    }
  }, [refresh])

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      clearInterval(refreshTimerRef.current)
      clearInterval(countdownTimerRef.current)
      setAutoRefresh(false)
    } else {
      setCountdown(5)
      setAutoRefresh(true)
      refreshTimerRef.current = setInterval(() => {
        refresh()
        setCountdown(5)
      }, 5000)
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 5))
      }, 1000)
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(refreshTimerRef.current)
      clearInterval(countdownTimerRef.current)
    }
  }, [])

  const doKill = async (pid: number) => {
    try {
      await window.electronAPI.processManager.kill(pid)
      toast(`已结束进程 ${pid}`, 'success')
    } catch {
      toast('结束进程失败', 'error')
    }
    setKillDialog({ visible: false, proc: null })
    refresh()
  }

  const doRestart = async (pid: number, exePath: string) => {
    try {
      await window.electronAPI.processManager.restart(pid, exePath)
      toast(`正在重启进程 ${pid}`, 'success')
    } catch {
      toast('重启进程失败', 'error')
    }
    setRestartDialog({ visible: false, proc: null })
    refresh()
  }

  const handleDisableAutoStart = async (proc: ProcessInfo) => {
    if (!proc.exePath) return
    const res = await window.electronAPI.processManager.autostart(proc.exePath)
    if (res.ok && res.data.length > 0) {
      setAutostartDialog({ visible: true, entries: res.data, procName: proc.name })
    } else {
      setAutostartDialog({ visible: true, entries: null, procName: proc.name })
    }
  }

  const doDisableAutoStart = async () => {
    const entries = autostartDialog.entries
    if (!entries?.length) return
    for (const e of entries) {
      await window.electronAPI.processManager.disableAutostart(e.type, e.name)
    }
    setAutostartDialog({ visible: false, entries: null, procName: '' })
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else {
      setSortCol(col)
      setSortAsc(false)
    }
  }

  const filtered = useMemo(() => {
    const kw = searchKeyword.toLowerCase()
    let result = processes
    if (kw) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          String(p.pid).includes(kw) ||
          p.ports.some((port) => String(port).includes(kw)),
      )
    }
    const asc = sortAsc ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (sortCol) {
        case 'pid':
          return (a.pid - b.pid) * asc
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN') * asc
        case 'cpuPercent':
          return (a.cpuPercent - b.cpuPercent) * asc
        case 'memoryMB':
          return (a.memoryMB - b.memoryMB) * asc
        default:
          return 0
      }
    })
    return result
  }, [processes, searchKeyword, sortCol, sortAsc])

  const cols = [
    { key: 'pid', label: 'PID', cls: 'w-14 shrink-0', sortable: true },
    { key: 'name', label: '进程', cls: 'flex-1 min-w-0', sortable: true },
    { key: 'cpuPercent', label: 'CPU', cls: 'w-24 shrink-0', sortable: true },
    { key: 'memoryMB', label: '内存', cls: 'w-24 shrink-0', sortable: true },
    { key: 'ports', label: '端口', cls: 'w-36 shrink-0', sortable: false },
    { key: 'actions', label: '操作', cls: 'w-20 shrink-0 text-right', sortable: false },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-60">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索进程名称、PID 或端口…"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400 font-mono">
            <span className="text-primary">{filtered.length}</span> 进程
          </span>
          {autoRefresh && (
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-mono">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              {countdown}s
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-colors"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            刷新
          </button>
          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs border transition-colors ${autoRefresh ? 'bg-emerald-50 text-emerald-600 border-emerald-300' : 'text-gray-500 border-gray-300 hover:bg-gray-50'}`}
          >
            <Timer size={15} />
            {autoRefresh ? '停止' : '自动'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {loading && filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-card h-full flex items-center justify-center">
            <ProgressBar label="加载进程列表..." />
          </div>
        ) : filtered.length > 0 ? (
          <VirtualList
            items={filtered}
            rowHeight={36}
            className="bg-white rounded-lg border border-gray-200 shadow-card h-full"
            header={
              <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
                {cols.map((col) => (
                  <div
                    key={col.key}
                    className={`flex items-center gap-1 px-3 py-2 ${col.cls} ${col.sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="uppercase tracking-wider">{col.label}</span>
                    {col.sortable &&
                      (sortCol === col.key ? (
                        sortAsc ? (
                          <ChevronUp size={14} className="text-primary" />
                        ) : (
                          <ChevronDown size={14} className="text-primary" />
                        )
                      ) : (
                        <ChevronsUpDown size={14} className="text-gray-300" />
                      ))}
                  </div>
                ))}
              </div>
            }
            renderRow={(p) => (
              <div className="flex items-center h-9 border-b border-gray-100 hover:bg-primary-light/30 group text-sm transition-colors">
                <div className="w-14 shrink-0 px-3 font-mono text-xs text-gray-500">{p.pid}</div>
                <div className="flex-1 min-w-0 px-3">
                  <div className="font-medium text-gray-700 truncate">{p.name}</div>
                  {p.exePath && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{p.exePath}</div>
                  )}
                </div>
                <div className="w-24 shrink-0 px-3">
                  {p.cpuPercent > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-sm transition-all ${p.cpuPercent > 50 ? 'bg-red-500' : p.cpuPercent > 20 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: Math.min(p.cpuPercent, 100) + '%' }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {p.cpuPercent.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="w-24 shrink-0 px-3">
                  <span className="text-xs font-mono text-gray-700">{formatMem(p.memoryMB)}</span>
                </div>
                <div className="w-36 shrink-0 px-3">
                  {p.ports.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.ports.slice(0, 5).map((port) => (
                        <span
                          key={port}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary-light text-primary"
                        >
                          {port}
                        </span>
                      ))}
                      {p.ports.length > 5 && (
                        <span className="text-xs text-gray-400 font-mono">
                          +{p.ports.length - 5}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="w-20 shrink-0 flex justify-end gap-0.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDisableAutoStart(p)}
                    disabled={!p.exePath}
                    className="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                    title="禁止自启动"
                  >
                    <ShieldOff size={15} />
                  </button>
                  <button
                    onClick={() => setRestartDialog({ visible: true, proc: p })}
                    disabled={!p.exePath}
                    className="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                    title="重启进程"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setKillDialog({ visible: true, proc: p })}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="结束进程"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 bg-white rounded-lg border border-gray-200 shadow-card">
            <div className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-primary-light">
              <Cpu size={18} className="text-primary/50" />
            </div>
            <p className={`text-xs ${errorMsg ? 'text-danger' : 'text-gray-400'}`}>
              {errorMsg
                ? `加载失败：${errorMsg}`
                : searchKeyword
                  ? '未找到匹配的进程'
                  : '暂无进程数据'}
            </p>
          </div>
        )}
      </div>

      {killDialog.visible && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setKillDialog({ visible: false, proc: null })}
        >
          <div
            className="bg-white rounded-2xl p-5 w-[22rem] shadow-modal animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-danger-light border border-danger/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={14} className="text-danger" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">确认结束进程</h3>
                <p className="text-xs text-gray-500 mt-1">
                  确定要结束进程 &quot;{killDialog.proc?.name}&quot; (PID: {killDialog.proc?.pid})
                  吗？
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setKillDialog({ visible: false, proc: null })}
                className="px-5 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => doKill(killDialog.proc!.pid)}
                className="px-5 py-2 text-sm text-white bg-danger rounded-lg hover:bg-danger-hover transition-colors shadow-sm"
              >
                确认结束
              </button>
            </div>
          </div>
        </div>
      )}

      {restartDialog.visible && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setRestartDialog({ visible: false, proc: null })}
        >
          <div
            className="bg-white rounded-2xl p-5 w-[22rem] shadow-modal animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-warning-light border border-warning/30 flex items-center justify-center shrink-0">
                <RefreshCw size={14} className="text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">确认重启进程</h3>
                <p className="text-xs text-gray-500 mt-1">
                  确定要重启进程 &quot;{restartDialog.proc?.name}&quot; (PID:{' '}
                  {restartDialog.proc?.pid}) 吗？
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestartDialog({ visible: false, proc: null })}
                className="px-5 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => doRestart(restartDialog.proc!.pid, restartDialog.proc!.exePath)}
                className="px-5 py-2 text-sm text-white bg-warning rounded-lg hover:bg-warning-hover transition-colors shadow-sm"
              >
                确认重启
              </button>
            </div>
          </div>
        </div>
      )}

      {autostartDialog.visible && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setAutostartDialog({ visible: false, entries: null, procName: '' })}
        >
          <div
            className="bg-white rounded-2xl p-5 w-[28rem] shadow-modal animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-warning-light border border-warning/30 flex items-center justify-center shrink-0">
                <ShieldOff size={14} className="text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-700">禁止自启动</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {autostartDialog.entries?.length
                    ? `发现进程 "${autostartDialog.procName}" 的 ${autostartDialog.entries.length} 个自启动项`
                    : `未发现进程 "${autostartDialog.procName}" 的自启动配置。`}
                </p>
                {autostartDialog.entries && autostartDialog.entries.length > 0 && (
                  <ul className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                    {autostartDialog.entries.map((e, i) => (
                      <li key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">{e.name}</span>
                        <span className="text-gray-300 mx-1">·</span>
                        <span className="text-gray-400 truncate block">{e.path}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAutostartDialog({ visible: false, entries: null, procName: '' })}
                className="px-5 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              {autostartDialog.entries && autostartDialog.entries.length > 0 && (
                <button
                  onClick={doDisableAutoStart}
                  className="px-5 py-2 text-sm text-white bg-warning rounded-lg hover:bg-warning-hover transition-colors shadow-sm"
                >
                  确认禁用
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
