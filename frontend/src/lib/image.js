const MAX_SIDE = 1600
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

const readAsDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Dosya okunamadı.'))
    reader.readAsDataURL(blob)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Görsel açılamadı. PNG, JPEG ya da WEBP dosyası seçin.'))
    img.src = src
  })

export async function prepareImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Lütfen bir görsel dosyası seçin (PNG, JPEG, WEBP).')
  const original = await readAsDataURL(file)
  const img = await loadImage(original)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  if (scale === 1 && ACCEPTED.includes(file.type) && file.size <= MAX_BYTES / 2) {
    return { dataUrl: original, mimeType: file.type, name: file.name || 'görsel' }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), mimeType: 'image/jpeg', name: file.name || 'görsel' }
}
