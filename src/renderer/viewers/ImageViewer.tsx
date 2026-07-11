import type { ViewerProps } from './registry'

export default function ImageViewer({ src, fileName }: ViewerProps) {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <img src={src} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  )
}
