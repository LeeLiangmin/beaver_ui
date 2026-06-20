import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Download } from 'lucide-react'
import type { EnvEntry } from '../../shared/types'

export default function EnvManager() {
  const [processEnv, setProcessEnv] = useState<EnvEntry[]>([])
  const [systemEnv, setSystemEnv] = useState<EnvEntry[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')

  const refresh = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      window.electronAPI.env.getProcessEnv(),
      window.electronAPI.env.getSystemEnv(),
    ])
    if (pRes.ok) setProcessEnv(pRes.data)
    if (sRes.ok) setSystemEnv(sRes.data)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleAdd = async () => {
    if (!newName.trim() || !newValue.trim()) return
    await window.electronAPI.env.setVar(newName.trim(), newValue.trim())
    setNewName('')
    setNewValue('')
    setShowAdd(false)
    refresh()
  }

  const handleDelete = async (name: string) => {
    await window.electronAPI.env.deleteVar(name)
    refresh()
  }

  const handleBackup = async () => {
    const res = await window.electronAPI.env.backup('env-backup.toml')
    if (res.ok) alert(`已备份到: ${res.data}`)
  }

  const allEnv = [...processEnv, ...systemEnv].filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">环境变量</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          刷新
        </button>
        <button
          onClick={handleBackup}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Download size={14} />
          备份
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索变量名..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="变量名"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
            autoFocus
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="值"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button onClick={handleAdd} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-56">名称</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">值</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">作用域</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {allEnv.map((e, i) => (
              <tr key={`${e.scope}-${e.name}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs font-medium">{e.name}</td>
                <td className="px-4 py-2 text-gray-600 text-xs truncate max-w-lg" title={e.value}>
                  {e.value}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    e.scope === 'system' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {e.scope === 'system' ? '系统' : '用户'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {e.scope === 'user' && (
                    <button
                      onClick={() => handleDelete(e.name)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
