import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, FolderOpen } from 'lucide-react'
import type { OpenerGroup, OpenerItem } from '../../shared/types'

export default function FastOpener() {
  const [groups, setGroups] = useState<OpenerGroup[]>([])
  const [items, setItems] = useState<OpenerItem[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('default')
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPath, setNewItemPath] = useState('')

  const loadData = useCallback(async () => {
    const [gRes, iRes] = await Promise.all([
      window.electronAPI.opener.getGroups(),
      window.electronAPI.opener.getItems(),
    ])
    if (gRes.ok) setGroups(gRes.data)
    if (iRes.ok) setItems(iRes.data)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    const res = await window.electronAPI.opener.addGroup(newGroupName.trim())
    if (res.ok) {
      setGroups((prev) => [...prev, res.data])
      setNewGroupName('')
      setShowAddGroup(false)
    }
  }

  const handleRemoveGroup = async (id: string) => {
    await window.electronAPI.opener.removeGroup(id)
    setGroups((prev) => prev.filter((g) => g.id !== id))
    setItems((prev) => prev.filter((i) => i.groupId !== id))
    if (selectedGroup === id) setSelectedGroup('default')
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPath.trim()) return
    const res = await window.electronAPI.opener.addItem(newItemName.trim(), newItemPath.trim(), selectedGroup)
    if (res.ok) {
      setItems((prev) => [...prev, res.data])
      setNewItemName('')
      setNewItemPath('')
      setShowAddItem(false)
    }
  }

  const handleRemoveItem = async (id: string) => {
    await window.electronAPI.opener.removeItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleOpen = async (item: OpenerItem) => {
    await window.electronAPI.opener.useItem(item.id)
    await window.electronAPI.shell.openPath(item.path)
  }

  const filteredItems = items.filter((i) => i.groupId === selectedGroup)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">快速打开</h2>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-48 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">分组</span>
            <button
              onClick={() => setShowAddGroup(!showAddGroup)}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="添加分组"
            >
              <Plus size={16} />
            </button>
          </div>
          {showAddGroup && (
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                placeholder="分组名"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
              <button onClick={handleAddGroup} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
            </div>
          )}
          <div className="space-y-1">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  selectedGroup === g.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{g.name}</span>
                {g.id !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveGroup(g.id) }}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">项目</span>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} />
              添加
            </button>
          </div>
          {showAddItem && (
            <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="名称"
                className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                autoFocus
              />
              <input
                type="text"
                value={newItemPath}
                onChange={(e) => setNewItemPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="路径"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button onClick={handleAddItem} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">确定</button>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            {filteredItems.length === 0 ? (
              <p className="text-center text-gray-400 mt-8">暂无项目，点击"添加"创建</p>
            ) : (
              <div className="space-y-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onDoubleClick={() => handleOpen(item)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen size={16} className="text-yellow-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">{item.path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">使用 {item.useCount} 次</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
