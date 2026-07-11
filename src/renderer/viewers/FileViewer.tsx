import { Suspense } from 'react'
import { resolveViewer } from './registry'
import { toAppFileUrl } from './url'

export function FileViewer({ filePath }: { filePath: string }) {
  const fileName = filePath.split(/[/\\]/).pop() ?? ''
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const entry = resolveViewer({ ext })

  if (!entry) {
    return <div className="viewer-empty">不支持的文件类型：.{ext}</div>
  }

  const Viewer = entry.component
  return (
    <Suspense fallback={<div className="viewer-loading">加载中…</div>}>
      <Viewer src={toAppFileUrl(filePath)} filePath={filePath} fileName={fileName} />
    </Suspense>
  )
}
