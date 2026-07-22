"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  GripVertical,
  ImageOff,
  ImagePlus,
  Images,
  LoaderCircle,
  RefreshCw,
  Ruler,
  Save,
  Trash2,
  Upload,
} from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type {
  AlbumCollection,
  AlbumCollectionInput,
  AlbumPhoto,
  AlbumPhotoInput,
} from "@/lib/album-repository"

type PhotoDraft = AlbumPhotoInput & { clientId: string }
type AlbumDraft = Omit<AlbumCollectionInput, "photos"> & {
  clientId: string
  photos: PhotoDraft[]
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

async function fetchAlbums(): Promise<AlbumCollection[]> {
  const data = await readJson<{ albums: AlbumCollection[] }>(
    await fetch("/api/admin/album", { cache: "no-store" }),
  )
  return data.albums
}

function toPhotoDraft(photo: AlbumPhoto): PhotoDraft {
  return {
    clientId: `photo-${photo.id}`,
    src: photo.src,
    alt: photo.alt,
    caption: photo.caption,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt || "",
    originalName: photo.originalName || "",
  }
}

function toAlbumDraft(album: AlbumCollection): AlbumDraft {
  return {
    clientId: `album-${album.id}`,
    slug: album.slug,
    title: album.title,
    description: album.description,
    period: album.period,
    coverSrc: album.coverSrc,
    photos: album.photos.map(toPhotoDraft),
  }
}

function canPreview(source: string): boolean {
  if (source.startsWith("/") && !source.startsWith("//")) return true
  try {
    return new URL(source).protocol === "https:"
  } catch {
    return false
  }
}

function sourceLabel(source: string): string {
  if (!source) return "尚未填写地址"
  if (source.startsWith("/")) return "站内图片"
  try {
    return new URL(source).hostname
  } catch {
    return "地址待修正"
  }
}

async function readExifTakenAt(file: File): Promise<string> {
  if (file.type !== "image/jpeg") return ""
  try {
    const view = new DataView(await file.arrayBuffer())
    const ascii = (offset: number, length: number) => Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join("")
    if (view.getUint16(0, false) !== 0xffd8) return ""
    let offset = 2
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false)
      const length = view.getUint16(offset + 2, false)
      if (marker === 0xffe1 && ascii(offset + 4, 6) === "Exif\0\0") {
        const tiff = offset + 10
        const byteOrder = view.getUint16(tiff, false)
        const little = byteOrder === 0x4949
        if (!little && byteOrder !== 0x4d4d) return ""
        const u16 = (position: number) => view.getUint16(position, little)
        const u32 = (position: number) => view.getUint32(position, little)
        const findTag = (ifd: number, tag: number): { type: number; count: number; valueOffset: number } | null => {
          const entries = u16(ifd)
          for (let index = 0; index < entries; index += 1) {
            const entry = ifd + 2 + index * 12
            if (u16(entry) === tag) return { type: u16(entry + 2), count: u32(entry + 4), valueOffset: entry + 8 }
          }
          return null
        }
        const ifd0 = tiff + u32(tiff + 4)
        const exifPointer = findTag(ifd0, 0x8769)
        if (!exifPointer) return ""
        const exifIfd = tiff + u32(exifPointer.valueOffset)
        const dateTag = findTag(exifIfd, 0x9003) || findTag(exifIfd, 0x9004)
        if (!dateTag || dateTag.type !== 2 || dateTag.count < 16) return ""
        const value = dateTag.count <= 4 ? dateTag.valueOffset : tiff + u32(dateTag.valueOffset)
        const raw = ascii(value, Math.min(dateTag.count, 32)).replace(/\0.*$/, "")
        const match = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/)
        return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` : ""
      }
      if (length < 2) break
      offset += 2 + length
    }
  } catch {}
  return ""
}

function nextAlbumSlug(albums: AlbumDraft[]): string {
  let index = albums.length + 1
  while (albums.some((album) => album.slug === `album-${index}`)) index += 1
  return `album-${index}`
}

export function AdminAlbumEditor() {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [albums, setAlbums] = useState<AlbumDraft[]>([])
  const [activeAlbumId, setActiveAlbumId] = useState("")
  const [activePhotoId, setActivePhotoId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draggingId, setDraggingId] = useState("")
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const activeAlbumIndex = albums.findIndex((album) => album.clientId === activeAlbumId)
  const activeAlbum = activeAlbumIndex >= 0 ? albums[activeAlbumIndex] : null
  const photos = activeAlbum?.photos || []
  const activePhotoIndex = photos.findIndex((photo) => photo.clientId === activePhotoId)
  const activePhoto = activePhotoIndex >= 0 ? photos[activePhotoIndex] : null

  const orientation = useMemo(() => {
    if (!activePhoto) return ""
    if (activePhoto.width === activePhoto.height) return "方形"
    return activePhoto.width > activePhoto.height ? "横图" : "竖图"
  }, [activePhoto])

  function selectAlbum(clientId: string, nextAlbums = albums) {
    const album = nextAlbums.find((item) => item.clientId === clientId)
    setActiveAlbumId(clientId)
    setActivePhotoId(album?.photos[0]?.clientId || "")
    setError("")
    setMessage("")
  }

  function applyLoadedAlbums(loaded: AlbumCollection[]) {
    const next = loaded.map(toAlbumDraft)
    setAlbums(next)
    const selected = next.find((album) => album.clientId === activeAlbumId) || next[0]
    setActiveAlbumId(selected?.clientId || "")
    setActivePhotoId(selected?.photos[0]?.clientId || "")
    setDirty(false)
  }

  async function load(options?: { confirmDiscard?: boolean }) {
    if (options?.confirmDiscard && dirty && !window.confirm("放弃尚未保存的子相册修改吗？")) return
    setLoading(true)
    setError("")
    setMessage("")
    try {
      applyLoadedAlbums(await fetchAlbums())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "子相册读取失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitialAlbums() {
      try {
        const next = (await fetchAlbums()).map(toAlbumDraft)
        if (cancelled) return
        setAlbums(next)
        setActiveAlbumId(next[0]?.clientId || "")
        setActivePhotoId(next[0]?.photos[0]?.clientId || "")
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "子相册读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialAlbums()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warnBeforeLeave)
    return () => window.removeEventListener("beforeunload", warnBeforeLeave)
  }, [dirty])

  function markChanged() {
    setDirty(true)
    setError("")
    setMessage("")
  }

  function updateAlbum<K extends keyof Omit<AlbumCollectionInput, "photos">>(key: K, value: AlbumDraft[K]) {
    if (!activeAlbum) return
    setAlbums((current) => current.map((album) => album.clientId === activeAlbum.clientId ? { ...album, [key]: value } : album))
    markChanged()
  }

  function updatePhoto<K extends keyof AlbumPhotoInput>(key: K, value: AlbumPhotoInput[K]) {
    updatePhotoFields({ [key]: value } as Pick<AlbumPhotoInput, K>)
  }

  function updatePhotoFields(fields: Partial<AlbumPhotoInput>) {
    if (!activeAlbum || !activePhoto) return
    setAlbums((current) => current.map((album) => album.clientId === activeAlbum.clientId
      ? { ...album, photos: album.photos.map((photo) => photo.clientId === activePhoto.clientId ? { ...photo, ...fields } : photo) }
      : album))
    markChanged()
  }

  function addAlbum() {
    const album: AlbumDraft = {
      clientId: `new-album-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      slug: nextAlbumSlug(albums),
      title: "新相册",
      description: "",
      period: "",
      coverSrc: "",
      photos: [],
    }
    const next = [...albums, album]
    setAlbums(next)
    selectAlbum(album.clientId, next)
    markChanged()
  }

  function removeAlbum() {
    if (!activeAlbum || !window.confirm(`确定删除“${activeAlbum.title}”吗？其中 ${activeAlbum.photos.length} 张图片会在保存后从前台移除。`)) return
    const next = albums.filter((album) => album.clientId !== activeAlbum.clientId)
    setAlbums(next)
    const selected = next[Math.min(activeAlbumIndex, next.length - 1)]
    setActiveAlbumId(selected?.clientId || "")
    setActivePhotoId(selected?.photos[0]?.clientId || "")
    markChanged()
  }

  function moveAlbum(offset: -1 | 1) {
    if (!activeAlbum) return
    const target = activeAlbumIndex + offset
    if (target < 0 || target >= albums.length) return
    setAlbums((current) => {
      const next = [...current]
      ;[next[activeAlbumIndex], next[target]] = [next[target], next[activeAlbumIndex]]
      return next
    })
    markChanged()
  }

  function addPhoto() {
    if (!activeAlbum) return
    const photo: PhotoDraft = {
      clientId: `new-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: "",
      alt: "相册图片",
      caption: "",
      width: 1600,
      height: 1200,
      takenAt: "",
      originalName: "",
    }
    setAlbums((current) => current.map((album) => album.clientId === activeAlbum.clientId
      ? { ...album, photos: [...album.photos, photo] }
      : album))
    setActivePhotoId(photo.clientId)
    markChanged()
  }

  function removePhoto() {
    if (!activeAlbum || !activePhoto || !window.confirm(`确定删除第 ${activePhotoIndex + 1} 张图片吗？保存后前台会立即移除。`)) return
    const nextPhotos = photos.filter((photo) => photo.clientId !== activePhoto.clientId)
    setAlbums((current) => current.map((album) => album.clientId === activeAlbum.clientId ? { ...album, photos: nextPhotos } : album))
    setActivePhotoId(nextPhotos[Math.min(activePhotoIndex, nextPhotos.length - 1)]?.clientId || "")
    markChanged()
  }

  function movePhoto(offset: -1 | 1) {
    if (!activeAlbum || !activePhoto) return
    const target = activePhotoIndex + offset
    if (target < 0 || target >= photos.length) return
    setAlbums((current) => current.map((album) => {
      if (album.clientId !== activeAlbum.clientId) return album
      const nextPhotos = [...album.photos]
      ;[nextPhotos[activePhotoIndex], nextPhotos[target]] = [nextPhotos[target], nextPhotos[activePhotoIndex]]
      return { ...album, photos: nextPhotos }
    }))
    markChanged()
  }

  function movePhotoTo(sourceId: string, targetId: string) {
    if (!activeAlbum || !sourceId || sourceId === targetId) return
    setAlbums((current) => current.map((album) => {
      if (album.clientId !== activeAlbum.clientId) return album
      const sourceIndex = album.photos.findIndex((photo) => photo.clientId === sourceId)
      const targetIndex = album.photos.findIndex((photo) => photo.clientId === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return album
      const nextPhotos = [...album.photos]
      const [moved] = nextPhotos.splice(sourceIndex, 1)
      nextPhotos.splice(targetIndex, 0, moved)
      return { ...album, photos: nextPhotos }
    }))
    setActivePhotoId(sourceId)
    markChanged()
  }

  async function uploadPhoto(file: File) {
    if (!activeAlbum || uploading) return
    setUploading(true)
    setError("")
    setMessage("")
    const objectUrl = URL.createObjectURL(file)
    try {
      const [dimensions, takenAt] = await Promise.all([
        new Promise<{ width: number; height: number }>((resolve, reject) => {
          const image = new window.Image()
          image.onload = () => image.naturalWidth && image.naturalHeight
            ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
            : reject(new Error("无法读取图片尺寸"))
          image.onerror = () => reject(new Error("无法读取这个图片文件"))
          image.src = objectUrl
        }),
        readExifTakenAt(file),
      ])
      const form = new FormData()
      form.set("file", file)
      const data = await readJson<{ upload: { src: string } }>(await fetch("/api/admin/album/upload", {
        method: "POST",
        body: form,
      }))
      const displayName = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "相册图片"
      const photo: PhotoDraft = {
        clientId: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        src: data.upload.src,
        alt: displayName,
        caption: displayName,
        originalName: file.name.slice(0, 240),
        takenAt,
        ...dimensions,
      }
      setAlbums((current) => current.map((album) => album.clientId === activeAlbum.clientId
        ? { ...album, photos: [...album.photos, photo] }
        : album))
      setActivePhotoId(photo.clientId)
      markChanged()
      setMessage(`图片已上传到“${activeAlbum.title}”，尺寸 ${dimensions.width} × ${dimensions.height}，请保存全部相册`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片上传失败")
    } finally {
      URL.revokeObjectURL(objectUrl)
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }

  async function detectDimensions() {
    if (!activePhoto || !canPreview(activePhoto.src) || detecting) {
      setError("请先填写可访问的站内路径或 HTTPS 图片地址")
      return
    }
    setDetecting(true)
    setError("")
    setMessage("")
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new window.Image()
        image.decoding = "async"
        image.onload = () => image.naturalWidth && image.naturalHeight
          ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
          : reject(new Error("无法读取图片尺寸"))
        image.onerror = () => reject(new Error("图片加载失败，请检查地址"))
        image.src = activePhoto.src
      })
      updatePhotoFields(dimensions)
      setMessage(`已读取原图尺寸：${dimensions.width} × ${dimensions.height}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片尺寸读取失败")
    } finally {
      setDetecting(false)
    }
  }

  async function save() {
    if (saving || !dirty) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const data = await readJson<{ albums: AlbumCollection[] }>(await fetch("/api/admin/album", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          albums: albums.map(({ slug, title, description, period, coverSrc, photos: albumPhotos }) => ({
            slug,
            title,
            description,
            period,
            coverSrc,
            photos: albumPhotos.map(({ src, alt, caption, width, height, takenAt, originalName }) => ({
              src,
              alt,
              caption,
              width,
              height,
              takenAt,
              originalName,
            })),
          })),
        }),
      }))
      applyLoadedAlbums(data.albums)
      setMessage("全部子相册已保存，前台目录、图片和顺序立即生效")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "子相册保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-album-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取子相册</div>
  }

  return (
    <section className="admin-album-manager magic-surface" aria-labelledby="admin-album-title">
      <BorderBeam size={150} duration={12} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
      <header className="admin-album-heading">
        <div>
          <p className="section-kicker">ALBUMS / COLLECTIONS</p>
          <h2 id="admin-album-title">子相册管理</h2>
          <p>创建多个独立相册，分别设置封面、说明和图片瀑布流。现有图片已经归入“流萤相册”。</p>
        </div>
        <div>
          <a href="/mine/album" target="_blank" rel="noreferrer">查看相册<ExternalLink aria-hidden="true" /></a>
          <button type="button" onClick={addAlbum}><FolderPlus aria-hidden="true" />新增相册</button>
          <button type="button" onClick={addPhoto} disabled={!activeAlbum}><ImagePlus aria-hidden="true" />添加图片</button>
          <label className="admin-album-upload" aria-disabled={!activeAlbum || uploading}>
            {uploading ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {uploading ? "上传中" : "上传图片"}
            <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={!activeAlbum || uploading} onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadPhoto(file)
            }} />
          </label>
        </div>
      </header>

      {albums.length ? (
        <>
          <section className="admin-album-collections" aria-label="子相册列表">
            <header>
              <div><span>子相册</span><strong>{albums.length} 个</strong></div>
              <button type="button" onClick={() => void load({ confirmDiscard: true })} aria-label="重新读取子相册"><RefreshCw aria-hidden="true" /></button>
            </header>
            <div>
              {albums.map((album, index) => {
                const cover = album.coverSrc || album.photos[0]?.src
                return (
                  <button type="button" className={album.clientId === activeAlbumId ? "is-active" : ""} onClick={() => selectAlbum(album.clientId)} key={album.clientId}>
                    <span>{cover && canPreview(cover) ? <ResilientImage src={cover} alt="" loading="lazy" decoding="async" /> : <FolderOpen aria-hidden="true" />}</span>
                    <span><strong>{album.title || "未命名相册"}</strong><small>/{album.slug || "未填写"} · {album.photos.length} 张</small></span>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </button>
                )
              })}
            </div>
          </section>

          {activeAlbum ? (
            <section className="admin-album-settings" aria-labelledby="admin-album-settings-title">
              <header>
                <div><p className="section-kicker">ALBUM SETTINGS</p><h3 id="admin-album-settings-title">{activeAlbum.title || "相册设置"}</h3></div>
                <div>
                  <button type="button" onClick={() => moveAlbum(-1)} disabled={activeAlbumIndex === 0}><ArrowUp aria-hidden="true" />前移</button>
                  <button type="button" onClick={() => moveAlbum(1)} disabled={activeAlbumIndex === albums.length - 1}><ArrowDown aria-hidden="true" />后移</button>
                  <button className="danger" type="button" onClick={removeAlbum}><Trash2 aria-hidden="true" />删除相册</button>
                </div>
              </header>
              <div className="admin-album-settings-grid">
                <div className="admin-field"><label htmlFor="album-title">相册标题 *</label><input id="album-title" value={activeAlbum.title} maxLength={80} onChange={(event) => updateAlbum("title", event.target.value)} /></div>
                <div className="admin-field"><label htmlFor="album-slug">链接标识 *</label><input id="album-slug" value={activeAlbum.slug} maxLength={80} spellCheck={false} onChange={(event) => updateAlbum("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /><small>小写字母、数字和连字符，例如 firefly。</small></div>
                <div className="admin-field"><label htmlFor="album-period">时间或期数</label><input id="album-period" value={activeAlbum.period} maxLength={80} placeholder="例如 2026.01.01" onChange={(event) => updateAlbum("period", event.target.value)} /></div>
                <div className="admin-field"><label htmlFor="album-cover">封面地址</label><input id="album-cover" value={activeAlbum.coverSrc} spellCheck={false} placeholder="留空时使用第一张图片" onChange={(event) => updateAlbum("coverSrc", event.target.value)} /></div>
                <div className="admin-field admin-album-description"><label htmlFor="album-description">相册说明</label><textarea id="album-description" value={activeAlbum.description} maxLength={280} rows={3} onChange={(event) => updateAlbum("description", event.target.value)} /></div>
              </div>
            </section>
          ) : null}

          <div className="admin-album-workspace">
            <aside className="admin-album-sidebar">
              <header><div><span>图片列表</span><strong>{photos.length} 张</strong></div><button type="button" onClick={addPhoto} aria-label="添加图片"><ImagePlus aria-hidden="true" /></button></header>
              {photos.length ? (
                <div className="admin-album-list">
                  {photos.map((photo, index) => (
                    <button
                      type="button"
                      className={photo.clientId === activePhotoId ? "is-active" : ""}
                      draggable
                      aria-grabbed={draggingId === photo.clientId}
                      onDragStart={(event) => { setDraggingId(photo.clientId); event.dataTransfer.effectAllowed = "move" }}
                      onDragEnd={() => setDraggingId("")}
                      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move" }}
                      onDrop={(event) => { event.preventDefault(); movePhotoTo(draggingId, photo.clientId); setDraggingId("") }}
                      onClick={() => { setActivePhotoId(photo.clientId); setError(""); setMessage("") }}
                      key={photo.clientId}
                    >
                      <span className="admin-album-thumb">{canPreview(photo.src) ? <ResilientImage src={photo.src} alt="" loading="lazy" decoding="async" /> : <ImageOff aria-hidden="true" />}</span>
                      <span className="admin-album-list-copy"><strong>{photo.caption || photo.alt || "未命名图片"}</strong><small>{photo.width} × {photo.height} · {sourceLabel(photo.src)}</small></span>
                      <b><GripVertical aria-hidden="true" />{String(index + 1).padStart(2, "0")}</b>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="admin-album-list-empty"><Images aria-hidden="true" /><span>这个子相册还是空的</span><button type="button" onClick={addPhoto}>添加第一张图片</button></div>
              )}
            </aside>

            {activePhoto ? (
              <div className="admin-album-detail">
                <div className="admin-album-detail-grid">
                  <section className="admin-album-preview-panel" aria-label="图片预览">
                    <div className="admin-album-preview-frame">
                      {canPreview(activePhoto.src) ? <ResilientImage key={`${activePhoto.clientId}-${activePhoto.src}`} src={activePhoto.src} alt={activePhoto.alt || "相册图片预览"} decoding="async" /> : <div className="admin-album-preview-empty"><ImageOff aria-hidden="true" /><span>填写图片地址后显示预览</span></div>}
                      <span>{String(activePhotoIndex + 1).padStart(2, "0")}</span>
                    </div>
                    <dl>
                      <div><dt>子相册</dt><dd>{activeAlbum?.title}</dd></div>
                      <div><dt>类型</dt><dd>{orientation}</dd></div>
                      <div><dt>尺寸</dt><dd>{activePhoto.width} × {activePhoto.height}</dd></div>
                      <div><dt>来源</dt><dd>{sourceLabel(activePhoto.src)}</dd></div>
                      <div><dt>拍摄时间</dt><dd>{activePhoto.takenAt ? activePhoto.takenAt.replace("T", " ") : "未读取"}</dd></div>
                      <div><dt>原始文件</dt><dd title={activePhoto.originalName}>{activePhoto.originalName || "未知"}</dd></div>
                    </dl>
                  </section>

                  <div className="admin-album-fields">
                    <div className="admin-field"><label htmlFor="album-photo-src">图片地址 *</label><input id="album-photo-src" value={activePhoto.src} onChange={(event) => updatePhoto("src", event.target.value)} placeholder="/blog-media/gallery/example.webp 或 https://..." spellCheck={false} autoComplete="off" /><small>支持站内绝对路径或 HTTPS 外链，不会裁切原图。</small></div>
                    <div className="admin-field-grid">
                      <div className="admin-field"><label htmlFor="album-photo-caption">图片图注</label><input id="album-photo-caption" value={activePhoto.caption} onChange={(event) => updatePhoto("caption", event.target.value)} maxLength={100} placeholder="显示在图片下方" /></div>
                      <div className="admin-field"><label htmlFor="album-photo-alt">替代文字 *</label><input id="album-photo-alt" value={activePhoto.alt} onChange={(event) => updatePhoto("alt", event.target.value)} maxLength={160} placeholder="描述图片内容" /></div>
                    </div>
                    <div className="admin-album-dimensions">
                      <div className="admin-field"><label htmlFor="album-photo-width">原图宽度 *</label><input id="album-photo-width" type="number" inputMode="numeric" min={1} max={20000} value={activePhoto.width} onChange={(event) => updatePhoto("width", Number(event.target.value))} /></div>
                      <div className="admin-field"><label htmlFor="album-photo-height">原图高度 *</label><input id="album-photo-height" type="number" inputMode="numeric" min={1} max={20000} value={activePhoto.height} onChange={(event) => updatePhoto("height", Number(event.target.value))} /></div>
                      <button type="button" onClick={() => void detectDimensions()} disabled={detecting || !canPreview(activePhoto.src)}>{detecting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Ruler aria-hidden="true" />}{detecting ? "读取中" : "自动读取尺寸"}</button>
                    </div>
                    <div className="admin-field-grid">
                      <div className="admin-field"><label htmlFor="album-photo-taken-at">拍摄时间（EXIF）</label><input id="album-photo-taken-at" type="datetime-local" value={activePhoto.takenAt} onChange={(event) => updatePhoto("takenAt", event.target.value)} /></div>
                      <div className="admin-field"><label htmlFor="album-photo-original-name">原始文件名</label><input id="album-photo-original-name" value={activePhoto.originalName} onChange={(event) => updatePhoto("originalName", event.target.value)} maxLength={240} /></div>
                    </div>
                    <div className="admin-album-actions">
                      <div><button type="button" onClick={() => movePhoto(-1)} disabled={activePhotoIndex === 0}><ArrowUp aria-hidden="true" />前移</button><button type="button" onClick={() => movePhoto(1)} disabled={activePhotoIndex === photos.length - 1}><ArrowDown aria-hidden="true" />后移</button></div>
                      <button className="danger" type="button" onClick={removePhoto}><Trash2 aria-hidden="true" />删除图片</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-album-detail-empty"><Images aria-hidden="true" /><h3>这个子相册还没有图片</h3><p>添加图片后，可以设置图注、替代文字、尺寸和展示顺序。</p><button type="button" onClick={addPhoto}><ImagePlus aria-hidden="true" />添加图片</button></div>
            )}
          </div>
        </>
      ) : (
        <div className="admin-album-no-collections"><FolderOpen aria-hidden="true" /><h3>还没有子相册</h3><p>先创建一个子相册，再向其中上传或添加图片。</p><button type="button" onClick={addAlbum}><FolderPlus aria-hidden="true" />创建第一个相册</button></div>
      )}

      <footer className="admin-album-footer">
        <p className={error ? "is-error" : message ? "is-success" : ""} role="status">{error || message || (dirty ? "有尚未保存的子相册修改" : `共 ${albums.length} 个子相册、${albums.reduce((total, album) => total + album.photos.length, 0)} 张图片`)}</p>
        <ShimmerButton type="button" onClick={() => void save()} disabled={saving || !dirty}>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "保存中" : "保存全部相册"}</ShimmerButton>
      </footer>
    </section>
  )
}
