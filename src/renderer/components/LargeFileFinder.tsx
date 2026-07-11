import { useState, useMemo } from 'react'
import {
  RefreshCw,
  Search,
  FolderOpen,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import type { LargeFile, LargeFileCategory, AiLargeFileTag } from '../../shared/types'
import { formatSize } from './useDiskCleaner'
import { useToast } from './Toast'
import Modal from './Modal'

interface Props {
  aiEnabled: boolean
  largePath: string
  largeMinMB: number
  largeFiles: LargeFile[]
  largeScanning: boolean
  onSetPath: (v: string) => void
  onSetMinMB: (v: number) => void
  onScan: () => void
  onCancelScan: () => void
  onBrowse: () => void
  onLocate: (path: string) => void
  onRemoveFiles: (paths: string[]) => void
}

const CLEANABILITY_STYLE: Record<string, { bg: string; text: string }> = {
  '通常可删': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '可能重要': { bg: 'bg-amber-50', text: 'text-amber-600' },
  '需判断': { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const TAG_STYLE: Record<string, { bg: string; text: string }> = {
  '安全清理': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '建议保留': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '需人工判断': { bg: 'bg-amber-50', text: 'text-amber-600' },
}

export default function LargeFileFinder({
  aiEnabled,
  largePath,
  largeMinMB,
  largeFiles,
  largeScanning,
  onSetPath,
  onSetMinMB,
  onScan,
  onCancelScan,
  onBrowse,
  onLocate,
  onRemoveFiles,
}: Props) {
  const toast = useToast().toast
  const [classifying, setClassifying] = useState(false)
  const [categories, setCategories] = useState<Record<string, LargeFileCategory>>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [aiTags, setAiTags] = useState<Record<string, AiLargeFileTag>>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [deleteTarget, setDeleteTarget] = useState<LargeFile | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<{ label: string; files: LargeFile[] } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const grouped = useMemo(() => {
    if (Object.keys(categories).length === 0) return []
    const map = new Map<string, { cat: string; cleanability: string; reason: string; files: LargeFile[]; totalSize: number }>()
    for (const f of largeFiles) {
      const c = categories[f.path]
      if (!c) continue
      const existing = map.get(c.category)
      if (existing) {
        existing.files.push(f)
        existing.totalSize += f.sizeBytes
      } else {
        map.set(c.category, { cat: c.category, cleanability: c.cleanability, reason: c.reason, files: [f], totalSize: f.sizeBytes })
      }
    }
    return [...map.values()].sort((a, b) => b.totalSize - a.totalSize)
  }, [categories, largeFiles])

  const doClassify = async () => {
    if (largeFiles.length === 0) return
    setClassifying(true)
    const res = await window.electronAPI.ai.classifyLargeFiles(largeFiles)
    if (res.ok) {
      const map: Record<string, LargeFileCategory> = {}
      for (let i = 0; i < largeFiles.length; i++) {
        map[largeFiles[i].path] = res.data[i]
      }
      setCategories(map)
    }
    setClassifying(false)
  }

  const doAnalyze = async () => {
    if (largeFiles.length === 0) return
    setAnalyzing(true)
    const res = await window.electronAPI.ai.analyzeLargeFiles(largeFiles)
    if (res.ok) {
      const map: Record<string, AiLargeFileTag> = {}
      for (const tag of res.data) map[tag.path] = tag
      setAiTags(map)
    }
    setAnalyzing(false)
  }

  const toggleGroup = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleTrashFile = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await window.electronAPI.cleaner.trashFile(deleteTarget.path)
    setDeleting(false)
    setDeleteTarget(null)
    if (res.ok) {
      toast(`已移入回收站: ${deleteTarget.name}`, 'success')
      onRemoveFiles([deleteTarget.path])
    } else {
      toast(res.error || '删除失败', 'error')
    }
  }

  const handleTrashGroup = async () => {
    if (!deleteGroup || deleteGroup.files.length === 0) return
    setDeleting(true)
    let ok = 0
    let fail = 0
    for (const f of deleteGroup.files) {
      const res = await window.electronAPI.cleaner.trashFile(f.path)
      if (res.ok) ok++
      else fail++
    }
    setDeleting(false)
    setDeleteGroup(null)
    if (ok > 0) toast(`已移入回收站: ${ok} 个文件${fail > 0 ? `（${fail} 个失败）` : ''}`, 'success')
    else toast('删除失败', 'error')
    onRemoveFiles(deleteGroup.files.map(f => f.path))
  }

  const totalBytes = largeFiles.reduce((s, f) => s + f.sizeBytes, 0)
  const sorted = [...largeFiles].sort((a, b) => b.sizeBytes - a.sizeBytes)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <FolderOpen size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={largePath}
            onChange={(e) => onSetPath(e.target.value)}
            className="w-full border border-gray-300 rounded-2xl pl-8 pr-8 py-1.5 text-sm truncate focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
          <button
            onClick={onBrowse}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            <FolderOpen size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400">≥</span>
          <input
            type="number"
            value={largeMinMB}
            onChange={(e) => onSetMinMB(parseInt(e.target.value, 10) || 100)}
            className="w-16 border border-gray-300 rounded-2xl px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          <span className="text-xs text-gray-400">MB</span>
        </div>
        <button
          onClick={largeScanning ? onCancelScan : onScan}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium shadow-sm transition-colors ${
            largeScanning
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          {largeScanning ? <><X size={13} />停止</> : '扫描'}
        </button>
      </div>

      {/* Action buttons */}
      {largeFiles.length > 0 && (
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <span className="text-xs text-gray-500">
            共 <span className="font-semibold text-gray-700">{largeFiles.length}</span> 个文件，总计{' '}
            <span className="font-semibold text-gray-700">{formatSize(totalBytes)}</span>
          </span>
          <div className="flex-1" />
          <button
            onClick={doClassify}
            disabled={classifying}
            className="flex items-center gap-1 px-2.5 py-1 rounded-2xl text-2xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-40 transition-colors"
          >
            <Sparkles size={11} className={classifying ? 'animate-pulse' : ''} />
            {classifying ? '分类中…' : Object.keys(categories).length > 0 ? '重新分类' : 'AI 智能分类'}
          </button>
          {aiEnabled && (
            <button
              onClick={doAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-2xl text-2xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 transition-colors"
            >
              <Sparkles size={11} className={analyzing ? 'animate-pulse' : ''} />
              {analyzing ? '研判中…' : 'AI 逐个研判'}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-auto">
        {largeScanning && largeFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <RefreshCw size={20} className="text-primary animate-spin" />
            <span className="text-xs text-gray-400">正在扫描大文件…</span>
          </div>
        ) : grouped.length > 0 ? (
          <div className="space-y-2">
            {grouped.map((g) => {
              const style = CLEANABILITY_STYLE[g.cleanability] || CLEANABILITY_STYLE['需判断']
              const isCol = collapsed.has(g.cat)
              return (
                <div key={g.cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors group/gh">
                    <button onClick={() => toggleGroup(g.cat)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      {isCol ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <span className="text-sm font-semibold text-gray-700">{g.cat}</span>
                    <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {g.cleanability}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {g.files.length} 个 · <span className="font-semibold text-gray-700">{formatSize(g.totalSize)}</span>
                    </span>
                    <button
                      onClick={() =>
                        setDeleteGroup({ label: g.cat, files: g.files })
                      }
                      className="ml-2 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/gh:opacity-100 transition-all"
                      title={`删除全部 ${g.files.length} 个文件`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {g.reason && !isCol && (
                    <div className="px-4 py-1.5 text-2xs text-gray-500 bg-gray-50/60 border-t border-gray-100 flex items-center gap-1">
                      <Info size={10} />
                      {g.reason}
                    </div>
                  )}
                  {!isCol &&
                    g.files.map((f) => {
                      const tag = aiTags[f.path]
                      return (
                        <div key={f.path} className="flex items-center px-4 py-2 border-t border-gray-100 hover:bg-gray-50 group/f">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-700 truncate">{f.name}</div>
                            <div className="text-2xs text-gray-400 truncate">{f.path}</div>
                          </div>
                          {tag && (
                            <span
                              className={`text-2xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${TAG_STYLE[tag.tag].bg} ${TAG_STYLE[tag.tag].text}`}
                              title={tag.reason}
                            >
                              {tag.tag}
                            </span>
                          )}
                          <div className="text-xs text-gray-500 tabular-nums w-20 text-right shrink-0 ml-2 font-semibold">
                            {formatSize(f.sizeBytes)}
                          </div>
                          <button
                            onClick={() => setDeleteTarget(f)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-1 opacity-0 group-hover/f:opacity-100"
                            title="移入回收站"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => onLocate(f.path)}
                            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-light transition-colors shrink-0 ml-1"
                            title="在资源管理器中定位"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        ) : largeFiles.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="flex items-center px-4 h-9 text-xs font-semibold text-gray-500 border-b border-gray-200 bg-gray-50">
              <div className="flex-1">文件</div>
              <div className="w-24 shrink-0 text-right">大小</div>
              <div className="w-24 shrink-0" />
            </div>
            {sorted.map((f) => (
              <div key={f.path} className="flex items-center px-4 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group/f">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{f.name}</div>
                  <div className="text-2xs text-gray-400 truncate">{f.path}</div>
                </div>
                <div className="w-24 shrink-0 text-right text-sm text-gray-600 tabular-nums font-semibold">
                  {formatSize(f.sizeBytes)}
                </div>
                <div className="w-24 shrink-0 flex justify-end gap-1">
                  <button
                    onClick={() => setDeleteTarget(f)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover/f:opacity-100"
                    title="移入回收站"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => onLocate(f.path)}
                    className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-light transition-colors"
                    title="定位"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16">
            <Search size={24} className="text-gray-300" />
            <p className="text-sm text-gray-500">选择目录，设置阈值，扫描大文件</p>
            <p className="text-xs text-gray-400">使用回收站安全删除，不会永久丢失</p>
          </div>
        )}
      </div>

      {/* Single file delete dialog */}
      {deleteTarget && (
        <Modal open={true} onClose={() => setDeleteTarget(null)} width="w-[24rem] p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-700">移入回收站</h3>
              <p className="text-xs text-gray-500 mt-1 truncate">确定要将 "{deleteTarget.name}" 移入回收站吗？</p>
              <p className="text-xs text-gray-400 mt-0.5">文件可随时从回收站恢复。</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">
              取消
            </button>
            <button
              onClick={handleTrashFile}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-2xl hover:bg-amber-600 disabled:opacity-40 shadow-sm transition-colors"
            >
              {deleting ? '删除中…' : '移入回收站'}
            </button>
          </div>
        </Modal>
      )}

      {/* Group delete dialog */}
      {deleteGroup && (
        <Modal open={true} onClose={() => setDeleteGroup(null)} width="w-[24rem] p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700">批量移入回收站</h3>
              <p className="text-xs text-gray-500 mt-1">
                将 "{deleteGroup.label}" 的全部 {deleteGroup.files.length} 个文件（共 {formatSize(deleteGroup.files.reduce((s, f) => s + f.sizeBytes, 0))}）移入回收站？
              </p>
              <p className="text-xs text-gray-400 mt-0.5">文件可随时从回收站恢复。</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteGroup(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors">
              取消
            </button>
            <button
              onClick={handleTrashGroup}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-2xl hover:bg-amber-600 disabled:opacity-40 shadow-sm transition-colors"
            >
              {deleting ? '删除中…' : '全部移入回收站'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}