import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const asarHeaderSizeField = 4
const asarHeaderSizeFieldSize = 4
const asarHeaderSizeSize = 4
const asarStringHeaderSize = 4 + asarHeaderSizeFieldSize + asarHeaderSizeSize + 4

async function readAsarHeader(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const headerSizeBuffer = Buffer.alloc(asarHeaderSizeFieldSize)
    fs.readSync(fd, headerSizeBuffer, 0, asarHeaderSizeFieldSize, asarHeaderSizeFieldSize)
    const headerSize = headerSizeBuffer.readUInt32LE(0)
    const headerBuffer = Buffer.alloc(headerSize)
    fs.readSync(fd, headerBuffer, 0, headerSize, asarStringHeaderSize)
    return headerBuffer
  } finally {
    fs.closeSync(fd)
  }
}

async function hashHeader(filePath) {
  const header = await readAsarHeader(filePath)
  const hash = crypto.createHash('sha256')
  hash.update(header)
  return {
    algorithm: 'SHA256',
    hash: hash.digest('hex'),
  }
}

export async function computeData({ resourcesPath, resourcesRelativePath }) {
  const files = fs.readdirSync(resourcesPath)
    .filter(f => f.endsWith('.asar'))
    .sort()

  const result = {}
  for (const name of files) {
    const filePath = path.join(resourcesPath, name)
    const checksum = await hashHeader(filePath)
    result[path.join(resourcesRelativePath, name)] = checksum
  }
  return result
}