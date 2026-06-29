const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

/**
 * electron-builder afterPack hook.
 * Runs AFTER the app is packaged to win-unpacked/ but BEFORE NSIS/portable installers are built.
 * This ensures the exe icon and integrity are patched in time.
 */
exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context

  if (electronPlatformName !== 'win32') {
    console.log(`  afterPack: skipping non-Windows platform: ${electronPlatformName}`)
    return
  }

  const exePath = path.join(appOutDir, 'Beaver.exe')
  if (!fs.existsSync(exePath)) {
    console.log(`  afterPack: Beaver.exe not found at ${exePath}`)
    return
  }

  console.log(`  afterPack: processing ${exePath}`)

  // --- Step 1: set icon + version metadata via rcedit ---
  const rcedit = findRcedit()
  if (rcedit && fs.existsSync(rcedit)) {
    const projectRoot = path.resolve(__dirname, '..')
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'))
    const iconPath = path.join(projectRoot, 'resources', 'icon.ico')

    const appInfo = {
      description: packageJson.description || packageJson.name,
      productName: packageJson.productName || packageJson.name,
      version: packageJson.version,
      copyright: `Copyright \u00A9 ${new Date().getFullYear()} ${packageJson.author || packageJson.name}`,
    }

    const args = [
      exePath,
      '--set-icon', iconPath,
      '--set-version-string', 'FileDescription', appInfo.description,
      '--set-version-string', 'ProductName', appInfo.productName,
      '--set-version-string', 'LegalCopyright', appInfo.copyright,
      '--set-file-version', appInfo.version,
      '--set-product-version', appInfo.version,
      '--set-version-string', 'InternalName', appInfo.productName,
      '--set-version-string', 'OriginalFilename', path.basename(exePath),
      '--set-version-string', 'CompanyName', appInfo.description,
    ]

    // Retry up to 5 times with delay (Defender may lock the file temporarily)
    let iconSet = false
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        execFileSync(rcedit, args, { encoding: 'utf-8', stdio: 'pipe' })
        console.log('  afterPack: icon + metadata set successfully')
        iconSet = true
        break
      } catch (e) {
        const errMsg = (e.stderr || e.message || '').substring(0, 100)
        if (attempt < 5) {
          console.log(`  afterPack: attempt ${attempt} failed (${errMsg}), retrying in 3s...`)
          await sleep(3000)
        } else {
          console.log(`  afterPack: metadata failed after 5 attempts, trying icon-only...`)
          for (let a2 = 1; a2 <= 3; a2++) {
            try {
              execFileSync(rcedit, [exePath, '--set-icon', iconPath], { encoding: 'utf-8', stdio: 'pipe' })
              console.log('  afterPack: icon set (metadata skipped)')
              iconSet = true
              break
            } catch (e2) {
              if (a2 < 3) {
                await sleep(3000)
              } else {
                console.log(`  afterPack: icon also failed after retries`)
              }
            }
          }
        }
      }
    }
    if (!iconSet) {
      console.log('  afterPack: WARNING - icon was not set, will use default Electron icon')
    }
  } else {
    console.log('  afterPack: rcedit not found, skipping icon/metadata')
  }

  // --- Step 2: re-embed ASAR integrity ---
  await reembedAsarIntegrity(exePath)
}

function findRcedit() {
  const projectRoot = path.resolve(__dirname, '..')
  const candidates = [
    path.join(projectRoot, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
    path.join(projectRoot, 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return path.join(
    process.env.LOCALAPPDATA || '',
    'electron-builder', 'Cache', 'winCodeSign', 'winCodeSign-2.6.0', 'rcedit-x64.exe'
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function reembedAsarIntegrity(exePath) {
  const asarPath = path.join(path.dirname(exePath), 'resources', 'app.asar')
  if (!fs.existsSync(asarPath)) {
    console.log('  afterPack: No app.asar found, skipping integrity re-embed')
    return
  }

  try {
    // Dynamically import the ESM asar-integrity module from this CJS context
    const { computeData } = await import('./asar-integrity.mjs')
    const resourcesPath = path.join(path.dirname(exePath), 'resources')
    const asarIntegrity = await computeData({ resourcesPath, resourcesRelativePath: 'resources' })

    const resedit = require('resedit')
    const NtExecutable = resedit.NtExecutable
    const NtExecutableResource = resedit.NtExecutableResource
    const Resource = resedit.Resource

    const buffer = fs.readFileSync(exePath)
    const executable = NtExecutable.from(buffer)
    const resource = NtExecutableResource.from(executable)
    const versionInfo = Resource.VersionInfo.fromEntries(resource.entries)
    if (versionInfo.length !== 1) {
      console.log('  afterPack: No version info found, skipping integrity re-embed')
      return
    }
    const languages = versionInfo[0].getAllLanguagesForStringValues()
    if (languages.length !== 1) {
      console.log('  afterPack: Multiple languages found, skipping integrity re-embed')
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
    console.log('  afterPack: Asar integrity re-embedded')
  } catch (e) {
    console.error(`  afterPack: Failed to re-embed asar integrity: ${e.message}`)
  }
}
