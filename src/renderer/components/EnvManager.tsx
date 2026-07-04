import {
  Search,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  Eye,
  ArrowRight,
  PencilLine,
  RotateCcw,
  Save,
  Pencil,
} from 'lucide-react'
import VirtualList from './VirtualList'
import { useEnvManager } from './useEnvManager'
import {
  EnvGroupDialog,
  EnvAddDialog,
  EnvViewDialog,
  EnvEditDialog,
  EnvDeleteDialog,
  getGroupColor,
} from './EnvManagerDialogs'

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
  const ctx = useEnvManager()

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={ctx.searchKeyword}
            onChange={(e) => ctx.setSearchKeyword(e.target.value)}
            placeholder="搜索环境变量名…"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
        </div>
        <span className="text-xs text-gray-400 ml-2">
          共 <span className="font-semibold text-primary">{ctx.filtered.length}</span> 项
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={ctx.refresh}
            disabled={ctx.loading}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover disabled:opacity-30 shadow-sm transition-colors"
          >
            <RefreshCw size={13} className={ctx.loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={() => ctx.setAddDialog(true)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover shadow-sm transition-colors"
          >
            <Plus size={13} />
            新增
          </button>
          {ctx.selectedKeys.size > 0 && (
            <div className="relative">
              <button
                onClick={() => ctx.setBatchMenuOpen(!ctx.batchMenuOpen)}
                className="flex items-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 shadow-sm transition-colors"
              >
                批量加入分组 ({ctx.selectedKeys.size})
              </button>
              {ctx.batchMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-30 min-w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => ctx.handleBatchMoveToGroup('')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    未分组
                  </button>
                  {ctx.groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => ctx.handleBatchMoveToGroup(g.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-sm shrink-0"
                        style={{ background: getGroupColor(g.color) }}
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

      {/* Main content */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Env var list */}
        <div className="flex-[2] min-w-0 flex flex-col">
          <div className="bg-white rounded-lg border border-gray-200 shadow-card flex-1 flex flex-col min-h-0">
            {ctx.loading && ctx.envVars.length === 0 ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 h-11 border-b border-gray-100">
                    <div className="w-44 h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 h-3 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : ctx.filtered.length > 0 ? (
              <VirtualList
                items={ctx.filtered}
                rowHeight={44}
                className="flex-1"
                header={
                  <div className="flex items-center text-xs font-semibold text-gray-500 px-4 h-9 select-none border-b border-gray-200 bg-gray-50">
                    <input
                      type="checkbox"
                      checked={ctx.allSelected}
                      onChange={ctx.toggleAll}
                      className="w-4 h-4 mr-2.5 rounded border-gray-300 text-primary focus:ring-primary-light"
                    />
                    <div className="w-48 shrink-0">变量名</div>
                    <div className="flex-1 min-w-0">变量值</div>
                    <div className="w-32 shrink-0 text-right">操作</div>
                  </div>
                }
                renderRow={(item) => (
                  <div className="flex items-center px-4 h-11 border-b border-gray-100 hover:bg-primary-light/30 group transition-colors">
                    <input
                      type="checkbox"
                      checked={ctx.selectedKeys.has(item.key)}
                      onChange={() => ctx.toggleSelect(item.key)}
                      className="w-4 h-4 mr-2.5 rounded border-gray-300 text-primary focus:ring-primary-light"
                    />
                    <div className="w-48 shrink-0 pr-4">
                      <div className="text-sm font-semibold text-gray-700 truncate">{item.key}</div>
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
                            ctx.setMoveMenuId(ctx.moveMenuId === item.key ? null : item.key)
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-colors"
                          title="加入分组"
                        >
                          <ArrowRight size={15} />
                        </button>
                        {ctx.moveMenuId === item.key && (
                          <div
                            className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-elevated border border-gray-200 py-1 z-20 min-w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => ctx.handleMoveToGroup(item.key, '')}
                              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                            >
                              未分组
                            </button>
                            {ctx.groups.map((g) => (
                              <button
                                key={g.id}
                                onClick={() => ctx.handleMoveToGroup(item.key, g.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1.5"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-sm shrink-0"
                                  style={{ background: getGroupColor(g.color) }}
                                />
                                {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => ctx.setViewDialog(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="查看"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => ctx.openEdit(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/70 hover:text-primary hover:bg-primary-light transition-colors"
                        title="编辑"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => ctx.setDeleteDialog(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary-light border border-gray-200 flex items-center justify-center">
                  <FileText size={18} className="text-primary/50" />
                </div>
                <p className="text-xs text-gray-400">
                  {ctx.searchKeyword ? '未找到匹配环境变量' : '暂无环境变量数据'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Groups panel */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 h-9 text-xs font-semibold text-gray-500 shrink-0">
            <span>分组</span>
            <button
              onClick={() => {
                ctx.setEditingGroup(null)
                ctx.setGroupForm({ name: '', color: 'blue' })
                ctx.setGroupDialog(true)
              }}
              className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
            >
              <Plus size={12} />
              新建分组
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {ctx.groups.length > 0 ? (
              ctx.groups.map((g) => {
                const count = ctx.groupedItemCount(g.id)
                const isExpanded = ctx.expandedGroup === g.id
                const color = getGroupColor(g.color)
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
                      onClick={() => ctx.setExpandedGroup(isExpanded ? null : g.id)}
                    >
                      <span
                        className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                        style={{ background: color }}
                      />
                      <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                        {g.name}
                      </span>
                      <span
                        className="text-[10px] text-gray-400 tabular-nums px-1.5 py-0.5 rounded-full"
                        style={{ background: `${color}18` }}
                      >
                        {count}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover/g:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            ctx.setEditingGroup(g)
                            ctx.setGroupForm({ name: g.name, color: g.color })
                            ctx.setGroupDialog(true)
                          }}
                          className="p-0.5 rounded text-gray-400 hover:text-primary transition-colors"
                        >
                          <PencilLine size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            ctx.handleDeleteGroup(g.id)
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
                            onClick={() => ctx.handleBackupGroup(g.id)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                          >
                            <Save size={11} />
                            备份
                          </button>
                          <button
                            onClick={() => ctx.handleRestoreGroup(g.id)}
                            disabled={count === 0}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 disabled:opacity-30 transition-colors font-medium"
                          >
                            <RotateCcw size={11} />
                            恢复全部
                          </button>
                        </div>
                        {(ctx.groupEntries[g.id] || []).length === 0 ? (
                          <div
                            className="text-[10px] text-gray-400 text-center py-3 rounded-lg border border-dashed"
                            style={{ borderColor: `${color}30`, background: `${color}08` }}
                          >
                            暂无变量
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-52 overflow-y-auto">
                            {(ctx.groupEntries[g.id] || []).map((v) => (
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
                                <span className="text-gray-400 truncate max-w-[72px]">{v.value}</span>
                                <button
                                  onClick={() => ctx.handleRestoreGroupItem(g.id, v.key)}
                                  className="opacity-0 group-hover/v:opacity-100 p-0.5 text-gray-400 hover:text-emerald-500 rounded shrink-0 transition-opacity"
                                  title="恢复"
                                >
                                  <RotateCcw size={12} />
                                </button>
                                <button
                                  onClick={async () => {
                                    await window.electronAPI.env.removeFromGroup(v.key, g.id)
                                    ctx.refresh()
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
                    ctx.setEditingGroup(null)
                    ctx.setGroupForm({ name: '', color: 'blue' })
                    ctx.setGroupDialog(true)
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

      {/* Dialogs */}
      {ctx.groupDialog && (
        <EnvGroupDialog
          editingGroup={ctx.editingGroup}
          groupForm={ctx.groupForm}
          onClose={() => ctx.setGroupDialog(false)}
          onChange={ctx.setGroupForm}
          onSave={ctx.handleSaveGroup}
        />
      )}
      {ctx.addDialog && (
        <EnvAddDialog
          newKey={ctx.newKey}
          newValue={ctx.newValue}
          addToGroupId={ctx.addToGroupId}
          groups={ctx.groups}
          onClose={() => ctx.setAddDialog(false)}
          onKeyChange={ctx.setNewKey}
          onValueChange={ctx.setNewValue}
          onGroupChange={ctx.setAddToGroupId}
          onAdd={ctx.handleAdd}
        />
      )}
      {ctx.viewDialog && (
        <EnvViewDialog
          item={ctx.viewDialog}
          onClose={() => ctx.setViewDialog(null)}
        />
      )}
      {ctx.editDialog && (
        <EnvEditDialog
          item={ctx.editDialog}
          value={ctx.editValue}
          rawMode={ctx.editRawMode}
          onClose={() => ctx.setEditDialog(null)}
          onValueChange={ctx.setEditValue}
          onToggleMode={() => ctx.setEditRawMode(!ctx.editRawMode)}
          onSave={ctx.handleSaveEdit}
        />
      )}
      {ctx.deleteDialog && (
        <EnvDeleteDialog
          item={ctx.deleteDialog}
          onClose={() => ctx.setDeleteDialog(null)}
          onConfirm={ctx.handleDelete}
        />
      )}
    </div>
  )
}
