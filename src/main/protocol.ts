import { protocol, net } from 'electron'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'appfile',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

const allowedFiles = new Set<string>()
const allowedDirs = new Set<string>()

export function allowFile(absPath: string) {
  const normalized = path.normalize(absPath)
  allowedFiles.add(normalized)
  allowedDirs.add(path.dirname(normalized))
}

export function setupAppFileProtocol() {
  protocol.handle('appfile', (request) => {
    const url = new URL(request.url)
    const filePath = path.normalize(decodeURIComponent(url.pathname.replace(/^\//, '')))
    if (!allowedFiles.has(filePath) && !allowedDirs.has(path.dirname(filePath))) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
