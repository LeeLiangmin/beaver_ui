import type React from 'react'

export interface ViewerProps {
  src: string
  filePath: string
  fileName: string
}

interface ViewerEntry {
  id: string
  match: (f: { ext: string; mime?: string }) => boolean
  component: React.LazyExoticComponent<React.ComponentType<ViewerProps>>
}

const registry: ViewerEntry[] = []

export const registerViewer = (e: ViewerEntry) => registry.push(e)

export const resolveViewer = (f: { ext: string; mime?: string }) =>
  registry.find((v) => v.match(f))
