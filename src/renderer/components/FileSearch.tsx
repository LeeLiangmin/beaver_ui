import { useState, useEffect, useCallback } from 'react'
import { Search, Folder, File, X, Loader2 } from 'lucide-react'
import type { FileInfo, SearchRequest } from '../../shared/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function FileSearch() {
  const [keyword, setKeyword] = useState('')
  const [searchPath, setSearchPath] = useState('C:\\')
  const [drives, setDrives] = useState<string[]>([])
  const [results, setResults] = useState<FileInfo[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    window.electronAPI.fileSearch.getDrives().then((res) => {
      if (res.ok) setDrives(res.data)
    })
  }, [])

  useEffect(() => {
    const unsubFound = window.electronAPI.fileSearch.onFound((files) => {
      setResults((prev) => [...prev, ...files])
    })
    const unsubComplete = window.electronAPI.fileSearch.onComplete(() => {
      setSearching(false)
    })
    return () => {
      unsubFound()
      unsubComplete()
    }
  }, [])

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return
    setResults([])
    setSearching(true)
    const req: SearchRequest = { keyword: keyword.trim(), searchPath }
    await window.electronAPI.fileSearch.search(req)
  }, [keyword, searchPath])

  const handleCancel = async () => {
    await window.electronAPI.fileSearch.cancel()
    setSearching(false)
  }

  const handleOpen = async (filePath: string) => {
    await window.electronAPI.shell.openPath(filePath)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">文件搜索</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={searchPath}
          onChange={(e) => setSearchPath(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {drives.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入关键词搜索..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {searching ? (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            <X size={16} />
            取消
          </button>
        ) : (
          <button
            onClick={handleSearch}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            <Search size={16} />
            搜索
          </button>
        )}
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader2 size={16} className="animate-spin" />
          搜索中...
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">名称</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-32">大小</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 w-48">路径</th>
            </tr>
          </thead>
          <tbody>
            {results.map((f, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onDoubleClick={() => handleOpen(f.path)}
              >
                <td className="px-4 py-2 flex items-center gap-2">
                  {f.isDir ? (
                    <Folder size={16} className="text-yellow-500 shrink-0" />
                  ) : (
                    <File size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {f.isDir ? '-' : formatSize(f.size)}
                </td>
                <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{f.path}</td>
              </tr>
            ))}
            {!searching && results.length === 0 && keyword && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  无搜索结果
                </td>
              </tr>
            )}
            {!searching && !keyword && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  输入关键词开始搜索
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
