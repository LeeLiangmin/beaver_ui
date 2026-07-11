import { useState, useEffect } from 'react'
import { Save, TestTube, Eye, EyeOff, Loader2, Sun, Moon, Monitor } from 'lucide-react'
import type { Settings } from '../../shared/types'
import { useToast } from './Toast'

function applyTheme(theme: 'light' | 'dark' | 'system') {
  localStorage.setItem('beaver-theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

export default function SettingsPage() {
  const toast = useToast().toast
  const [settings, setSettings] = useState<Settings>({ dataPath: '' })
  const [loading, setLoading] = useState(true)
  const [keyVisible, setKeyVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    window.electronAPI.settings.get().then((res) => {
      if (res.ok) {
        setSettings({
          dataPath: res.data.dataPath,
          editorCommand: res.data.editorCommand || '',
          theme: res.data.theme || 'light',
          aiEnabled: res.data.aiEnabled || false,
          aiBaseUrl: res.data.aiBaseUrl || 'https://api.openai.com',
          aiApiKey: res.data.aiApiKey || '',
          aiModel: res.data.aiModel || 'gpt-3.5-turbo',
          aiLargeFileConsent: res.data.aiLargeFileConsent || false,
          aiProxyUrl: res.data.aiProxyUrl || '',
          aiIgnoreCert: res.data.aiIgnoreCert || false,
        })
      }
      setLoading(false)
    })
  }, [])

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    setTestResult(null)
  }

  const save = async () => {
    const res = await window.electronAPI.settings.save(settings)
    if (res.ok) toast('设置已保存', 'success')
    else toast(res.error || '保存失败', 'error')
  }

  const testConnection = async () => {
    const baseUrl = settings.aiBaseUrl || ''
    const apiKey = settings.aiApiKey || ''
    const model = settings.aiModel || ''
    const proxyUrl = settings.aiProxyUrl || ''
    const ignoreCert = !!settings.aiIgnoreCert
    if (!baseUrl || !model) {
      toast('请先填写 API 地址和模型', 'warning')
      return
    }
    setTesting(true)
    setTestResult(null)
    const res = await window.electronAPI.ai.testConnection(baseUrl, apiKey, model, proxyUrl, ignoreCert)
    setTesting(false)
    if (res.ok) {
      setTestResult({ ok: true, msg: res.data })
      toast('AI 连接测试成功', 'success')
    } else {
      setTestResult({ ok: false, msg: res.error })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-2 h-full overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-6">全局设置</h2>

      {/* Editor */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">编辑器</h3>
        <div className="mb-2">
          <label className="block text-xs text-gray-400 mb-1">
            自定义编辑器命令（留空使用系统默认）
          </label>
          <input
            type="text"
            value={settings.editorCommand || ''}
            onChange={(e) => update({ editorCommand: e.target.value })}
            placeholder="如：zed、code、notepad"
            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">主题</h3>
        <div className="flex gap-2">
          {([
            { value: 'light', label: '浅色', icon: Sun },
            { value: 'dark', label: '深色', icon: Moon },
            { value: 'system', label: '跟随系统', icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                update({ theme: value })
                applyTheme(value)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all ${
                (settings.theme || 'light') === value
                  ? 'bg-primary-light text-primary border-primary/30 shadow-sm'
                  : 'text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* AI */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-700">AI 智能模式</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.aiEnabled}
              onChange={(e) => update({ aiEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          AI 仅作为清理顾问提供建议，绝不自行删除文件。智能推荐只发送聚合统计数据（不含具体文件路径）。
        </p>

        {/* API Base URL */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">API 地址</label>
          <input
            type="text"
            value={settings.aiBaseUrl || ''}
            onChange={(e) => update({ aiBaseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            disabled={!settings.aiEnabled}
            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary disabled:opacity-40 transition-colors"
          />
          <p className="text-2xs text-gray-400 mt-1">
            示例：<code>https://api.openai.com/v1</code>、<code>https://api.deepseek.com</code>、<code>http://localhost:11434/v1</code>（Ollama）
          </p>
        </div>

        {/* API Key */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">API Key</label>
          <div className="relative">
            <input
              type={keyVisible ? 'text' : 'password'}
              value={settings.aiApiKey || ''}
              onChange={(e) => update({ aiApiKey: e.target.value })}
              placeholder="sk-..."
              disabled={!settings.aiEnabled}
              className="w-full border border-gray-300 rounded-2xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary disabled:opacity-40 transition-colors"
            />
            <button
              onClick={() => setKeyVisible(!keyVisible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {keyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Model */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">模型</label>
          <input
            type="text"
            value={settings.aiModel || ''}
            onChange={(e) => update({ aiModel: e.target.value })}
            placeholder="gpt-3.5-turbo"
            disabled={!settings.aiEnabled}
            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary disabled:opacity-40 transition-colors"
          />
        </div>

        {/* Proxy URL */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">代理地址（可选）</label>
          <input
            type="text"
            value={settings.aiProxyUrl || ''}
            onChange={(e) => update({ aiProxyUrl: e.target.value })}
            placeholder="http://127.0.0.1:7890"
            disabled={!settings.aiEnabled}
            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary disabled:opacity-40 transition-colors"
          />
          <p className="text-2xs text-gray-400 mt-1">留空则直连；填写代理地址（含 http://）走代理</p>
        </div>

        {/* Ignore cert */}
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!settings.aiIgnoreCert}
            onChange={(e) => update({ aiIgnoreCert: e.target.checked })}
            disabled={!settings.aiEnabled}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary-light disabled:opacity-40"
          />
          <div>
            <span className="text-sm text-gray-700">忽略 SSL 证书错误</span>
            <p className="text-xs text-gray-400 mt-0.5">
              企业代理拦截 HTTPS 时需要开启。仅在信任的网络环境使用。
            </p>
          </div>
        </div>

        {/* Large file consent */}
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!settings.aiLargeFileConsent}
            onChange={(e) => update({ aiLargeFileConsent: e.target.checked })}
            disabled={!settings.aiEnabled}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary-light disabled:opacity-40"
          />
          <div>
            <span className="text-sm text-gray-700">允许 AI 分析大文件名称</span>
            <p className="text-xs text-gray-400 mt-0.5">
              开启后，大文件扫描结果中的文件名将发送至 AI 服务进行分析。不会发送文件内容。
            </p>
          </div>
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-2">
          <button
            onClick={testConnection}
            disabled={!settings.aiEnabled || testing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-2xl bg-primary-light text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <TestTube size={13} />}
            {testing ? '测试中…' : '测试连接'}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 px-3 py-2 rounded-2xl text-xs border ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="font-semibold mb-0.5">{testResult.ok ? '✓ 连接正常' : '✗ 连接失败'}</div>
            <div className="whitespace-pre-wrap break-all">{testResult.msg}</div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-2xl text-sm hover:bg-primary-hover shadow-sm transition-colors"
        >
          <Save size={14} />
          保存设置
        </button>
      </div>
    </div>
  )
}
