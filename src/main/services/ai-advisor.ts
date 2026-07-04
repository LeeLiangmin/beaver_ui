import { loadSettings } from './settings'
import { RULES, classifyLargeFileLocally, buildFallbackInsights, computeHealthScore, PRESETS, type CleanupScanResult, type LargeFile } from './disk-cleaner'
import type { AiCleanupAdvice, AiLargeFileTag, CleanupChatResult, ChatMessage, LargeFileCategory, AiInsights, InsightCard, ScanPlan, ScanNarration } from '../../shared/types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetch: undiciFetch, ProxyAgent, Agent } = require('undici') as typeof import('undici')

const VALID_RULE_IDS = new Set(RULES.map((r) => r.id))

interface NetConfig {
  baseUrl: string
  apiKey?: string
  model: string
  proxyUrl?: string
  ignoreCert?: boolean
  timeoutMs?: number
}

// ── Core HTTP layer (undici with proxy + cert bypass support) ───
function buildDispatcher(proxyUrl?: string, ignoreCert?: boolean) {
  const tlsOptions = ignoreCert ? { rejectUnauthorized: false } : undefined
  if (proxyUrl && proxyUrl.trim()) {
    return new ProxyAgent({
      uri: proxyUrl.trim(),
      requestTls: tlsOptions,
      proxyTls: tlsOptions,
    })
  }
  if (tlsOptions) {
    return new Agent({ connect: tlsOptions })
  }
  return undefined
}

function normalizeUrl(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  if (!url.endsWith('/chat/completions')) url += '/chat/completions'
  return url
}

function humanizeError(e: any): string {
  const msg = e?.message || String(e)
  const cause = e?.cause?.message || e?.cause?.code || ''
  const full = (msg + ' ' + cause).toLowerCase()

  if (e?.name === 'AbortError' || full.includes('aborted') || full.includes('timeout')) {
    return '连接超时，请检查网络或代理'
  }
  if (full.includes('proxy') && (full.includes('econnrefused') || full.includes('failed'))) {
    return '代理服务器连接失败，请检查代理地址'
  }
  if (full.includes('econnrefused')) return '连接被拒绝，请检查 API 地址是否正确'
  if (full.includes('enotfound') || full.includes('getaddrinfo')) {
    return '无法解析域名，请检查网络或 API 地址'
  }
  if (full.includes('cert') || full.includes('ssl') || full.includes('tls')) {
    return 'SSL 证书验证失败（可能被代理拦截），可在设置中勾选"忽略证书错误"'
  }
  if (full.includes('unable to verify') || full.includes('self signed')) {
    return 'SSL 证书未通过验证，可在设置中勾选"忽略证书错误"'
  }
  if (full.includes('etimedout')) return '连接超时，请检查网络或代理'
  return msg
}

async function callApi(cfg: NetConfig, messages: { role: string; content: string }[], maxTokens: number): Promise<string> {
  const url = normalizeUrl(cfg.baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 30000)

  const dispatcher = buildDispatcher(cfg.proxyUrl, cfg.ignoreCert)

  try {
    const res: any = await undiciFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
      dispatcher,
    } as any)
    clearTimeout(timer)

    const text = await res.text()
    if (!res.ok) {
      const preview = text.slice(0, 300)
      throw new Error(`HTTP ${res.status}: ${preview || res.statusText}`)
    }

    let json: any
    try { json = JSON.parse(text) } catch {
      throw new Error(`响应不是有效 JSON: ${text.slice(0, 200)}`)
    }
    return json.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    clearTimeout(timer)
    throw new Error(humanizeError(e))
  }
}

async function chatCompletion(messages: { role: string; content: string }[], maxTokens = 1024): Promise<string> {
  const settings = loadSettings()
  if (!settings.aiEnabled || !settings.aiBaseUrl || !settings.aiModel) {
    throw new Error('AI 未配置，请在设置中填写 API 信息')
  }
  return callApi({
    baseUrl: settings.aiBaseUrl,
    apiKey: settings.aiApiKey,
    model: settings.aiModel,
    proxyUrl: settings.aiProxyUrl,
    ignoreCert: settings.aiIgnoreCert,
    timeoutMs: 30000,
  }, messages, maxTokens)
}

