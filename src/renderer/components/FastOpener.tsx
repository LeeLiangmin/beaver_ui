import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Pencil,
  FolderOpen,
  Folder,
  File,
  Zap,
  Search,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  LayoutGrid,
  Inbox,
} from 'lucide-react'
import type { OpenerGroup, OpenerItem } from '../../shared/types'

const COLORS: Record<string, string> = {
  teal: '#4DB6AC',
  cyan: '#26A69A',
  gold: '#FFD54F',
  pink: '#F8BBD0',
  green: '#80CBC4',
  coral: '#EF9A9A',
  lavender: '#CE93D8',
  orange: '#FFAB91',
}

export default function FastOpener() {
  const [groups, setGroups] = useState<OpenerGroup[]>([])
  const [items, setItems] = useState<OpenerItem[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [sortBy, setSortBy] = useState<'sortOrder' | 'name' | 'useCount' | 'lastUsed'>('sortOrder')
  const [invalidPaths, setInvalidPaths] = useState<Set<string>>(new Set())
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<OpenerGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: 'blue' })
  const [dragId, setDragId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const res = await window.electronAPI.opener.getAll()
    if (res.ok) {
      setGroups(res.data.groups)
      setItems(res.data.items)
      checkPaths(res.data.items)
    }
  }, [])

  const checkPaths = async (itemsList: OpenerItem[]) => {
    const invalid = new Set<string>()
    for (const item of itemsList) {
      const res = await window.electronAPI.opener.validatePath(item.path)
      if (res.ok && !res.data) invalid.add(item.id)
    }
    setInvalidPaths(invalid)
  }

  useEffect(() => {
    loadData()
  }, [loadData])
  useEffect(() => {
    const onClick = () => {
      setMoveMenuId(null)
      setShowAddMenu(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const addFile = async () => {
    setShowAddMenu(false)
    const res = await window.electronAPI.dialog.selectFile()
    if (res.ok && res.data) {
      const groupId = activeGroupId && activeGroupId !== '__ungrouped__' ? activeGroupId : ''
      await window.electronAPI.opener.addItem(res.data, groupId)
      loadData()
    }
  }

  const addDir = async () => {
    setShowAddMenu(false)
    const res = await window.electronAPI.dialog.selectDirectory()
    if (res.ok && res.data) {
      const groupId = activeGroupId && activeGroupId !== '__ungrouped__' ? activeGroupId : ''
      await window.electronAPI.opener.addItem(res.data, groupId)
      loadData()
    }
  }

  const openItem = async (item: OpenerItem) => {
    await window.electronAPI.opener.openItem(item.id)
    await window.electronAPI.shell.openPath(item.path)
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, useCount: i.useCount + 1, lastUsed: Math.floor(Date.now() / 1000) }
          : i,
      ),
    )
  }

  const openLocation = async (path: string) => {
    await window.electronAPI.shell.openLocation(path)
  }

  const removeItem = async (id: string) => {
    await window.electronAPI.opener.removeItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const moveToGroup = async (itemId: string, groupId: string) => {
    await window.electronAPI.opener.moveItem(itemId, groupId)
    setMoveMenuId(null)
    loadData()
  }

  const saveGroup = async () => {
    const name = groupForm.name.trim()
    if (!name) return
    if (editingGroup) {
      await window.electronAPI.opener.updateGroup({ ...editingGroup, name, color: groupForm.color })
    } else {
      await window.electronAPI.opener.addGroup(name, groupForm.color)
    }
    setShowGroupModal(false)
    setEditingGroup(null)
    setGroupForm({ name: '', color: 'blue' })
    loadData()
  }

  const removeGroup = async (id: string) => {
    await window.electronAPI.opener.removeGroup(id)
    if (activeGroupId === id) setActiveGroupId(null)
    loadData()
  }

  const groupItemCount = (groupId: string) => {
    if (groupId === '') return items.filter((i) => !i.groupId).length
    return items.filter((i) => i.groupId === groupId).length
  }

  const getGroup = (id: string) => groups.find((g) => g.id === id)

  const formatRelative = (ts: number): string => {
    if (!ts) return ''
    const diff = Math.floor(Date.now() / 1000) - ts
    if (diff < 60) return '刚刚'
    if (diff < 3600) return Math.floor(diff / 60) + 'm'
    if (diff < 86400) return Math.floor(diff / 3600) + 'h'
    if (diff < 2592000) return Math.floor(diff / 86400) + 'd'
    return new Date(ts * 1000).toLocaleDateString('zh-CN')
  }

  const handleDragStart = (id: string) => {
    setDragId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      return
    }
    const reordered = [...filteredItems]
    const fromIdx = reordered.findIndex((i) => i.id === dragId)
    const toIdx = reordered.findIndex((i) => i.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null)
      return
    }
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setItems((prev) => {
      const copy = [...prev]
      const fi = copy.findIndex((i) => i.id === dragId)
      const ti = copy.findIndex((i) => i.id === targetId)
      if (fi === -1 || ti === -1) return prev
      const [m] = copy.splice(fi, 1)
      copy.splice(ti, 0, m)
      return copy
    })
    await window.electronAPI.opener.updateSort(reordered.map((i) => i.id))
    setDragId(null)
  }

  let filteredItems = [...items]
  if (activeGroupId === '__ungrouped__') {
    filteredItems = filteredItems.filter((i) => !i.groupId)
  } else if (activeGroupId) {
    filteredItems = filteredItems.filter((i) => i.groupId === activeGroupId)
  }
  if (filterText) {
    const kw = filterText.toLowerCase()
    filteredItems = filteredItems.filter(
      (i) => i.name.toLowerCase().includes(kw) || i.path.toLowerCase().includes(kw),
    )
  }
  switch (sortBy) {
    case 'name':
      filteredItems.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'useCount':
      filteredItems.sort((a, b) => b.useCount - a.useCount)
      break
    case 'lastUsed':
      filteredItems.sort((a, b) => b.lastUsed - a.lastUsed)
      break
    default:
      filteredItems.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAddMenu(!showAddMenu)
            }}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus size={13} />
            添加
            <ChevronDown size={15} />
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-30 min-w-[120px]">
              <button
                onClick={addFile}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-light hover:text-primary transition-colors"
              >
                <File size={14} className="text-primary" />
                文件
              </button>
              <button
                onClick={addDir}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                <Folder size={14} className="text-amber-500" />
                目录
              </button>
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="relative w-52">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="搜索名称或路径…"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
        >
          <option value="sortOrder">默认排序</option>
          <option value="name">按名称</option>
          <option value="useCount">按使用次数</option>
          <option value="lastUsed">按最近使用</option>
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden gap-3">
        <aside className="w-40 shrink-0 bg-white rounded-lg border border-gray-200 shadow-card flex flex-col">
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => setActiveGroupId(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${activeGroupId === null ? 'bg-primary-light text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={12} />
              <span className="flex-1 text-left truncate">全部</span>
              <span className="text-gray-400">{items.length}</span>
            </button>
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer group/item ${activeGroupId === g.id ? 'bg-primary-light text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: COLORS[g.color] || g.color }}
                />
                <span className="flex-1 text-left truncate">{g.name}</span>
                <span className="text-gray-400">{groupItemCount(g.id)}</span>
                <div className="hidden group-hover/item:flex gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingGroup(g)
                      setGroupForm({ name: g.name, color: g.color })
                      setShowGroupModal(true)
                    }}
                    className="p-0.5 rounded text-gray-400 hover:text-primary transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeGroup(g.id)
                    }}
                    className="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setActiveGroupId('__ungrouped__')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${activeGroupId === '__ungrouped__' ? 'bg-primary-light text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Inbox size={12} />
              <span className="flex-1 text-left truncate">未分组</span>
              <span className="text-gray-400">{groupItemCount('')}</span>
            </button>
          </div>
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={() => {
                setEditingGroup(null)
                setGroupForm({ name: '', color: 'blue' })
                setShowGroupModal(true)
              }}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 border border-dashed border-gray-200 hover:border-primary/40 hover:text-primary rounded-lg transition-colors"
            >
              <Plus size={15} />
              新建分组
            </button>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
            >
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onDoubleClick={() => openItem(item)}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(item.id)}
                  className={`relative bg-white rounded-lg border p-3 transition-all cursor-pointer group/card shadow-card ${
                    dragId === item.id
                      ? 'opacity-50 border-dashed border-primary'
                      : 'border-gray-200 hover:border-primary/40 hover:shadow-elevated'
                  }`}
                >
                  {invalidPaths.has(item.id) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 text-xs text-red-500 bg-red-50 border border-red-200 rounded">
                      <AlertTriangle size={14} />
                      失效
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.isDir ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-primary-light text-primary border-primary/20'}`}
                    >
                      {item.isDir ? <Folder size={16} /> : <File size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{item.path}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {getGroup(item.groupId) && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                            style={{
                              background:
                                (COLORS[getGroup(item.groupId)!.color] || '#6366f1') + '15',
                              color: COLORS[getGroup(item.groupId)!.color] || '#6366f1',
                              borderColor:
                                (COLORS[getGroup(item.groupId)!.color] || '#6366f1') + '30',
                            }}
                          >
                            <span
                              className="w-1 h-1 rounded-sm"
                              style={{
                                background: COLORS[getGroup(item.groupId)!.color] || '#6366f1',
                              }}
                            />
                            {getGroup(item.groupId)!.name}
                          </span>
                        )}
                        {item.useCount > 0 && (
                          <span className="text-xs text-gray-400">×{item.useCount}</span>
                        )}
                        {item.lastUsed > 0 && (
                          <span className="text-xs text-gray-400">
                            {formatRelative(item.lastUsed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-gray-100 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openItem(item)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-primary bg-primary-light rounded hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink size={14} />
                      打开
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openLocation(item.path)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                    >
                      <FolderOpen size={14} />
                      定位
                    </button>
                    {groups.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMoveMenuId(moveMenuId === item.id ? null : item.id)
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        >
                          <ArrowRight size={14} />
                          移动
                        </button>
                        {moveMenuId === item.id && (
                          <div className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-20 min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                moveToGroup(item.id, '')
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                            >
                              未分组
                            </button>
                            {groups.map((g) => (
                              <button
                                key={g.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveToGroup(item.id, g.id)
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1.5"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-sm shrink-0"
                                  style={{ background: COLORS[g.color] || g.color }}
                                />
                                {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item.id)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-primary-light">
                <Zap size={18} className="text-primary/50" />
              </div>
              <p className="text-xs text-gray-400">
                {filterText ? '没有匹配的项目' : '添加常用文件和目录，一键快速打开'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showGroupModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setShowGroupModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-80 p-5 shadow-modal animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {editingGroup ? '编辑分组' : '新建分组'}
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">分组名称</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveGroup()}
                placeholder="输入分组名称"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">分组颜色</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(COLORS).map(([name, hex]) => (
                  <button
                    key={name}
                    onClick={() => setGroupForm((f) => ({ ...f, color: name }))}
                    className={`w-6 h-6 rounded-lg transition-all ${groupForm.color === name ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    style={{ background: hex }}
                    title={name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveGroup}
                disabled={!groupForm.name.trim()}
                className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-30 transition-colors shadow-sm"
              >
                {editingGroup ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
