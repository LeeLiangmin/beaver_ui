import { useState, useEffect, useCallback } from 'react'
import { Search, Folder, FolderOpen, File, X, Trash2, Eye } from 'lucide-react'
import type { FileInfo, SearchRequest } from '../../shared/types'
import VirtualList from './VirtualList'
import ProgressBar from './ProgressBar'
import FilePreviewModal from './FilePreviewModal'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN')
}

export default function FileSearch() {
  const [keyword, setKeyword] = useState('')
  const [searchPath, setSearchPath] = useState('C:\\')
  const [fileType, setFileType] = useState<'all' | 'file' | 'dir'>('all')
  const [drives, setDrives] = useState<string[]>([])
  const [results, setResults] = useState<FileInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [previewPath, setPreviewPath] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.fileSearch.getDrives().then((res) => {
      if (res.ok && res.data.length > 0) {
        setDrives(res.data)
        if (!searchPath) setSearchPath(res.data[0])
      }
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
    setHasSearched(true)
    const req: SearchRequest = { keyword: keyword.trim(), searchPath, fileType }
    await window.electronAPI.fileSearch.search(req)
  }, [keyword, searchPath, fileType])

  const handleCancel = async () => {
    await window.electronAPI.fileSearch.cancel()
    setSearching(false)
  }

  const handleClear = () => {
    setResults([])
    setHasSearched(false)
  }

  const handleOpen = async (filePath: string) => {
    await window.electronAPI.shell.openPath(filePath)
  }

  const handleOpenLocation = async (filePath: string) => {
    await window.electronAPI.shell.openLocation(filePath)
  }

  const handleBrowse = async () => {
    const res = await window.electronAPI.dialog.selectDirectory()
    if (res.ok && res.data) setSearchPath(res.data)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入文件名关键词…"
              className="w-full border border-gray-300 rounded-2xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
            />
          </div>
          <div className="relative flex-[1.4] min-w-0">
            <Folder
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchPath}
              readOnly
              className="w-full border border-gray-300 rounded-2xl pl-8 pr-8 py-2 text-sm truncate cursor-default focus:outline-none bg-gray-50"
            />
            <button
              onClick={handleBrowse}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
              title="浏览目录"
            >
              <FolderOpen size={15} />
            </button>
          </div>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as any)}
            className="border border-gray-300 rounded-2xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
          >
            <option value="all">全部类型</option>
            <option value="file">文件</option>
            <option value="dir">目录</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-2xl text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              <Search size={15} />
              {searching ? '搜索中…' : '搜索'}
            </button>
            <button
              onClick={handleCancel}
              disabled={!searching}
              className="flex items-center gap-1 px-2.5 py-2 border border-gray-300 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <X size={15} />
              停止
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-2 border border-gray-300 rounded-2xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Trash2 size={15} />
              清空
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 mr-1">快速选择：</span>
          {drives.map((d) => (
            <button
              key={d}
              onClick={() => setSearchPath(d)}
              className={`px-3 py-0.5 text-xs font-mono rounded-full border transition-colors ${
                searchPath === d
                  ? 'bg-primary-light text-primary border-primary/30'
                  : 'text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {results.length > 0 && (
              <>
                <span className="text-primary font-mono">{results.length}</span> 个结果
              </>
            )}
            {searching && (
              <span className="ml-2">
                <ProgressBar />
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {searching && results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card h-full flex items-center justify-center">
            <ProgressBar label="正在搜索..." />
          </div>
        ) : results.length > 0 ? (
          <VirtualList
            items={results}
            rowHeight={36}
            className="bg-white rounded-2xl border border-gray-200 shadow-card h-full"
            header={
              <div className="flex bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 h-8 items-center">
                <div className="w-7 shrink-0"></div>
                <div className="flex-1 min-w-0 px-3">文件名</div>
                <div className="w-72 shrink-0 px-3">路径</div>
                <div className="w-20 shrink-0 px-3 text-right">大小</div>
                <div className="w-40 shrink-0 px-3">修改时间</div>
                <div className="w-14 shrink-0 text-center">操作</div>
              </div>
            }
            renderRow={(f) => (
              <div className="flex items-center h-9 border-b border-gray-100 hover:bg-primary-light/30 group text-sm transition-colors">
                <div className="w-7 shrink-0 flex justify-center">
                  {f.isDir ? (
                    <Folder size={13} className="text-amber-500" />
                  ) : (
                    <File size={13} className="text-primary" />
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 px-3 font-medium text-gray-700 truncate"
                  title={f.name}
                >
                  {f.name}
                </div>
                <div className="w-72 shrink-0 px-3 text-xs text-gray-400 truncate" title={f.path}>
                  {f.path}
                </div>
                <div className="w-20 shrink-0 px-3 text-right text-xs font-mono text-gray-500">
                  {f.isDir ? '—' : formatSize(f.size)}
                </div>
                <div className="w-40 shrink-0 px-3 text-xs font-mono text-gray-500">
                  {f.modTime > 0 ? formatTime(f.modTime) : '—'}
                </div>
                <div className="w-14 shrink-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!f.isDir && (
                    <>
                      <button
                        onClick={() => handleOpen(f.path)}
                        className="p-1 rounded text-primary hover:bg-primary-light transition-colors"
                        title="打开文件"
                      >
                        <FolderOpen size={15} />
                      </button>
                      <button
                        onClick={() => setPreviewPath(f.path)}
                        className="p-1 rounded text-indigo-500 hover:bg-indigo-50 transition-colors"
                        title="预览"
                      >
                        <Eye size={15} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleOpenLocation(f.path)}
                    className="p-1 rounded text-emerald-500 hover:bg-emerald-50 transition-colors"
                    title="打开所在位置"
                  >
                    <Folder size={15} />
                  </button>
                </div>
              </div>
            )}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 bg-white rounded-2xl border border-gray-200">
            <div className="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center bg-primary-light">
              <Search size={18} className="text-primary/50" />
            </div>
            <p className="text-xs text-gray-400">
              {hasSearched ? '未找到匹配的文件' : '输入关键词并选择路径，开始搜索'}
            </p>
          </div>
        )}
      </div>
      {previewPath && (
        <FilePreviewModal filePath={previewPath} onClose={() => setPreviewPath(null)} />
      )}
    </div>
  )
}