// ── Connection test ────────────────────────────────────────────
export async function testConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
  proxyUrl?: string,
  ignoreCert?: boolean,
): Promise<string> {
  if (!baseUrl || !model) throw new Error('请先填写 API 地址和模型')
  const reply = await callApi(
    { baseUrl, apiKey, model, proxyUrl, ignoreCert, timeoutMs: 15000 },
    [{ role: 'user', content: 'hi' }],
    5,
  )
  return `连接成功${reply ? '（模型响应正常）' : ''}`
}

// ── Cleanup advice (only stats, no paths) ────────────────────────
export async function getCleanupAdvice(stats: CleanupScanResult[]): Promise<AiCleanupAdvice> {
  const rulesMap = Object.fromEntries(RULES.map((r) => [r.id, { label: r.label, risk: r.risk, category: r.category }]))

  const statsList = stats
    .filter((s) => s.accessible && s.sizeBytes > 0)
    .map((s) => {
      const r = rulesMap[s.ruleId]
      return {
        id: s.ruleId,
        label: r?.label || s.ruleId,
        sizeMB: Math.round((s.sizeBytes / 1024 / 1024) * 10) / 10,
        fileCount: s.fileCount,
        risk: r?.risk || 'low',
        category: r?.category || 'unknown',
      }
    })

  if (statsList.length === 0) {
    return { recommended: [], reasons: {}, priority: '无内容可清理' }
  }

  const systemPrompt = `你是一个 Windows 磁盘清理顾问。根据用户提供的清理类别统计信息，推荐最适合清理的类别。
只能从给出的类别 id 中选择。返回严格 JSON，格式：
{"recommended":["id1","id2"],"reasons":{"id1":"理由","id2":"理由"},"priority":"简要说明"}`

  const msg = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(statsList) },
  ])

  try {
    const parsed = JSON.parse(msg.trim())
    // Hard filter: only allow valid rule IDs
    const recommended = (Array.isArray(parsed.recommended) ? parsed.recommended : []).filter((id: string) =>
      VALID_RULE_IDS.has(id),
    )
    const reasons: Record<string, string> = {}
    if (parsed.reasons) {
      for (const id of recommended) {
        if (typeof parsed.reasons[id] === 'string') reasons[id] = parsed.reasons[id]
      }
    }
    return {
      recommended,
      reasons,
      priority: typeof parsed.priority === 'string' ? parsed.priority : '智能推荐',
    }
  } catch {
    return { recommended: [], reasons: {}, priority: 'AI 返回格式异常，请手动选择' }
  }
}

// ── Large file analysis (only with consent) ──────────────────────
export async function analyzeLargeFiles(files: LargeFile[]): Promise<AiLargeFileTag[]> {
  const settings = loadSettings()
  if (!settings.aiLargeFileConsent) {
    throw new Error('需先同意文件名外发才能使用 AI 大文件研判')
  }

  const fileList = files.map((f) => ({
    path: f.path,
    name: f.name,
    sizeMB: Math.round((f.sizeBytes / 1024 / 1024) * 10) / 10,
  }))

  const systemPrompt = `你是 Windows 文件分析师。对每个文件判断是否可安全清理。
返回 JSON 数组：[{"path":"文件路径","tag":"安全清理|建议保留|需人工判断","reason":"判断理由"}]`

  const msg = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(fileList) },
  ])

  try {
    const parsed = JSON.parse(msg.trim())
    if (!Array.isArray(parsed)) return []
    const result: AiLargeFileTag[] = []
    for (const item of parsed) {
      if (item.path && ['安全清理', '建议保留', '需人工判断'].includes(item.tag)) {
        result.push({
          path: item.path,
          tag: item.tag as AiLargeFileTag['tag'],
          reason: item.reason || '',
        })
      }
    }
    return result
  } catch {
    return []
  }
}

