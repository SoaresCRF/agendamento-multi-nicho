// Center-crops an image to a square (matching how the avatar is always displayed,
// via object-cover) and downscales it to a fixed size, so an upload of any
// aspect ratio or resolution lands as one small, consistent square photo.

export function centerCropSquare(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height)
  return { sx: (width - size) / 2, sy: (height - size) / 2, size }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem'))
    }
    img.src = url
  })
}

export async function cropImageToSquareDataUrl(file: File, targetSize: number): Promise<string> {
  const img = await loadImage(file)
  const { sx, sy, size } = centerCropSquare(img.naturalWidth, img.naturalHeight)

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado neste navegador')

  ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize)
  return canvas.toDataURL('image/jpeg', 0.85)
}
