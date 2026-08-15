import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8) // Bit depth
  ihdrData.writeUInt8(2, 9) // Color type (RGB)
  ihdrData.writeUInt8(0, 10) // Compression
  ihdrData.writeUInt8(0, 11) // Filter
  ihdrData.writeUInt8(0, 12) // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData)

  // IDAT chunk (raw RGB image data with 0 filter byte per scanline)
  const rawRow = Buffer.alloc(1 + width * 3)
  rawRow[0] = 0 // Filter type 0
  for (let i = 0; i < width; i++) {
    rawRow[1 + i * 3] = r
    rawRow[1 + i * 3 + 1] = g
    rawRow[1 + i * 3 + 2] = b
  }

  const rawData = Buffer.concat(Array.from({ length: height }, () => rawRow))
  const compressedData = zlib.deflateSync(rawData)
  const idatChunk = createChunk('IDAT', compressedData)

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(4 + 4 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crc = crc32(buf.subarray(4, 8 + len))
  buf.writeUInt32BE(crc, 8 + len)
  return buf
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

const outDir = path.resolve('public')
const icon192 = createPNG(192, 192, 88, 28, 135) // Deep purple #581c87
const icon512 = createPNG(512, 512, 88, 28, 135)

fs.writeFileSync(path.join(outDir, 'icon-192.png'), icon192)
fs.writeFileSync(path.join(outDir, 'icon-512.png'), icon512)
console.log('Successfully created public/icon-192.png and public/icon-512.png!')
