import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import { useEffect, useState, useCallback } from 'react'
import type { ViewerProps } from './registry'
import { toAppFileUrl } from './url'

export default function MarkdownViewer({ src, filePath }: ViewerProps) {
  const [text, setText] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch(() => {
        if (!cancelled) setText('*文件读取失败*')
      })
    return () => {
      cancelled = true
    }
  }, [src])

  const baseDir = filePath.replace(/[/\\][^/\\]+$/, '')

  const urlTransform = useCallback(
    (url: string) => {
      if (/^(https?:|mailto:|data:|appfile:|#)/.test(url)) return url
      const sep = baseDir.includes('\\') ? '\\' : '/'
      const abs = baseDir + sep + url
      return toAppFileUrl(abs)
    },
    [baseDir],
  )

  return (
    <div className="markdown-body p-4 overflow-auto h-full">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        urlTransform={urlTransform}
      >
        {text}
      </Markdown>
    </div>
  )
}
