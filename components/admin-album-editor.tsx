"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImageOff,
  ImagePlus,
  Images,
  GripVertical,
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
import type { AlbumPhoto, AlbumPhotoInput } from "@/lib/album-repository"

type PhotoDraft = AlbumPhotoInput & {
  clientId: string
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

async function fetchAlbumPhotos(): Promise<AlbumPhoto[]> {
  const data = await readJson<{ photos: AlbumPhoto[] }>(
    await fetch("/api/admin/album", { cache: "no-store" }),
  )
  return data.photos
}

function toDraft(photo: AlbumPhoto): PhotoDraft {
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

export function AdminAlbumEditor() {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draggingId, setDraggingId] = useState("")
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const activeIndex = photos.findIndex((photo) => photo.clientId === activeId)
  const active = activeIndex >= 0 ? photos[activeIndex] : null

  const orientation = useMemo(() => {
    if (!active) return ""
    if (active.width === active.height) return "方形"
    return active.width > active.height ? "横图" : "竖图"
  }, [active])

  async function load(options?: { confirmDiscard?: boolean }) {
    if (options?.confirmDiscard && dirty && !window.confirm("放弃尚未保存的相册修改吗？")) return
    setLoading(true)
    setError("")
    setMessage("")
    try {
      const next = (await fetchAlbumPhotos()).map(toDraft)
      setPhotos(next)
      setActiveId((current) => next.some((photo) => photo.clientId === current)
        ? current
        : next[0]?.clientId || "")
      setDirty(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "相册读取失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitialPhotos() {
      try {
        const next = (await fetchAlbumPhotos()).map(toDraft)
        if (cancelled) return
        setPhotos(next)
        setActiveId(next[0]?.clientId || "")
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "相册读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialPhotos()
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

  function update<K extends keyof AlbumPhotoInput>(key: K, value: AlbumPhotoInput[K]) {
    if (!active) return
    setPhotos((current) => current.map((photo) => (
      photo.clientId === active.clientId ? { ...photo, [key]: value } : photo
    )))
    markChanged()
  }

  function addPhoto() {
    const photo: PhotoDraft = {
      clientId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: "",
      alt: "流萤插画",
      caption: "可爱流萤",
      width: 1600,
      height: 1200,
      takenAt: "",
      originalName: "",
    }
    setPhotos((current) => [...current, photo])
    setActiveId(photo.clientId)
    markChanged()
  }

  function removePhoto() {
    if (!active || !window.confirm(`确定删除第 ${activeIndex + 1} 张图片吗？保存后前台会立即移除。`)) return
    const next = photos.filter((photo) => photo.clientId !== active.clientId)
    setPhotos(next)
    setActiveId(next[Math.min(activeIndex, next.length - 1)]?.clientId || "")
    markChanged()
  }

  function movePhoto(offset: -1 | 1) {
    if (!active) return
    const target = activeIndex + offset
    if (target < 0 || target >= photos.length) return
    setPhotos((current) => {
      const next = [...current]
      ;[next[activeIndex], next[target]] = [next[target], next[activeIndex]]
      return next
    })
    markChanged()
  }

  function movePhotoTo(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return
    setPhotos((current) => {
      const sourceIndex = current.findIndex((photo) => photo.clientId === sourceId)
      const targetIndex = current.findIndex((photo) => photo.clientId === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setActiveId(sourceId)
    markChanged()
  }

  async function uploadPhoto(file: File) {
    if (uploading) return
    setUploading(true)
    setError("")
    setMessage("")
    const objectUrl = URL.createObjectURL(file)
    try {
      const [dimensions, takenAt] = await Promise.all([new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new window.Image()
        image.onload = () => image.naturalWidth && image.naturalHeight
          ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
          : reject(new Error("无法读取图片尺寸"))
        image.onerror = () => reject(new Error("无法读取这个图片文件"))
        image.src = objectUrl
      }), readExifTakenAt(file)])
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
      setPhotos((current) => [...current, photo])
      setActiveId(photo.clientId)
      markChanged()
      setMessage(`图片已上传并读取尺寸：${dimensions.width} × ${dimensions.height}，请保存相册列表`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片上传失败")
    } finally {
      URL.revokeObjectURL(objectUrl)
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }

  async function detectDimensions() {
    if (!active || !canPreview(active.src) || detecting) {
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
        image.src = active.src
      })
      setPhotos((current) => current.map((photo) => photo.clientId === active.clientId
        ? { ...photo, ...dimensions }
        : photo))
      markChanged()
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
      const data = await readJson<{ photos: AlbumPhoto[] }>(await fetch("/api/admin/album", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photos: photos.map(({ src, alt, caption, width, height, takenAt, originalName }) => ({
            src,
            alt,
            caption,
            width,
            height,
            takenAt,
            originalName,
          })),
        }),
      }))
      const next = data.photos.map(toDraft)
      const selectedIndex = Math.max(0, activeIndex)
      setPhotos(next)
      setActiveId(next[Math.min(selectedIndex, next.length - 1)]?.clientId || "")
      setDirty(false)
      setMessage("相册已保存，前台图片和顺序立即生效")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "相册保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-album-loading">
        <LoaderCircle className="spin" aria-hidden="true" />正在读取相册图片
      </div>
    )
  }

  return (
    <section className="admin-album-manager magic-surface" aria-labelledby="admin-album-title">
      <BorderBeam size={150} duration={12} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
      <header className="admin-album-heading">
        <div>
          <p className="section-kicker">ALBUM / GALLERY</p>
          <h2 id="admin-album-title">相册图片</h2>
          <p>添加图片地址、修改图注与替代文字，并调整前台瀑布流顺序。</p>
        </div>
        <div>
          <a href="/mine/album" target="_blank" rel="noreferrer">
            查看相册<ExternalLink aria-hidden="true" />
          </a>
          <button type="button" onClick={addPhoto}>
            <ImagePlus aria-hidden="true" />添加图片
          </button>
          <label className="admin-album-upload">
            {uploading ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {uploading ? "上传中" : "上传本地图片"}
            <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={uploading} onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadPhoto(file)
            }} />
          </label>
        </div>
      </header>

      <div className="admin-album-workspace">
        <aside className="admin-album-sidebar">
          <header>
            <div><span>图片列表</span><strong>{photos.length} 张</strong></div>
            <button
              type="button"
              onClick={() => void load({ confirmDiscard: true })}
              aria-label="重新读取相册"
            >
              <RefreshCw aria-hidden="true" />
            </button>
          </header>
          {photos.length ? (
            <div className="admin-album-list">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  className={photo.clientId === activeId ? "is-active" : ""}
                  draggable
                  aria-grabbed={draggingId === photo.clientId}
                  onDragStart={(event) => { setDraggingId(photo.clientId); event.dataTransfer.effectAllowed = "move" }}
                  onDragEnd={() => setDraggingId("")}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move" }}
                  onDrop={(event) => { event.preventDefault(); movePhotoTo(draggingId, photo.clientId); setDraggingId("") }}
                  onClick={() => { setActiveId(photo.clientId); setError(""); setMessage("") }}
                  key={photo.clientId}
                >
                  <span className="admin-album-thumb">
                    {canPreview(photo.src) ? (
                      <ResilientImage src={photo.src} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <ImageOff aria-hidden="true" />
                    )}
                  </span>
                  <span className="admin-album-list-copy">
                    <strong>{photo.caption || photo.alt || "未命名图片"}</strong>
                    <small>{photo.width} × {photo.height} · {sourceLabel(photo.src)}</small>
                  </span>
                  <b><GripVertical aria-hidden="true" />{String(index + 1).padStart(2, "0")}</b>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-album-list-empty">
              <Images aria-hidden="true" />
              <span>相册还是空的</span>
              <button type="button" onClick={addPhoto}>添加第一张图片</button>
            </div>
          )}
        </aside>

        {active ? (
          <div className="admin-album-detail">
            <div className="admin-album-detail-grid">
              <section className="admin-album-preview-panel" aria-label="图片预览">
                <div className="admin-album-preview-frame">
                  {canPreview(active.src) ? (
                    <ResilientImage
                      key={`${active.clientId}-${active.src}`}
                      src={active.src}
                      alt={active.alt || "相册图片预览"}
                      decoding="async"
                    />
                  ) : (
                    <div className="admin-album-preview-empty">
                      <ImageOff aria-hidden="true" />
                      <span>填写图片地址后显示预览</span>
                    </div>
                  )}
                  <span>{String(activeIndex + 1).padStart(2, "0")}</span>
                </div>
                <dl>
                  <div><dt>类型</dt><dd>{orientation}</dd></div>
                  <div><dt>尺寸</dt><dd>{active.width} × {active.height}</dd></div>
                  <div><dt>来源</dt><dd>{sourceLabel(active.src)}</dd></div>
                  <div><dt>拍摄时间</dt><dd>{active.takenAt ? active.takenAt.replace("T", " ") : "未读取"}</dd></div>
                  <div><dt>原始文件</dt><dd title={active.originalName}>{active.originalName || "未知"}</dd></div>
                </dl>
              </section>

              <div className="admin-album-fields">
                <div className="admin-field">
                  <label htmlFor="album-photo-src">图片地址 *</label>
                  <input
                    id="album-photo-src"
                    value={active.src}
                    onChange={(event) => update("src", event.target.value)}
                    placeholder="/blog-media/gallery/example.webp 或 https://..."
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <small>支持站内绝对路径或 HTTPS 外链，不会裁切原图。</small>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <label htmlFor="album-photo-caption">图片图注</label>
                    <input
                      id="album-photo-caption"
                      value={active.caption}
                      onChange={(event) => update("caption", event.target.value)}
                      maxLength={100}
                      placeholder="显示在图片下方"
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="album-photo-alt">替代文字 *</label>
                    <input
                      id="album-photo-alt"
                      value={active.alt}
                      onChange={(event) => update("alt", event.target.value)}
                      maxLength={160}
                      placeholder="描述图片内容"
                    />
                  </div>
                </div>

                <div className="admin-album-dimensions">
                  <div className="admin-field">
                    <label htmlFor="album-photo-width">原图宽度 *</label>
                    <input
                      id="album-photo-width"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20000}
                      value={active.width}
                      onChange={(event) => update("width", Number(event.target.value))}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="album-photo-height">原图高度 *</label>
                    <input
                      id="album-photo-height"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20000}
                      value={active.height}
                      onChange={(event) => update("height", Number(event.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void detectDimensions()}
                    disabled={detecting || !canPreview(active.src)}
                  >
                    {detecting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Ruler aria-hidden="true" />}
                    {detecting ? "读取中" : "自动读取尺寸"}
                  </button>
                </div>

                <div className="admin-field-grid">
                  <div className="admin-field">
                    <label htmlFor="album-photo-taken-at">拍摄时间（EXIF）</label>
                    <input id="album-photo-taken-at" type="datetime-local" value={active.takenAt} onChange={(event) => update("takenAt", event.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="album-photo-original-name">原始文件名</label>
                    <input id="album-photo-original-name" value={active.originalName} onChange={(event) => update("originalName", event.target.value)} maxLength={240} />
                  </div>
                </div>

                <div className="admin-album-actions">
                  <div>
                    <button type="button" onClick={() => movePhoto(-1)} disabled={activeIndex === 0}>
                      <ArrowUp aria-hidden="true" />前移
                    </button>
                    <button type="button" onClick={() => movePhoto(1)} disabled={activeIndex === photos.length - 1}>
                      <ArrowDown aria-hidden="true" />后移
                    </button>
                  </div>
                  <button className="danger" type="button" onClick={removePhoto}>
                    <Trash2 aria-hidden="true" />删除图片
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-album-detail-empty">
            <Images aria-hidden="true" />
            <h3>还没有相册图片</h3>
            <p>添加图片后，可以在这里设置图注、替代文字、尺寸和展示顺序。</p>
            <button type="button" onClick={addPhoto}><ImagePlus aria-hidden="true" />添加图片</button>
          </div>
        )}
      </div>

      <footer className="admin-album-footer">
        <p className={error ? "is-error" : message ? "is-success" : ""} role="status">
          {error || message || (dirty ? "有尚未保存的相册修改" : "图片尺寸用于保留原始比例，建议使用自动读取。")}
        </p>
        <ShimmerButton type="button" onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
          {saving ? "保存中" : "保存相册"}
        </ShimmerButton>
      </footer>
    </section>
  )
}
