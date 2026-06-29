import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

/**
 * Post-build safety net: re-embeds ASAR integrity into win-unpacked/Beaver.exe.
 * Icon/metadata are already set by the afterPack hook during electron-builder,
 * so this script only handles integrity as a fallback.
 */
function findExes() {
  const result = []
  // Find all release* directories
  let releaseDirs = []
  try {
    for (const entry of fs.readdirSync(projectRoot)) {
      const fullPath = path.join(projectRoot, entry)
      if (entry.startsWith('release') && fs.statSync(fullPath).isDirectory()) {
        releaseDirs.push(fullPath)
      }
    }
  } catch (_) {}

  for (const releaseDir of releaseDirs) {

    const winUnpacked = path.join(releaseDir, 'win-unpacked')
    if (fs.existsSync(winUnpacked)) {
      const exePath = path.join(winUnpacked, 'Beaver.exe')
      if (fs.existsSync(exePath) && !result.includes(exePath)) {
        result.push(exePath)
      }
    }

    // Also find standalone exes (installer, portable) for logging purposes
    try {
      for (const f of fs.readdirSync(releaseDir)) {
        if (
          (f.endsWith('.exe') || f.endsWith('-portable.exe')) &&
          !f.startsWith('builder-') &&
          !f.startsWith('__')
        ) {
          const p = path.join(releaseDir, f)
          if (fs.existsSync(p) && !result.includes(p)) result.push(p)
        }
      }
    } catch (_) { /* ignore readdir errors */ }
  }

  return result
}

async function reembedAsarIntegrity(exePath) {
  const asarPath = path.join(path.dirname(exePath), 'resources', 'app.asar')
  if (!fs.existsSync(asarPath)) {
    console.log(`  [${path.basename(exePath)}] No app.asar, skipping (self-contained package)`)
    return
  }

  try {
    const { computeData } = await import('./asar-integrity.mjs')
    const resourcesPath = path.join(path.dirname(exePath), 'resources')
    const asarIntegrity = await computeData({ resourcesPath, resourcesRelativePath: 'resources' })

    const resedit = await import('resedit')
    const NtExecutable = resedit.NtExecutable
    const NtExecutableResource = resedit.NtExecutableResource
    const Resource = resedit.Resource

    const buffer = fs.readFileSync(exePath)
    const executable = NtExecutable.from(buffer)
    const resource = NtExecutableResource.from(executable)
    const versionInfo = Resource.VersionInfo.fromEntries(resource.entries)
    if (versionInfo.length !== 1) {
      console.log(`  [${path.basename(exePath)}] No version info, skipping integrity`)
      return
    }
    const languages = versionInfo[0].getAllLanguagesForStringValues()
    if (languages.length !== 1) {
      console.log(`  [${path.basename(exePath)}] Multiple languages, skipping integrity`)
      return
    }

    const integrityList = Object.entries(asarIntegrity).map(
      ([file, { algorithm: alg, hash: value }]) => ({ file, alg, value })
    )

    const existingIndex = resource.entries.findIndex(
      (e) => e.type === 'INTEGRITY' && e.id === 'ELECTRONASAR'
    )
    if (existingIndex !== -1) {
      resource.entries.splice(existingIndex, 1)
    }

    resource.entries.push({
      type: 'INTEGRITY',
      id: 'ELECTRONASAR',
      bin: Buffer.from(JSON.stringify(integrityList)),
      lang: languages[0].lang,
      codepage: languages[0].codepage,
    })
    resource.outputResource(executable)
    fs.writeFileSync(exePath, Buffer.from(executable.generate()))
    console.log(`  [${path.basename(exePath)}] Asar integrity re-embedded`)
  } catch (e) {
    console.error(`  [${path.basename(exePath)}] Integrity failed: ${e.message}`)
  }
}

async function main() {
  const exes = findExes()
  if (exes.length === 0) {
    console.log('No exe files found - nothing to do')
    return
  }

  console.log(`Found ${exes.length} exe(s), ensuring ASAR integrity...`)
  for (const exe of exes) {
    await reembedAsarIntegrity(exe)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