// ── Intent parsing (natural language → rule IDs) ─────────────────
export async function parseIntent(text: string): Promise<string[]> {
  const rulesDesc = RULES.map((r) => ({ id: r.id, label: r.label, description: r.description }))

  const systemPrompt = `你是 Windows 清理助手。将用户的自然语言指令映射到清理类别。
只能返回这些类别 id 之一或多个：${JSON.stringify(rulesDesc)}
返回严格 JSON 数组：["id1","id2"]。如果无法匹配，返回空数组 []。`

  const msg = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ])

  try {
    const parsed = JSON.parse(msg.trim())
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id: string) => VALID_RULE_IDS.has(id))
  } catch {
    return []
  }
}

// ── Large file classification (local fallback + AI refinement) ──
export async function classifyLargeFiles(files: LargeFile[]): Promise<LargeFileCategory[]> {
  const results: LargeFileCategory[] = files.map((f) => classifyLargeFileLocally(f))

  try {
    const settings = loadSettings()
    if (!settings.aiEnabled || !settings.aiBaseUrl || !settings.aiModel) return results
    if (!settings.aiLargeFileConsent) return results

    const fileList = files.map((f, i) => ({
      index: i,
      name: f.name,
      sizeMB: Math.round((f.sizeBytes / 1024 / 1024) * 10) / 10,
      localCategory: results[i].category,
    }))

    const systemPrompt = `你是 Windows 文件分析师。在本地分类基础上精修每个文件的分类和可清理性。
输入包含本地初步分类。精修每个文件的 category（安装包/日志/视频/虚拟机镜像/缓存/压缩包/依赖目录/调试符号/崩溃转储/临时文件/备份文件/旧文件/其他）、cleanability（通常可删/可能重要/需判断）和 reason。
返回 JSON: [{"index":0,"category":"类别","cleanability":"通常可删|可能重要|需判断","reason":"理由"}]`

    const msg = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(fileList) },
      ],
      2048,
    )

    try {
      const parsed = JSON.parse(msg.trim())
      if (!Array.isArray(parsed)) return results
      for (const item of parsed) {
        if (typeof item.index !== 'number' || item.index < 0 || item.index >= results.length) continue
        if (item.category && item.cleanability && item.reason) {
          results[item.index] = { category: item.category, cleanability: item.cleanability, reason: item.reason }
        }
      }
    } catch { /* keep local results */ }
  } catch { /* keep local results */ }

  return results
}

// ── Conversational cleanup assistant ─────────────────────────────
export async function cleanupChat(history: ChatMessage[], scanResults: CleanupScanResult[]): Promise<CleanupChatResult> {
  const rulesMap = Object.fromEntries(RULES.map((r) => [r.id, { label: r.label, risk: r.risk, category: r.category }]))

  const statsList = scanResults
    .filter((s) => s.accessible && s.sizeBytes > 0)
    .map((s) => {
      const r = rulesMap[s.ruleId]
      return {
        id: s.ruleId,
        label: r?.label || s.ruleId,
        sizeMB: Math.round((s.sizeBytes / 1024 / 1024) * 10) / 10,
        fileCount: s.fileCount,
        risk: r?.risk || 'low',
        category: r?.category || 'unknown',
      }
    })

  const systemPrompt = `你是 Windows 磁盘清理智能助手 Beaver。

当前扫描结果（大小以 MB 计）：
${JSON.stringify(statsList)}

可用清理类别 id：
${JSON.stringify(RULES.map((r) => ({ id: r.id, label: r.label, risk: r.risk, description: r.description })))}

规则：
- 回复用中文，语气自然亲切
- 简明扼要，不要长篇大论，一般 2-3 句话
- 当用户想勾选/清理某些类别时，回答末尾附加纯 JSON 一行：{"action":["ruleId1","ruleId2"]}
- 未匹配任何类别或用户只是问问题时，不要给 action
- 引用具体大小时用 MB/GB，让用户有直观感受
- 主动给建议：例如"我建议先清理浏览器缓存，能释放最多空间"`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as string, content: m.content })),
  ]

  const msg = await chatCompletion(messages, 1024)

  try {
    const jsonMatch = msg.match(/\{[\s\S]*"action"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const reply = msg.replace(jsonMatch[0], '').trim() || parsed.reply || msg
      if (Array.isArray(parsed.action)) {
        return {
          reply,
          selectRuleIds: parsed.action.filter((id: string) => VALID_RULE_IDS.has(id)),
        }
      }
    }
    return { reply: msg }
  } catch {
    return { reply: msg }
  }
}

