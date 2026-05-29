const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')

const sizes = [16, 32, 48, 64, 128, 256]
const inputPath = path.join(__dirname, '..', 'build', 'icon.png')
const outputPath = path.join(__dirname, '..', 'build', 'icon.ico')

const srcData = fs.readFileSync(inputPath)
const src = PNG.sync.read(srcData)

function resize(img, size) {
  const dst = new PNG({ width: size, height: size })
  const scaleX = img.width / size
  const scaleY = img.height / size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = Math.floor(x * scaleX)
      const srcY = Math.floor(y * scaleY)
      const srcIdx = (srcY * img.width + srcX) << 2
      const dstIdx = (y * size + x) << 2
      dst.data[dstIdx] = img.data[srcIdx]
      dst.data[dstIdx + 1] = img.data[srcIdx + 1]
      dst.data[dstIdx + 2] = img.data[srcIdx + 2]
      dst.data[dstIdx + 3] = img.data[srcIdx + 3]
    }
  }
  return dst
}

const images = sizes.map((size) => {
  const resized = size === src.width ? src : resize(src, size)
  return { size, pngData: PNG.sync.write(resized) }
})

const headerSize = 6
const entrySize = 16
const dataOffset = headerSize + entrySize * images.length

let totalSize = dataOffset
for (const img of images) {
  totalSize += img.pngData.length
}

const buf = Buffer.alloc(totalSize)
let offset = 0

buf.writeUInt16LE(0, offset); offset += 2
buf.writeUInt16LE(1, offset); offset += 2
buf.writeUInt16LE(images.length, offset); offset += 2

let dataCurrentOffset = dataOffset
for (const img of images) {
  buf.writeUInt8(img.size < 256 ? img.size : 0, offset); offset += 1
  buf.writeUInt8(img.size < 256 ? img.size : 0, offset); offset += 1
  buf.writeUInt8(0, offset); offset += 1
  buf.writeUInt8(0, offset); offset += 1
  buf.writeUInt16LE(1, offset); offset += 2
  buf.writeUInt16LE(32, offset); offset += 2
  buf.writeUInt32LE(img.pngData.length, offset); offset += 4
  buf.writeUInt32LE(dataCurrentOffset, offset); offset += 4
  dataCurrentOffset += img.pngData.length
}

for (const img of images) {
  img.pngData.copy(buf, offset)
  offset += img.pngData.length
}

fs.writeFileSync(outputPath, buf)
console.log('Created ' + outputPath + ' with ' + images.length + ' sizes: ' + sizes.join(', ') + 'px')
