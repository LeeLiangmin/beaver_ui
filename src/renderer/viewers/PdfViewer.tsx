import type { ViewerProps } from './registry'

export default function PdfViewer({ src }: ViewerProps) {
  return (
    <iframe
      src={src}
      title="pdf"
      style={{ width: '100%', height: '100%', border: 0 }}
    />
  )
}
