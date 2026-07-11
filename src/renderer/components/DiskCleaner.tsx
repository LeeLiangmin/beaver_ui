import {
  LayoutDashboard,
  ListChecks,
  FileSearch,
  Sparkles,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  MessageCircle,
} from 'lucide-react'
import { useDiskCleaner, formatSize } from './useDiskCleaner'
import HealthCard from './HealthCard'
import InsightCards from './InsightCards'
import RuleList from './RuleList'
import LargeFileFinder from './LargeFileFinder'
import ChatSidebar from './ChatSidebar'
import Modal from './Modal'

export default function DiskCleaner() {
  const ctx = useDiskCleaner()

  const categoryCount = ctx.availableResults.length

  const handleApplyCard = (ruleIds: string[]) => {
    if (!Array.isArray(ruleIds)) return
    ctx.applyAiSelection(ruleIds)
  }

  const handleQuickAction = (ruleIds: string[]) => {
    if (!Array.isArray(ruleIds)) return
    ctx.runPreset(ruleIds)
  }

  const handleToggleCategory = (ids: string[], allSelected: boolean) => {
    if (!Array.isArray(ids) || ids.length === 0) return
    if (allSelected) {
      ctx.setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    } else {
      ctx.setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.add(id)
        return next
      })
    }
  }

  return (
    <div className="flex h-full">
      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-4 shrink-0">
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-0.5">
            <TabButton active={ctx.tab === 'dashboard'} onClick={() => ctx.setTab('dashboard')} icon={<LayoutDashboard size={13} />} label="总览" />
            <TabButton active={ctx.tab === 'rules'} onClick={() => ctx.setTab('rules')} icon={<ListChecks size={13} />} label="详细清理" />
            <TabButton active={ctx.tab === 'largefiles'} onClick={() => ctx.setTab('largefiles')} icon={<FileSearch size={13} />} label="大文件查找" />
          </div>
          <div className="flex-1" />
          {ctx.aiEnabled && !ctx.chatOpen && (
            <button
              onClick={() => ctx.setChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            >
              <MessageCircle size={13} />
              打开 AI 助手
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {ctx.tab === 'dashboard' && (
            <div className="space-y-4">
              <HealthCard
                scanning={ctx.scanning}
                hasScanned={ctx.hasScanned}
                aiEnabled={ctx.aiEnabled}
                insightsLoading={ctx.insightsLoading}
                healthScore={ctx.insights?.healthScore ?? null}
                headline={ctx.insights?.headline ?? ''}
                summary={ctx.insights?.summary ?? ''}
                totalReclaimable={ctx.totalReclaimable}
                categoryCount={categoryCount}
                scanPlan={ctx.scanPlan}
                narration={ctx.narration}
                onScan={ctx.handleScan}
                onCancelScan={ctx.handleCancelScan}
              />

              {ctx.hasScanned && (
                <InsightCards
                  insights={ctx.insights}
                  loading={ctx.insightsLoading}
                  onApplyCard={handleApplyCard}
                  onQuickAction={handleQuickAction}
                />
              )}
            </div>
          )}

          {ctx.tab === 'rules' && (
            <div>
              {!ctx.hasScanned ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <ListChecks size={24} className="text-gray-300" />
                  <p className="text-sm text-gray-500">请先在总览页开始扫描</p>
                  <button
                    onClick={() => ctx.setTab('dashboard')}
                    className="text-xs text-primary hover:underline"
                  >
                    去总览页 →
                  </button>
                </div>
              ) : (
                <RuleList
                  rules={ctx.rules}
                  availableResults={ctx.availableResults}
                  inaccessibleResults={ctx.inaccessibleResults}
                  selectedIds={ctx.selectedIds}
                  aiHighlightIds={ctx.aiHighlightIds}
                  onToggle={ctx.toggleSelect}
                  onToggleCategory={handleToggleCategory}
                />
              )}
            </div>
          )}

          {ctx.tab === 'largefiles' && (
            <LargeFileFinder
              aiEnabled={ctx.aiEnabled}
              largePath={ctx.largePath}
              largeMinMB={ctx.largeMinMB}
              largeFiles={ctx.largeFiles}
              largeScanning={ctx.largeScanning}
              onSetPath={ctx.setLargePath}
              onSetMinMB={ctx.setLargeMinMB}
              onScan={ctx.handleLargeScan}
              onCancelScan={ctx.handleCancelLargeScan}
              onBrowse={ctx.handleBrowseForLarge}
              onLocate={ctx.handleLocateFile}
              onRemoveFiles={ctx.handleRemoveLargeFiles}
            />
          )}
        </div>

        {/* Bottom action bar (shown when items selected) */}
        {ctx.selectedIds.size > 0 && ctx.tab !== 'largefiles' && (
          <div className="mt-3 shrink-0 bg-white rounded-2xl border border-primary/30 shadow-elevated p-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-primary-light flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  已选 {ctx.selectedIds.size} 项 · {formatSize(ctx.selectedBytes)}
                </div>
                <div className="text-2xs text-gray-500">{ctx.selectedCount.toLocaleString()} 个文件</div>
              </div>
            </div>
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ctx.permanent}
                onChange={(e) => ctx.setPermanent(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-red-500 focus:ring-red-300"
              />
              <span className={`text-xs ${ctx.permanent ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                彻底删除（不进回收站）
              </span>
            </label>
            <button
              onClick={() => ctx.setCleanDialog(true)}
              disabled={ctx.cleaning}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-medium shadow-sm transition-colors ${
                ctx.permanent ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-primary-hover'
              } disabled:opacity-40`}
            >
              <Trash2 size={13} />
              {ctx.cleaning ? '清理中…' : ctx.permanent ? '彻底删除' : '移入回收站'}
            </button>
          </div>
        )}

        {ctx.permanent && ctx.selectedIds.size > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-center gap-1.5">
            <ShieldAlert size={12} />
            彻底删除模式：文件将永久删除，不可恢复
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      <ChatSidebar
        open={ctx.chatOpen}
        messages={ctx.chatMessages}
        input={ctx.chatInput}
        loading={ctx.chatLoading}
        onClose={() => ctx.setChatOpen(false)}
        onInputChange={ctx.setChatInput}
        onSend={ctx.sendChat}
      />

      <Modal open={ctx.cleanDialog} onClose={() => ctx.setCleanDialog(false)} width="w-[28rem] p-6">
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              ctx.permanent ? 'bg-red-50' : 'bg-amber-50'
            }`}
          >
            <AlertTriangle size={18} className={ctx.permanent ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              {ctx.permanent ? '确认彻底删除' : '确认清理'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {ctx.permanent
                ? `将永久删除 ${ctx.selectedIds.size} 个类别共 ${ctx.selectedCount.toLocaleString()} 个文件（${formatSize(ctx.selectedBytes)}），不可恢复。`
                : `将 ${ctx.selectedIds.size} 个类别共 ${ctx.selectedCount.toLocaleString()} 个文件（${formatSize(ctx.selectedBytes)}）移至回收站。`}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => ctx.setCleanDialog(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={ctx.handleClean}
            className={`px-4 py-2 text-sm text-white rounded-2xl shadow-sm transition-colors ${
              ctx.permanent ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {ctx.permanent ? '确认彻底删除' : '确认清理'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors ${
        active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}