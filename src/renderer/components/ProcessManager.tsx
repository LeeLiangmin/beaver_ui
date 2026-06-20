import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, XCircle } from 'lucide-react'
import type { ProcessInfo, AutoStartEntry } from '../../shared/types'

function formatMem(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${(kb / (1024 * 1024)).toFixed(2)} GB`
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [autostarts, setAutostarts] = useState<AutoStartEntry[]>([])
  const [ports, setPorts] = useState<{ pid: number; port: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'processes' | 'autostart'>('processes')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [pRes, aRes, portRes] = await Promise.all([
      window.electronAPI.processManager.list(),
      window.electronAPI.processManager.autostart(),
      window.electronAPI.processManager.ports(),
    ])
    if (pRes.ok) {
      const portMap = new Map<number, number[]>()
      if (portRes.ok) {
        for (const { pid, port } of portRes.data) {
          if (!portMap.has(pid)) portMap.set(pid, [])
          portMap.get(pid)!.push(port)
        }
      }
      setProcesses(
        pRes.data.map((p) => ({ ...p, cpu: (portMap.get(p.pid) || []).join(', ') }))
      )
    }
    if (aRes.ok) setAutostarts(aRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleKill = async (pid: number) => {
    await window.electronAPI.processManager.kill(pid)
    setProcesses((prev) => prev.filter((p) => p.pid !== pid))
  }

  const handleRemoveAutostart = async (entry: AutoStartEntry) => {
    await window.electronAPI.processManager.removeAutostart(entry.name, entry.source)
    setAutostarts((prev) => prev.filter((e) => e.name !== entry.name))
  }

  const filtered = processes.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.pid).includes(search)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">进程管理</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('processes')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === 'processes' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          进程列表
        </button>
        <button
          onClick={() => setTab('autostart')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === 'autostart' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          开机自启
        </button>
      </div>

      {tab === 'processes' && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索进程名或 PID..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400 w-64"
          />
          <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">PID</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-28">内存</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-28">端口</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.pid} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 font-mono">{p.pid}</td>
                    <td className="px-4 py-2 truncate max-w-xs">{p.name}</td>
                    <td className="px-4 py-2 text-gray-500">{formatMem(p.memoryKB)}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">{p.cpu || '-'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleKill(p.pid)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs transition-colors"
                      >
                        <XCircle size={14} />
                        结束
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">无匹配进程</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'autostart' && (
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">路径</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-16">来源</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {autostarts.map((e, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-md">{e.path}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{e.source}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleRemoveAutostart(e)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      <XCircle size={14} />
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {autostarts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">无开机自启项</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
