import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const pngDir = path.join(projectRoot, 'resources', 'png')
const outputPath = path.join(projectRoot, 'resources', 'icon.ico')

const bmpSizes = [16, 32, 48]
const pngSizes = [256]

async function main() {
  const allSizes = [...bmpSizes, ...pngSizes]
  const inputs = allSizes.map(s => path.join(pngDir, `icon_${s}x${s}.png`))
  for (const p of inputs) {
    try {
      await fs.access(p)
    } catch {
      throw new Error(`Missing PNG source: ${p}`)
    }
  }

  const bmpBuf = await pngToIco(bmpSizes.map(s => path.join(pngDir, `icon_${s}x${s}.png`)))

  const png256Data = await fs.readFile(path.join(pngDir, 'icon_256x256.png'))

  const bmpEntryCount = bmpBuf.readUInt16LE(4)
  const bmpHeaderSize = 6 + bmpEntryCount * 16

  const entries = []
  for (let i = 0; i < bmpEntryCount; i++) {
    const off = 6 + i * 16
    const w = bmpBuf[off] || 256
    const h = bmpBuf[off + 1] || 256
    const bpp = bmpBuf.readUInt16LE(off + 6)
    const imgSize = bmpBuf.readUInt32LE(off + 8)
    entries.push({ w, h, bpp, size: imgSize, format: 'BMP' })
  }
  entries.push({ w: 256, h: 256, bpp: 32, size: png256Data.length, format: 'PNG' })

  entries.sort((a, b) => a.w - b.w)

  const newHeaderSize = 6 + entries.length * 16
  let currentOffset = newHeaderSize
  const bmpDataOff = bmpHeaderSize
  const outBuf = Buffer.alloc(newHeaderSize + entries.reduce((s, e) => s + e.size, 0))

  outBuf.writeUInt16LE(0, 0)
  outBuf.writeUInt16LE(1, 2)
  outBuf.writeUInt16LE(entries.length, 4)

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const off = 6 + i * 16
    outBuf[off] = e.w >= 256 ? 0 : e.w
    outBuf[off + 1] = e.h >= 256 ? 0 : e.h
    outBuf[off + 2] = 0
    outBuf[off + 3] = 0
    outBuf.writeUInt16LE(1, off + 4)
    outBuf.writeUInt16LE(e.bpp, off + 6)
    outBuf.writeUInt32LE(e.size, off + 8)
    outBuf.writeUInt32LE(currentOffset, off + 12)
    currentOffset += e.size
  }

  let dataCurrent = newHeaderSize
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    let srcData
    if (e.format === 'BMP') {
      const bmpIdx = i < bmpEntryCount ? i : -1
      const bmpEntryOff = 6 + bmpIdx * 16
      const bmpDataStart = bmpBuf.readUInt32LE(bmpEntryOff + 12)
      srcData = bmpBuf.subarray(bmpDataStart, bmpDataStart + e.size)
    } else {
      srcData = png256Data
    }
    srcData.copy(outBuf, dataCurrent)
    dataCurrent += e.size
  }

  await fs.writeFile(outputPath, outBuf)
  console.log(`Generated ${outputPath} (${outBuf.length} bytes): ${bmpSizes.map(s => s + 'x' + s + '(BMP)').join(', ')}, ${pngSizes.map(s => s + 'x' + s + '(PNG)').join(', ')}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})