// ── AI Insights: narrative report + smart cards ─────────────────
export async function generateInsights(scanResults: CleanupScanResult[]): Promise<AiInsights> {
  // Always compute local fallback first — this is what we return if AI fails
  const fallback = buildFallbackInsights(scanResults)

  try {
    const settings = loadSettings()
    if (!settings.aiEnabled || !settings.aiBaseUrl || !settings.aiModel) {
      return fallback
    }

    const rulesMap = Object.fromEntries(
      RULES.map((r) => [r.id, { label: r.label, category: r.category, risk: r.risk, description: r.description }]),
    )

    const statsList = scanResults
      .filter((s) => s.accessible && s.sizeBytes > 0)
      .map((s) => {
        const r = rulesMap[s.ruleId]
        return {
          id: s.ruleId,
          label: r?.label || s.ruleId,
          category: r?.category || 'unknown',
          sizeMB: Math.round((s.sizeBytes / 1024 / 1024) * 10) / 10,
          fileCount: s.fileCount,
        }
      })

    if (statsList.length === 0) return fallback

    const health = computeHealthScore(scanResults)

    const systemPrompt = `你是 Windows 磁盘清理智能分析师。基于用户扫描结果，生成一份富有洞察的清理报告。

要求：
1. headline: 一句话概括磁盘状态（<25字）
2. summary: 2-3 句话说明扫描发现，语气自然亲切
3. cards: 3-6 个智能卡片，每个卡片：
   - title: 简洁标题（<12字）
   - narrative: 生动的叙述（30-60字，说明为什么该清理、可释放多少、有何影响）
   - ruleIds: 相关的清理规则 id（从给定列表中选，可多个）
   - actionLabel: 行动按钮文案（<8字，如"立即清理"、"一键释放"）
   - urgency: high/medium/low
   - emoji: 一个 emoji

只从给定的 rule id 中选择。返回严格 JSON：
{"headline":"...","summary":"...","cards":[{"title":"...","narrative":"...","ruleIds":["id1"],"actionLabel":"...","urgency":"high","emoji":"🗑️"}]}`

    const userContent = JSON.stringify({
      healthScore: health.score,
      totalReclaimableMB: Math.round(health.totalReclaimableBytes / 1024 / 1024),
      scanResults: statsList,
    })

    const msg = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      2048,
    )

    // Extract JSON (may be wrapped in prose)
    const jsonMatch = msg.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallback

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed.cards)) return fallback

    const cards: InsightCard[] = []
    let idx = 0
    for (const c of parsed.cards) {
      if (typeof c.title !== 'string' || typeof c.narrative !== 'string') continue
      if (!Array.isArray(c.ruleIds)) continue

      const validIds = c.ruleIds.filter((id: string) => VALID_RULE_IDS.has(id))
      if (validIds.length === 0) continue

      // Compute reclaimable from scan results
      const stats = validIds.map((id: string) => scanResults.find((r) => r.ruleId === id)).filter(Boolean) as CleanupScanResult[]
      const reclaimable = stats.reduce((s, r) => s + r.sizeBytes, 0)
      const files = stats.reduce((s, r) => s + r.fileCount, 0)

      cards.push({
        id: `ai-${idx++}`,
        title: c.title.slice(0, 24),
        narrative: c.narrative.slice(0, 200),
        ruleIds: validIds,
        actionLabel: typeof c.actionLabel === 'string' ? c.actionLabel.slice(0, 16) : '立即清理',
        reclaimableBytes: reclaimable,
        fileCount: files,
        urgency: ['high', 'medium', 'low'].includes(c.urgency) ? c.urgency : 'medium',
        emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 4) : '📦',
      })
    }

    if (cards.length === 0) return fallback

    return {
      healthScore: health.score,
      headline: typeof parsed.headline === 'string' ? parsed.headline.slice(0, 50) : health.summary,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 200) : fallback.summary,
      cards,
      quickActions: PRESETS.map((p) => ({ label: p.label, ruleIds: p.ruleIds, emoji: p.emoji })),
    }
  } catch {
    return fallback
  }
}

