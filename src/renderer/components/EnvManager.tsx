import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  Eye,
  Pencil,
  AlertTriangle,
  ArrowRight,
  PencilLine,
  RotateCcw,
  Save,
} from 'lucide-react'
import type { EnvVar, EnvGroup } from '../../shared/types'
import VirtualList from './VirtualList'
import { useToast } from './Toast'

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

const COLOR_BG: Record<string, string> = {
  teal: 'rgba(77,182,172,0.08)',
  cyan: 'rgba(38,166,154,0.08)',
  gold: 'rgba(255,213,79,0.10)',
  pink: 'rgba(248,187,208,0.10)',
  green: 'rgba(128,203,196,0.08)',
  coral: 'rgba(239,154,154,0.08)',
  lavender: 'rgba(206,147,216,0.08)',
  orange: 'rgba(255,171,145,0.08)',
}

export default function EnvManager() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [groups, setGroups] = useState<EnvGroup[]>([])
  const [groupEntries, setGroupEntries] = useState<Record<string, EnvVar[]>>(
    {},
  )
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const [addDialog, setAddDialog] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [addToGroupId, setAddToGroupId] = useState('')

  const [viewDialog, setViewDialog] = useState<EnvVar | null>(null)
  const [editDialog, setEditDialog] = useState<EnvVar | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editRawMode, setEditRawMode] = useState(false)

  const handleSaveEdit = async () => {
    if (!editDialog) return
    const items = editRawMode ? [editValue] : splitValue(editValue)
    const val = editRawMode ? editValue : joinValue(items)
    const res = await window.electronAPI.env.setVar(editDialog.key, val)
    if (res.ok) {
      toast(`已更新 ${editDialog.key}`, 'success')
      setEditDialog(null)
      refresh()
    } else toast(res.error || '编辑失败', 'error')
  }

  const [deleteDialog, setDeleteDialog] = useState<EnvVar | null>(null)
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null)

  const [groupDialog, setGroupDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<EnvGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: 'blue' })

  const [moveMenuId, setMoveMenuId] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [batchMenuOpen, setBatchMenuOpen] = useState(false)

  const splitValue = (v: string) => (v ? v.split(';') : [])
  const joinValue = (items: string[]) => items.join(';')
  const toast = useToast().toast

  const refresh = useCallback(async () => {
    setLoading(true)
    const [vRes, gRes] = await Promise.all([
      window.electronAPI.env.list(),
      window.electronAPI.env.groups(),
    ])
    if (vRes.ok) setEnvVars(vRes.data)
    else if ('error' in vRes) toast(vRes.error, 'error')
    if (gRes.ok) {
      setGroups(gRes.data)
      const entriesMap: Record<string, EnvVar[]> = {}
      for (const g of gRes.data) {
        const eRes = await window.electronAPI.env.getGroupEntries(g.id)
        if (eRes.ok) entriesMap[g.id] = eRes.data
      }
      setGroupEntries(entriesMap)
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = async () => {
    if (!newKey.trim()) {
      toast('变量名不能为空', 'warning')
      return
    }
    const res = await window.electronAPI.env.setVar(newKey.trim(), newValue)
    if (res.ok) {
      if (addToGroupId)
        await window.electronAPI.env.moveToGroup(newKey.trim(), addToGroupId)
      toast(`已添加 ${newKey.trim()}`, 'success')
      setAddDialog(false)
      setNewKey('')
      setNewValue('')
      setAddToGroupId('')
      refresh()
    } else toast(res.error || '添加失败', 'error')
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    const res = await window.electronAPI.env.deleteVar(deleteDialog.key)
    if (res.ok) {
      toast(`已删除 ${deleteDialog.key}`, 'success')
      setDeleteDialog(null)
      refresh()
    } else toast(res.error || '删除失败', 'error')
  }

  const handleSaveGroup = async () => {
    const name = groupForm.name.trim()
    if (!name) return
    if (editingGroup)
      await window.electronAPI.env.updateGroup({
        ...editingGroup,
        name,
        color: groupForm.color,
      })
    else await window.electronAPI.env.createGroup(name, groupForm.color)
    setGroupDialog(false)
    setEditingGroup(null)
    setGroupForm({ name: '', color: 'blue' })
    refresh()
  }

  const handleDeleteGroup = async (id: string) => {
    await window.electronAPI.env.deleteGroup(id)
    refresh()
  }

  const handleMoveToGroup = async (key: string, groupId: string) => {
    await window.electronAPI.env.moveToGroup(key, groupId)
    toast(`已将 ${key} 加入分组`, 'success')
    setMoveMenuId(null)
    refresh()
  }

  const handleRestoreGroup = async (groupId: string) => {
    const res = await window.electronAPI.env.restoreGroup(groupId)
    if (res.ok) {
      toast(`已恢复 ${res.data.restored} 个变量`, 'success')
      refresh()
    } else toast(res.error || '恢复失败', 'error')
  }

  const handleRestoreGroupItem = async (groupId: string, key: string) => {
    const res = await window.electronAPI.env.restoreGroupItem(groupId, key)
    if (res.ok) {
      toast(`已恢复 ${key}`, 'success')
      refresh()
    } else toast(res.error || '恢复失败', 'error')
  }

  const handleBackupGroup = async (groupId: string) => {
    const res = await window.electronAPI.env.backupGroup(groupId)
    if (res.ok) {
      toast(`已备份 ${res.data.backedUp} 个变量`, 'success')
      refresh()
    } else toast(res.error || '备份失败', 'error')
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleBatchMoveToGroup = async (groupId: string) => {
    for (const key of selectedKeys) {
      await window.electronAPI.env.moveToGroup(key, groupId)
    }
    toast(`已将 ${selectedKeys.size} 个变量加入分组`, 'success')
    setSelectedKeys(new Set())
    setBatchMenuOpen(false)
    refresh()
  }

  const filtered = searchKeyword
    ? envVars.filter((e) =>
        e.key.toLowerCase().includes(searchKeyword.toLowerCase()),
      )
    : envVars

  const allSelected =
    filtered.length > 0 && filtered.every((item) => selectedKeys.has(item.key))

  const toggleAll = () => {
    if (allSelected) setSelectedKeys(new Set())
    else setSelectedKeys(new Set(filtered.map((item) => item.key)))
  }

  const groupedItemCount = (groupId: string) =>
    (groupEntries[groupId] || []).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索环境变量名…"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
        </div>
        <span className="text-xs text-gray-400 ml-2">
          共{' '}
          <span className="font-semibold text-primary">{filtered.length}</span>{' '}
          项
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover disabled:opacity-30 shadow-sm transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={() => setAddDialog(true)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover shadow-sm transition-colors"
          >
            <Plus size={13} />
            新增
          </button>
          {selectedKeys.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setBatchMenuOpen(!batchMenuOpen)}
                className="flex items-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 shadow-sm transition-colors"
              >
                批量加入分组 ({selectedKeys.size})
              </button>
              {batchMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-30 min-w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleBatchMoveToGroup('')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    未分组
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleBatchMoveToGroup(g.id)}
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
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-3">
        <div className="flex-[2] min-w-0 flex flex-col">
          <div className="bg-white rounded-lg border border-gray-200 shadow-card flex-1 flex flex-col min-h-0">
            {loading && envVars.length === 0 ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 h-11 border-b border-gray-100"
                  >
                    <div className="w-44 h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 h-3 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <VirtualList
                items={filtered}
                rowHeight={44}
                className="flex-1"
                header={
                  <div className="flex items-center text-xs font-semibold text-gray-500 px-4 h-9 select-none border-b border-gray-200 bg-gray-50">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 mr-2.5 rounded border-gray-300 text-primary focus:ring-primary-light"
                    />
                    <div className="w-48 shrink-0">变量名</div>
                    <div className="flex-1 min-w-0">变量值</div>
                    <div className="w-32 shrink-0 text-right">操作</div>
                  </div>
                }
                renderRow={(item) => {
                  return (
                    <div className="flex items-center px-4 h-11 border-b border-gray-100 hover:bg-primary-light/30 group transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(item.key)}
                        onChange={() => toggleSelect(item.key)}
                        className="w-4 h-4 mr-2.5 rounded border-gray-300 text-primary focus:ring-primary-light"
                      />
                      <div className="w-48 shrink-0 pr-4">
                        <div className="text-sm font-semibold text-gray-700 truncate">
                          {item.key}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-sm text-gray-500 truncate">
                          {item.value || '(空值)'}
                        </div>
                      </div>
                      <div className="w-32 shrink-0 flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMoveMenuId(
                                moveMenuId === item.key ? null : item.key,
                              )
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-colors"
                            title="加入分组"
                          >
                            <ArrowRight size={15} />
                          </button>
                          {moveMenuId === item.key && (
                            <div
                              className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-20 min-w-[120px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleMoveToGroup(item.key, '')}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                              >
                                未分组
                              </button>
                              {groups.map((g) => (
                                <button
                                  key={g.id}
                                  onClick={() =>
                                    handleMoveToGroup(item.key, g.id)
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-sm shrink-0"
                                    style={{
                                      background: COLORS[g.color] || g.color,
                                    }}
                                  />
                                  {g.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setViewDialog(item)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="查看"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setEditDialog(item)
                            setEditValue(item.value)
                            setEditRawMode(true)
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/70 hover:text-primary hover:bg-primary-light transition-colors"
                          title="编辑"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteDialog(item)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary-light border border-gray-200 flex items-center justify-center">
                  <FileText size={18} className="text-primary/50" />
                </div>
                <p className="text-xs text-gray-400">
                  {searchKeyword ? '未找到匹配环境变量' : '暂无环境变量数据'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 h-9 text-xs font-semibold text-gray-500 shrink-0">
            <span>分组</span>
            <button
              onClick={() => {
                setEditingGroup(null)
                setGroupForm({ name: '', color: 'blue' })
                setGroupDialog(true)
              }}
              className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
            >
              <Plus size={12} />
              新建分组
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {groups.length > 0 ? (
              groups.map((g) => {
                const count = groupedItemCount(g.id)
                const isExpanded = expandedGroup === g.id
                const color = COLORS[g.color] || g.color
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl border transition-all duration-200 ${isExpanded ? 'shadow-elevated' : ''}`}
                    style={{
                      background: COLOR_BG[g.color] || 'rgba(0,0,0,0.04)',
                      borderColor: isExpanded ? color : 'transparent',
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer group/g transition-colors"
                      onClick={() =>
                        setExpandedGroup(isExpanded ? null : g.id)
                      }
                    >
                      <span
                        className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                        style={{ background: color }}
                      />
                      <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                        {g.name}
                      </span>
                      <span className="text-[10px] text-gray-400 tabular-nums px-1.5 py-0.5 rounded-full"
                            style={{ background: `${color}18` }}
                          >
                        {count}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover/g:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingGroup(g)
                            setGroupForm({ name: g.name, color: g.color })
                            setGroupDialog(true)
                          }}
                          className="p-0.5 rounded text-gray-400 hover:text-primary transition-colors"
                        >
                          <PencilLine size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGroup(g.id)
                          }}
                          className="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0.5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <button
                            onClick={() => handleBackupGroup(g.id)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                          >
                            <Save size={11} />
                            备份
                          </button>
                          <button
                            onClick={() => handleRestoreGroup(g.id)}
                            disabled={count === 0}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-30 transition-colors font-medium"
                          >
                            <RotateCcw size={11} />
                            恢复全部
                          </button>
                        </div>
                        {(groupEntries[g.id] || []).length === 0 ? (
                          <div className="text-[10px] text-gray-400 text-center py-3 rounded-lg border border-dashed"
                            style={{ borderColor: `${color}30`, background: `${color}08` }}
                          >
                            暂无变量
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-52 overflow-y-auto">
                            {(groupEntries[g.id] || []).map((v) => (
                              <div
                                key={v.key}
                                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg group/v hover:brightness-95 transition-all"
                                style={{ background: `${color}12` }}
                              >
                                <span
                                  className="w-1 h-3 rounded-full shrink-0"
                                  style={{ background: color }}
                                />
                                <span className="font-semibold text-gray-600 truncate flex-1">
                                  {v.key}
                                </span>
                                <span className="text-gray-400 truncate max-w-[72px]">
                                  {v.value}
                                </span>
                                <button
                                  onClick={async () => {
                                    await handleRestoreGroupItem(g.id, v.key)
                                  }}
                                  className="opacity-0 group-hover/v:opacity-100 p-0.5 text-gray-400 hover:text-emerald-500 rounded shrink-0 transition-opacity"
                                  title="恢复"
                                >
                                  <RotateCcw size={12} />
                                </button>
                                <button
                                  onClick={async () => {
                                    await window.electronAPI.env.removeFromGroup(
                                      v.key,
                                      g.id,
                                    )
                                    refresh()
                                  }}
                                  className="opacity-0 group-hover/v:opacity-100 p-0.5 text-gray-400 hover:text-red-500 rounded shrink-0 transition-opacity"
                                  title="移出分组"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 bg-gray-50/50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Plus size={16} className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-400">暂无分组</p>
                <button
                  onClick={() => {
                    setEditingGroup(null)
                    setGroupForm({ name: '', color: 'blue' })
                    setGroupDialog(true)
                  }}
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  创建第一个分组
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {groupDialog && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setGroupDialog(false)}
        >
          <div
            className="bg-white rounded-2xl w-80 p-5 shadow-modal animate-modal-in"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {editingGroup ? '编辑分组' : '新建分组'}
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">
                分组名称
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((f) => ({ ...f, name: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSaveGroup()}
                placeholder="如：开发环境"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">
                分组颜色
              </label>
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
            <div className="flex justify-end gap-2">
              <button
onClick={(e) => { if (e.target === e.currentTarget) setGroupDialog(false) }}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={!groupForm.name.trim()}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-30 shadow-sm transition-colors"
              >
                {editingGroup ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addDialog && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setAddDialog(false) }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[28rem] shadow-modal animate-modal-in"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              新增环境变量
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">变量名</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="MY_VAR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">变量值</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="变量值"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">
                加入分组（可选）
              </label>
              <select
                value={addToGroupId}
                onChange={(e) => setAddToGroupId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
              >
                <option value="">不加入分组</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => { if (e.target === e.currentTarget) setAddDialog(false) }}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDialog && (() => {
        const items = splitValue(viewDialog.value)
        return (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) setViewDialog(null) }}
          >
            <div
              className="bg-white rounded-2xl p-6 w-[36rem] max-h-[80vh] flex flex-col shadow-modal animate-modal-in"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Eye size={18} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-700">查看环境变量</h3>
                  <p className="text-xs text-gray-400 truncate">{viewDialog.key}</p>
                </div>
                <span className="text-xs text-gray-400">{items.length} 项</span>
              </div>
              <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 border-b border-gray-200 bg-gray-50">
                  <span>分项列表</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {items.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-gray-400">无内容</div>
                  ) : items.length === 1 ? (
                    <div className="p-3 text-sm text-gray-700 break-all bg-gray-50 rounded-lg">{viewDialog.value || '(空值)'}</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-500 text-[10px] font-medium rounded">{idx + 1}</span>
                          <span className="flex-1 text-sm text-gray-700 break-all">{item || '(空)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={(e) => { if (e.target === e.currentTarget) setViewDialog(null) }} className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">关闭</button>
              </div>
            </div>
          </div>
        )
      })()}

      {editDialog && (() => {
        const editItems = editRawMode ? [editValue] : splitValue(editValue)
        const isMulti = splitValue(editValue).length > 1
        return (
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
              onClick={(e) => { if (e.target === e.currentTarget) setEditDialog(null) }}
            >
              <div
className="bg-white rounded-2xl p-6 w-[40rem] max-h-[85vh] flex flex-col shadow-modal animate-modal-in"
               >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                    <span className="text-primary text-lg font-semibold">✎</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-700">编辑环境变量</h3>
                    <p className="text-xs text-gray-400 truncate">{editDialog.key}</p>
                  </div>
                  {isMulti && (
                    <button
                      onClick={() => setEditRawMode(!editRawMode)}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-primary-light text-primary hover:bg-primary/20 transition-colors"
                    >
                      {editRawMode ? '切换到分项编辑' : '切换到原始编辑'}
                    </button>
                  )}
                </div>
                {editRawMode || !isMulti ? (
                  <div>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">分项列表（使用分号 ; 连接）</span>
                      <span className="text-xs text-gray-400">共 {editItems.length} 项</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                      {editItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-500 text-[10px] font-medium rounded">{idx + 1}</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const n = [...editItems]
                              n[idx] = e.target.value
                              setEditValue(joinValue(n))
                            }}
                            className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                          />
                          {pendingDeleteIdx === idx ? (
                            <button
                              onClick={() => {
                                const n = editItems.filter((_, i) => i !== idx)
                                setEditValue(joinValue(n))
                                setPendingDeleteIdx(null)
                              }}
                              className="shrink-0 h-7 px-1.5 text-white bg-danger rounded text-[10px] font-medium animate-pulse"
                            >确认?</button>
                          ) : (
                            <button
                              onClick={() => setPendingDeleteIdx(idx)}
                              className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-danger rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setEditValue(joinValue([...editItems, '']))}
                        className="flex items-center justify-center gap-1.5 h-8 px-4 text-xs text-primary bg-primary-light border border-dashed border-primary/30 rounded-lg hover:bg-primary/20 w-full transition-colors"
                      >
                        <Plus size={13} />
                        添加新项
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
                  <button onClick={(e) => { if (e.target === e.currentTarget) setEditDialog(null) }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm transition-colors">保存</button>
                </div>
              </div>
            </div>
          )
      })()}

      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteDialog(null) }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[22rem] shadow-modal animate-modal-in"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  确认删除
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  确定要删除环境变量 &quot;{deleteDialog.key}&quot; 吗？
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => { if (e.target === e.currentTarget) setDeleteDialog(null) }}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger-hover shadow-sm transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}