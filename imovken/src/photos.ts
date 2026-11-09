// Reduz a foto no navegador (máx. 1600 px, JPEG) antes de enviar: economiza dados e espaço no servidor.
export async function resizeToJpeg(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  let q = quality
  for (let i = 0; i < 4; i++) {
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q))
    if (blob && blob.size <= 1_000_000) return blob
    q -= 0.15
  }
  throw new Error("Não foi possível reduzir a imagem. Tente outra foto.")
}

export async function uploadPhoto(listingId: number, blob: Blob) {
  const r = await fetch(`/api/listings/${listingId}/photos`, { method: "POST", credentials: "same-origin", headers: { "content-type": "image/jpeg" }, body: blob })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || "Falha ao enviar a foto.")
  return j as { id: number }
}
export async function deletePhoto(id: number) {
  const r = await fetch(`/api/photos/${id}`, { method: "DELETE", credentials: "same-origin" })
  if (!r.ok) throw new Error("Falha ao remover a foto.")
}
