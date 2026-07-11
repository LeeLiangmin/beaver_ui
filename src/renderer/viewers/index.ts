import { lazy } from 'react'
import { registerViewer } from './registry'

export { FileViewer } from './FileViewer'
export { toAppFileUrl } from './url'
export type { ViewerProps } from './registry'

registerViewer({
  id: 'pdf',
  match: (f) => f.ext === 'pdf',
  component: lazy(() => import('./PdfViewer')),
})

registerViewer({
  id: 'markdown',
  match: (f) => ['md', 'markdown'].includes(f.ext),
  component: lazy(() => import('./MarkdownViewer')),
})

registerViewer({
  id: 'image',
  match: (f) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(f.ext),
  component: lazy(() => import('./ImageViewer')),
})

registerViewer({
  id: 'code',
  match: () => true,
  component: lazy(() => import('./CodeViewer')),
})
