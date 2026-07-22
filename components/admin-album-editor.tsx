"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImageOff,
  ImagePlus,
  Images,
  LoaderCircle,
  RefreshCw,
  Ruler,
  Save,
  Trash2,
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

export function AdminAlbumEditor() {
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
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
          photos: photos.map(({ src, alt, caption, width, height }) => ({
            src,
            alt,
            caption,
            width,
            height,
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
                  <b>{String(index + 1).padStart(2, "0")}</b>
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
