import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react'
import type { CleanupRule, CleanupScanResult } from '../../shared/types'
import { formatSize } from './useDiskCleaner'

interface Props {
  rules: CleanupRule[]
  availableResults: CleanupScanResult[]
  inaccessibleResults: CleanupScanResult[]
  selectedIds: Set<string>
  aiHighlightIds: Set<string>
  onToggle: (id: string) => void
  onToggleCategory: (ids: string[], allSelected: boolean) => void
}

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  temp: { label: '临时文件', emoji: '🗑️' },
  cache: { label: '系统缓存', emoji: '💾' },
  browser: { label: '浏览器', emoji: '🌐' },
  dev: { label: '开发工具', emoji: '⚡' },
  dumps: { label: '崩溃报告', emoji: '💥' },
  recycle: { label: '回收站', emoji: '♻️' },
}

const RISK_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '低风险' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-600', label: '中风险' },
}

export default function RuleList({
  rules,
  availableResults,
  inaccessibleResults,
  selectedIds,
  aiHighlightIds,
  onToggle,
  onToggleCategory,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Group results by category
  const byCategory = new Map<string, { rule: CleanupRule; result: CleanupScanResult }[]>()
  const rulesMap = new Map(rules.map((r) => [r.id, r]))

  for (const result of availableResults) {
    const rule = rulesMap.get(result.ruleId)
    if (!rule) continue
    const cat = rule.category
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push({ rule, result })
  }

  const sortedCategories = [...byCategory.entries()].sort((a, b) => {
    const sizeA = a[1].reduce((s, x) => s + x.result.sizeBytes, 0)
    const sizeB = b[1].reduce((s, x) => s + x.result.sizeBytes, 0)
    return sizeB - sizeA
  })

  return (
    <div className="space-y-2">
      {sortedCategories.map(([cat, items]) => {
        const meta = CATEGORY_META[cat] || { label: cat, emoji: '📦' }
        const totalSize = items.reduce((s, x) => s + x.result.sizeBytes, 0)
        const totalCount = items.reduce((s, x) => s + x.result.fileCount, 0)
        const isCollapsed = collapsed.has(cat)
        const allIds = items.map((x) => x.rule.id)
        const allSelected = allIds.every((id) => selectedIds.has(id))
        const someSelected = allIds.some((id) => selectedIds.has(id))

        return (
          <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors">
              <button
                onClick={() => toggleCollapse(cat)}
                className="p-0.5 text-gray-400 hover:text-gray-600"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={() => onToggleCategory(allIds, allSelected)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-light"
              />
              <span className="text-lg leading-none">{meta.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 flex-1">
                {meta.label}
                <span className="ml-1.5 text-[11px] font-normal text-gray-400">({items.length})</span>
              </span>
              <span className="text-xs text-gray-500 tabular-nums">
                {totalCount.toLocaleString()} 文件 · <span className="font-semibold text-gray-700">{formatSize(totalSize)}</span>
              </span>
            </div>

            {!isCollapsed && (
              <div className="border-t border-gray-100">
                {items.map(({ rule, result }) => {
                  const risk = RISK_STYLE[rule.risk]
                  const highlighted = aiHighlightIds.has(rule.id)
                  return (
                    <label
                      key={rule.id}
                      className={`flex items-center px-4 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${highlighted ? 'bg-purple-50/60 ring-1 ring-purple-300 animate-pulse' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rule.id)}
                        onChange={() => onToggle(rule.id)}
                        className="w-4 h-4 mr-2.5 rounded border-gray-300 text-primary focus:ring-primary-light shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-700 truncate">{rule.label}</span>
                          {highlighted && <Sparkles size={10} className="text-purple-500 shrink-0" />}
                          {rule.needsAdmin && (
                            <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                              管理员
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">{rule.description}</div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${risk.bg} ${risk.text} shrink-0 mr-2`}>
                        {risk.label}
                      </span>
                      <div className="text-xs text-gray-500 tabular-nums w-24 text-right shrink-0">
                        {result.fileCount > 0 ? result.fileCount.toLocaleString() : '-'} · <span className="font-semibold text-gray-700">{formatSize(result.sizeBytes)}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Inaccessible items */}
      {inaccessibleResults.length > 0 && (
        <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
            <AlertTriangle size={12} />
            以下类别当前无法扫描
          </div>
          <div className="space-y-1">
            {inaccessibleResults.map((r) => {
              const rule = rulesMap.get(r.ruleId)
              return (
                <div key={r.ruleId} className="flex items-center gap-2 text-xs text-gray-500 pl-4">
                  <span>{rule?.label || r.ruleId}</span>
                  <span className="text-amber-500">— {r.skippedReason || '需要管理员权限'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}