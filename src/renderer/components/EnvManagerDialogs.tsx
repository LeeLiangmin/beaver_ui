import { useState } from 'react'
import { Plus, Eye, Trash2, AlertTriangle } from 'lucide-react'
import type { EnvVar, EnvGroup } from '../../shared/types'
import { splitValue, joinValue } from './useEnvManager'
import Modal from './Modal'

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

function getGroupColor(name: string) {
  return COLORS[name] || name
}

interface GroupDialogProps {
  editingGroup: EnvGroup | null
  groupForm: { name: string; color: string }
  onClose: () => void
  onChange: (f: { name: string; color: string }) => void
  onSave: () => void
}

export function EnvGroupDialog({ editingGroup, groupForm, onClose, onChange, onSave }: GroupDialogProps) {
  return (
    <Modal open={true} onClose={onClose} width="w-80 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        {editingGroup ? '编辑分组' : '新建分组'}
      </h3>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">分组名称</label>
        <input
          type="text"
          value={groupForm.name}
          onChange={(e) => onChange({ ...groupForm, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          placeholder="如：开发环境"
          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          autoFocus
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1.5">分组颜色</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(COLORS).map(([name, hex]) => (
            <button
              key={name}
              onClick={() => onChange({ ...groupForm, color: name })}
              className={`w-6 h-6 rounded-2xl transition-all ${groupForm.color === name ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ background: hex }}
              title={name}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
        >
          取消
        </button>
        <button
          onClick={onSave}
          disabled={!groupForm.name.trim()}
          className="px-4 py-2 text-sm bg-primary text-white rounded-2xl hover:bg-primary-hover disabled:opacity-30 shadow-sm transition-colors"
        >
          {editingGroup ? '保存' : '创建'}
        </button>
      </div>
    </Modal>
  )
}

interface AddDialogProps {
  newKey: string
  newValue: string
  addToGroupId: string
  groups: EnvGroup[]
  onClose: () => void
  onKeyChange: (v: string) => void
  onValueChange: (v: string) => void
  onGroupChange: (v: string) => void
  onAdd: () => void
}

export function EnvAddDialog({
  newKey,
  newValue,
  addToGroupId,
  groups,
  onClose,
  onKeyChange,
  onValueChange,
  onGroupChange,
  onAdd,
}: AddDialogProps) {
  return (
    <Modal open={true} onClose={onClose} width="w-[28rem] p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">新增环境变量</h3>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">变量名</label>
        <input
          type="text"
          value={newKey}
          onChange={(e) => onKeyChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="MY_VAR"
          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          autoFocus
        />
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">变量值</label>
        <input
          type="text"
          value={newValue}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="变量值"
          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">加入分组（可选）</label>
        <select
          value={addToGroupId}
          onChange={(e) => onGroupChange(e.target.value)}
          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary"
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
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
        >
          取消
        </button>
        <button
          onClick={onAdd}
          className="px-4 py-2 text-sm bg-primary text-white rounded-2xl hover:bg-primary-hover shadow-sm transition-colors"
        >
          确定
        </button>
      </div>
    </Modal>
  )
}

interface ViewDialogProps {
  item: EnvVar
  onClose: () => void
}

export function EnvViewDialog({ item, onClose }: ViewDialogProps) {
  const items = splitValue(item.value)
  return (
    <Modal open={true} onClose={onClose} width="w-[36rem] p-6 max-h-[80vh] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Eye size={18} className="text-gray-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-700">查看环境变量</h3>
          <p className="text-xs text-gray-400 truncate">{item.key}</p>
        </div>
        <span className="text-xs text-gray-400">{items.length} 项</span>
      </div>
      <div className="flex-1 min-h-0 border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 border-b border-gray-200 bg-gray-50">
          <span>分项列表</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-xs text-gray-400">无内容</div>
          ) : items.length === 1 ? (
            <div className="p-3 text-sm text-gray-700 break-all bg-gray-50 rounded-2xl">
              {item.value || '(空值)'}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((val, idx) => (
                <div key={idx} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-2xl">
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-500 text-2xs font-medium rounded">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 break-all">{val || '(空)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors"
        >
          关闭
        </button>
      </div>
    </Modal>
  )
}

interface EditDialogProps {
  item: EnvVar
  value: string
  rawMode: boolean
  onClose: () => void
  onValueChange: (v: string) => void
  onToggleMode: () => void
  onSave: () => void
}

export function EnvEditDialog({
  item,
  value,
  rawMode,
  onClose,
  onValueChange,
  onToggleMode,
  onSave,
}: EditDialogProps) {
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null)
  const editItems = rawMode ? [value] : splitValue(value)
  const isMulti = splitValue(value).length > 1

  return (
    <Modal open={true} onClose={onClose} width="w-[40rem] p-6 max-h-[85vh] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
          <span className="text-primary text-lg font-semibold">✎</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-700">编辑环境变量</h3>
          <p className="text-xs text-gray-400 truncate">{item.key}</p>
        </div>
        {isMulti && (
          <button
            onClick={onToggleMode}
            className="px-3 py-1.5 text-xs font-medium rounded bg-primary-light text-primary hover:bg-primary/20 transition-colors"
          >
            {rawMode ? '切换到分项编辑' : '切换到原始编辑'}
          </button>
        )}
      </div>
      {rawMode || !isMulti ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
            autoFocus
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">分项列表（使用分号 ; 连接）</span>
            <span className="text-xs text-gray-400">共 {editItems.length} 项</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-2xl p-2 space-y-2">
            {editItems.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-500 text-2xs font-medium rounded">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const n = [...editItems]
                    n[idx] = e.target.value
                    onValueChange(joinValue(n))
                  }}
                  className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
                />
                {pendingDeleteIdx === idx ? (
                  <button
                    onClick={() => {
                      const n = editItems.filter((_, i) => i !== idx)
                      onValueChange(joinValue(n))
                      setPendingDeleteIdx(null)
                    }}
                    className="shrink-0 h-7 px-1.5 text-white bg-danger rounded text-2xs font-medium animate-pulse"
                  >
                    确认?
                  </button>
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
              onClick={() => onValueChange(joinValue([...editItems, '']))}
              className="flex items-center justify-center gap-1.5 h-8 px-4 text-xs text-primary bg-primary-light border border-dashed border-primary/30 rounded-2xl hover:bg-primary/20 w-full transition-colors"
            >
              <Plus size={13} />
              添加新项
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
        >
          取消
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm bg-primary text-white rounded-2xl hover:bg-primary-hover shadow-sm transition-colors"
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

interface DeleteDialogProps {
  item: EnvVar
  onClose: () => void
  onConfirm: () => void
}

export function EnvDeleteDialog({ item, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <Modal open={true} onClose={onClose} width="w-[22rem] p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-danger" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">确认删除</h3>
          <p className="text-xs text-gray-500 mt-1">
            确定要删除环境变量 &quot;{item.key}&quot; 吗？
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm bg-danger text-white rounded-2xl hover:bg-danger-hover shadow-sm transition-colors"
        >
          确认删除
        </button>
      </div>
    </Modal>
  )
}

export { getGroupColor, COLORS }