// ── Scan planning: AI decides what to scan and how ─────────────
export async function planScan(): Promise<ScanPlan> {
  const rulesDesc = RULES.map((r) => ({
    id: r.id,
    label: r.label,
    category: r.category,
    risk: r.risk,
    description: r.description,
  }))

  const systemPrompt = `你是 Windows 磁盘清理扫描规划师。根据可用规则，制定扫描策略。

可用规则：${JSON.stringify(rulesDesc)}

要求返回 JSON：
{
  "intro": "自然语言说明你打算怎么扫描、重点看什么（2-3句话，语气亲切）",
  "priorityRuleIds": ["优先扫描的 rule id 列表，按重要性排序"],
  "focusHint": "一句话告诉用户你最关注什么（如：浏览器缓存和临时文件）"
}

intro 要有语气感，例如："我先帮你看看最容易产生垃圾的地方，浏览器缓存和临时文件通常占大头\ufffd\ufffd"
focusHint 简短 <20 字，可直接展示。`

  const msg = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '生成扫描计划' },
    ],
    512,
  )

  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        intro: '开始扫描磁盘，逐一检查各缓存和临时文件目录\ufffd\ufffd',
        priorityRuleIds: RULES.map((r) => r.id),
        focusHint: '全面扫描',
      }
    }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      intro:
        typeof parsed.intro === 'string'
          ? parsed.intro.slice(0, 200)
          : '正在分析磁盘空间，请稍候\ufffd\ufffd',
      priorityRuleIds: Array.isArray(parsed.priorityRuleIds)
        ? parsed.priorityRuleIds.filter((id: string) => VALID_RULE_IDS.has(id))
        : RULES.map((r) => r.id),
      focusHint: typeof parsed.focusHint === 'string' ? parsed.focusHint.slice(0, 40) : '智能扫描',
    }
  } catch {
    return {
      intro: '开始全面扫描，逐项检查所有潜在的磁盘空间占用\ufffd\ufffd',
      priorityRuleIds: RULES.map((r) => r.id),
      focusHint: '全面扫描',
    }
  }
}

// ── AI narrates scan progress in real-time ─────────────────────
const NARRATED_RULES = new Set<string>()

export function clearNarratedRules() {
  NARRATED_RULES.clear()
}

export async function narrateScanProgress(
  results: CleanupScanResult[],
  alreadyNarrated: string[],
): Promise<ScanNarration> {
  for (const id of alreadyNarrated) NARRATED_RULES.add(id)

  const rulesMap = Object.fromEntries(
    RULES.map((r) => [
      r.id,
      { label: r.label, category: r.category, risk: r.risk, description: r.description },
    ]),
  )

  const fresh = results.filter(
    (r) => r.accessible && r.sizeBytes > 0 && !NARRATED_RULES.has(r.ruleId),
  )

  if (fresh.length < 3) return { message: '' }

  const freshList = fresh.map((r) => {
    const rm = rulesMap[r.ruleId] || {}
    return {
      id: r.ruleId,
      label: rm.label || r.ruleId,
      sizeMB: Math.round((r.sizeBytes / 1024 / 1024) * 10) / 10,
      fileCount: r.fileCount,
      category: rm.category || 'unknown',
    }
  })

  const systemPrompt = `你是 Windows 磁盘清理扫描旁白。扫描结果实时返回，你给出一两句后台解读。
当前新增发现：${JSON.stringify(freshList)}

要求：
- 1-2 句话，像在跟用户说话
- 提到具体大小让用户有直观感知
- 可以简单评论，不要太浮夸
- 如果没有值得说的，message 留空""
返回 JSON：{"message":"旁白内容","ruleIds":["对应发现id"]}`

  const msg = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '当前扫描进度，给出旁白' },
    ],
    256,
  )

  for (const r of fresh) NARRATED_RULES.add(r.ruleId)

  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { message: '' }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      message: typeof parsed.message === 'string' ? parsed.message : '',
      ruleIds: Array.isArray(parsed.ruleIds)
        ? parsed.ruleIds.filter((id: string) => VALID_RULE_IDS.has(id))
        : undefined,
    }
  } catch {
    return { message: '' }
  }
}