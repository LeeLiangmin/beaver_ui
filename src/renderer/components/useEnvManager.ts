import { useState, useEffect, useCallback } from 'react'
import type { EnvVar, EnvGroup } from '../../shared/types'
import { useToast } from './Toast'

export function splitValue(v: string) {
  return v ? v.split(';') : []
}

export function joinValue(items: string[]) {
  return items.join(';')
}

export function useEnvManager() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [groups, setGroups] = useState<EnvGroup[]>([])
  const [groupEntries, setGroupEntries] = useState<Record<string, EnvVar[]>>({})
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

  const [deleteDialog, setDeleteDialog] = useState<EnvVar | null>(null)

  const [groupDialog, setGroupDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<EnvGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: 'blue' })

  const [moveMenuId, setMoveMenuId] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [batchMenuOpen, setBatchMenuOpen] = useState(false)

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
      if (addToGroupId) await window.electronAPI.env.moveToGroup(newKey.trim(), addToGroupId)
      toast(`已添加 ${newKey.trim()}`, 'success')
      setAddDialog(false)
      setNewKey('')
      setNewValue('')
      setAddToGroupId('')
      refresh()
    } else toast(res.error || '添加失败', 'error')
  }

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
    ? envVars.filter((e) => e.key.toLowerCase().includes(searchKeyword.toLowerCase()))
    : envVars

  const allSelected = filtered.length > 0 && filtered.every((item) => selectedKeys.has(item.key))

  const toggleAll = () => {
    if (allSelected) setSelectedKeys(new Set())
    else setSelectedKeys(new Set(filtered.map((item) => item.key)))
  }

  const groupedItemCount = (groupId: string) => (groupEntries[groupId] || []).length

  const openEdit = (item: EnvVar) => {
    setEditDialog(item)
    setEditValue(item.value)
    setEditRawMode(true)
  }

  return {
    // data
    envVars,
    filtered,
    groups,
    groupEntries,
    searchKeyword,
    loading,
    selectedKeys,
    allSelected,
    // dialogs
    addDialog,
    newKey,
    newValue,
    addToGroupId,
    viewDialog,
    editDialog,
    editValue,
    editRawMode,
    deleteDialog,
    groupDialog,
    editingGroup,
    groupForm,
    moveMenuId,
    expandedGroup,
    batchMenuOpen,
    // setters
    setSearchKeyword,
    setAddDialog,
    setNewKey,
    setNewValue,
    setAddToGroupId,
    setViewDialog,
    setEditDialog,
    setEditValue,
    setEditRawMode,
    setDeleteDialog,
    setGroupDialog,
    setEditingGroup,
    setGroupForm,
    setMoveMenuId,
    setExpandedGroup,
    setSelectedKeys,
    setBatchMenuOpen,
    // handlers
    refresh,
    handleAdd,
    handleSaveEdit,
    handleDelete,
    handleSaveGroup,
    handleDeleteGroup,
    handleMoveToGroup,
    handleRestoreGroup,
    handleRestoreGroupItem,
    handleBackupGroup,
    toggleSelect,
    toggleAll,
    handleBatchMoveToGroup,
    groupedItemCount,
    openEdit,
  }
}