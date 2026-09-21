/**
 * Renderer: decodes the image, hosts the mask brush, and shows the encoded
 * Ultra HDR preview. Encoding itself happens in the main process.
 *
 * Canvases (all at image resolution, stacked in #stage):
 *   #source  decoded SDR pixels (also the RGBA sent to the encoder)
 *   #mask    grayscale brightening map: white = full boost, black = none
 *   #stroke  coverage of the stroke in progress; merged into #mask on release
 */

const $ = s => document.querySelector(s)
const api = window.uhdr

const viewport = $('#viewport')
const stage = $('#stage')
const source = $('#source')
const maskCv = $('#mask')
const strokeCv = $('#stroke')
const previewHdr = $('#preview-hdr')
const previewSdr = $('#preview-sdr')
const divider = $('#divider')
const cursor = $('#cursor')

const srcCtx = source.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })
const maskCtx = maskCv.getContext('2d', { willReadFrequently: true })
const strokeCtx = strokeCv.getContext('2d', { willReadFrequently: true })

const S = {
  name: null,
  w: 0,
  h: 0,
  rgba: null,
  mode: 'auto',
  tool: 'paint',
  view: 'hdr',
  split: 0.5,
  z: 1,
  tx: 0,
  ty: 0,
  dirty: false,
  rendering: false,
  rendered: false,
}

/* ---------------- controls ---------------- */

const controls = {
  boost: v => `${(+v).toFixed(1)}× · +${Math.log2(v).toFixed(1)} stops`,
  threshold: v => `${Math.round(v * 100)}%`,
  size: v => `${v} px`,
  softness: v => `${Math.round(v * 100)}%`,
  strength: v => `${Math.round(v * 100)}%`,
  'overlay-opacity': v => `${Math.round(v * 100)}%`,
  quality: v => `${v}`,
}
const val = id => +$(`#${id}`).value

for (const [id, fmt] of Object.entries(controls)) {
  const input = $(`#${id}`)
  const out = $(`#${id}-out`)
  const sync = () => (out.textContent = fmt(input.value))
  input.addEventListener('input', () => {
    sync()
    if (['boost', 'threshold', 'quality'].includes(id)) scheduleRender(350)
    if (id === 'overlay-opacity') maskCv.style.opacity = input.value
    if (id === 'size' || id === 'softness') updateCursor()
  })
  sync()
}
maskCv.style.opacity = val('overlay-opacity')

function segmented(id, onChange) {
  const el = $(`#${id}`)
  const set = value => {
    for (const b of el.children) b.classList.toggle('on', b.dataset.value === value)
    onChange(value)
  }
  el.addEventListener('click', e => e.target.dataset.value && set(e.target.dataset.value))
  return set
}

const setMode = segmented('mode', mode => {
  S.mode = mode
  for (const el of document.querySelectorAll('[data-mode]')) el.hidden = el.dataset.mode !== mode
  maskCv.hidden = mode !== 'mask' || !$('#overlay').checked
  strokeCv.hidden = mode !== 'mask'
  viewport.classList.toggle('can-pan', mode !== 'mask')
  updateCursor()
  scheduleRender(0)
})

const setTool = segmented('tool', tool => {
  S.tool = tool
  updateCursor()
})

const setView = segmented('view', view => {
  S.view = view
  applyView()
})

$('#overlay').addEventListener('change', e => (maskCv.hidden = S.mode !== 'mask' || !e.target.checked))

/* ---------------- loading ---------------- */

async function openImage(path) {
  try {
    const res = await api.openImage(path)
    if (res) await loadImage(res)
  } catch (e) {
    showError(e)
  }
}

async function loadImage({ name, bytes, maskBytes }) {
  const bmp = await createImageBitmap(new Blob([bytes]), { imageOrientation: 'from-image' })
  // the encoder needs even dimensions; drop the last row/column if odd
  const w = bmp.width - (bmp.width % 2)
  const h = bmp.height - (bmp.height % 2)

  for (const cv of [source, maskCv, strokeCv]) {
    cv.width = w
    cv.height = h
  }
  srcCtx.drawImage(bmp, 0, 0)
  bmp.close()
  S.rgba = srcCtx.getImageData(0, 0, w, h, { colorSpace: 'srgb' }).data
  Object.assign(S, { name, w, h, rendered: false })

  maskCtx.fillStyle = '#000'
  maskCtx.fillRect(0, 0, w, h)
  strokeCtx.fillStyle = '#000'
  strokeCtx.fillRect(0, 0, w, h)
  history.undo.length = history.redo.length = 0

  stage.style.width = `${w}px`
  stage.style.height = `${h}px`
  stage.hidden = false
  $('#empty').hidden = true
  previewHdr.hidden = previewSdr.hidden = true
  $('#file-name').textContent = name
  $('#export').disabled = true
  $('#info').textContent = `${w}×${h}`
  document.title = `${name} — UHDR`

  fit()
  if (maskBytes) {
    await loadMaskBytes(maskBytes, false)
    setMode('mask')
  } else {
    scheduleRender(0)
  }
}

/** Draw any image stretched to the mask, flattened to grayscale. */
async function loadMaskBytes(bytes, undoable = true) {
  if (!S.rgba) return
  const bmp = await createImageBitmap(new Blob([bytes]))
  maskOp(() => {
    maskCtx.fillStyle = '#000'
    maskCtx.fillRect(0, 0, S.w, S.h)
    maskCtx.drawImage(bmp, 0, 0, S.w, S.h)
    mapMask((r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b)
  }, undoable)
  bmp.close()
}

/* ---------------- mask ops + history ---------------- */

const history = { undo: [], redo: [], bytes: 0 }
const HISTORY_BUDGET = 512 * 1024 * 1024

function pushHistory(entry) {
  history.undo.push(entry)
  history.redo.length = 0
  const size = e => e.before.data.length * 2
  let total = history.undo.reduce((n, e) => n + size(e), 0)
  while (total > HISTORY_BUDGET && history.undo.length > 1) total -= size(history.undo.shift())
}

function stepHistory(from, to, key) {
  const e = from.pop()
  if (!e) return
  maskCtx.putImageData(e[key], e.x, e.y)
  to.push(e)
  maskChanged()
}
const undo = () => stepHistory(history.undo, history.redo, 'before')
const redo = () => stepHistory(history.redo, history.undo, 'after')

/** Run a whole-mask edit as one undo step. */
function maskOp(fn, undoable = true) {
  const before = undoable && maskCtx.getImageData(0, 0, S.w, S.h)
  fn()
  if (undoable) pushHistory({ x: 0, y: 0, before, after: maskCtx.getImageData(0, 0, S.w, S.h) })
  maskChanged()
}

/** Rewrite every mask pixel as gray = fn(r, g, b, i). */
function mapMask(fn) {
  const img = maskCtx.getImageData(0, 0, S.w, S.h)
  const d = img.data
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    d[i] = d[i + 1] = d[i + 2] = fn(d[i], d[i + 1], d[i + 2], p)
    d[i + 3] = 255
  }
  maskCtx.putImageData(img, 0, 0)
}

function maskChanged() {
  if (S.mode === 'mask') scheduleRender(150)
}

const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1)
  return t * t * (3 - 2 * t)
}

const maskActions = {
  // same curve lib/core.js uses in auto mode, as a starting point to paint over
  seed: () => {
    const t = val('threshold')
    const px = S.rgba
    maskOp(() => mapMask((_, __, ___, p) => {
      const y = (0.2126 * px[p * 4] + 0.7152 * px[p * 4 + 1] + 0.0722 * px[p * 4 + 2]) / 255
      return 255 * smoothstep(t, 1, y) ** 2
    }))
  },
  invert: () => maskOp(() => mapMask(v => 255 - v)),
  fill: () => maskOp(() => { maskCtx.fillStyle = '#fff'; maskCtx.fillRect(0, 0, S.w, S.h) }),
  clear: () => maskOp(() => { maskCtx.fillStyle = '#000'; maskCtx.fillRect(0, 0, S.w, S.h) }),
}
for (const [id, fn] of Object.entries(maskActions)) $(`#${id}`).addEventListener('click', () => S.rgba && fn())

async function loadMaskDialog() {
  if (!S.rgba) return
  const res = await api.openMask()
  if (!res) return
  await loadMaskBytes(res.bytes)
  setMode('mask')
}

async function saveMask() {
  if (!S.rgba) return
  const blob = await new Promise(r => maskCv.toBlob(r, 'image/png'))
  await api.saveMask(new Uint8Array(await blob.arrayBuffer()), S.name)
}

$('#load-mask').addEventListener('click', loadMaskDialog)
$('#save-mask').addEventListener('click', saveMask)

/* ---------------- brush ---------------- */

let stroke = null

function brushRadius() {
  return val('size') / 2
}

/**
 * Stamp an opaque white->black radial gradient with `lighten`: overlapping
 * stamps keep the max coverage instead of accumulating, so Strength acts as
 * an opacity cap for the whole stroke.
 */
function stamp(x, y) {
  const r = brushRadius()
  const inner = Math.min(r * (1 - val('softness')), r - 0.5)
  const g = strokeCtx.createRadialGradient(x, y, Math.max(inner, 0), x, y, r)
  // cosine falloff reads smoother than a linear ramp
  for (let i = 0; i <= 4; i++) {
    const v = Math.round(255 * (0.5 + 0.5 * Math.cos(Math.PI * i / 4)))
    g.addColorStop(i / 4, `rgb(${v},${v},${v})`)
  }
  strokeCtx.globalCompositeOperation = 'lighten'
  strokeCtx.fillStyle = g
  strokeCtx.beginPath()
  strokeCtx.arc(x, y, r, 0, Math.PI * 2)
  strokeCtx.fill()
  strokeCtx.globalCompositeOperation = 'source-over'

  const b = stroke.box
  b.x0 = Math.min(b.x0, x - r)
  b.y0 = Math.min(b.y0, y - r)
  b.x1 = Math.max(b.x1, x + r)
  b.y1 = Math.max(b.y1, y + r)
}

function beginStroke(p, erase) {
  stroke = { erase, strength: val('strength'), last: p, box: { x0: p.x, y0: p.y, x1: p.x, y1: p.y } }
  strokeCv.classList.toggle('erase', erase)
  strokeCv.style.opacity = stroke.strength
  stamp(p.x, p.y)
}

function extendStroke(p) {
  const { last } = stroke
  const dist = Math.hypot(p.x - last.x, p.y - last.y)
  const spacing = Math.max(1, brushRadius() * 0.12)
  if (dist < spacing) return
  const steps = Math.floor(dist / spacing)
  for (let i = 1; i <= steps; i++) {
    const t = (i * spacing) / dist
    stamp(last.x + (p.x - last.x) * t, last.y + (p.y - last.y) * t)
  }
  const t = (steps * spacing) / dist
  stroke.last = { x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t }
}

function endStroke() {
  const { box, erase, strength } = stroke
  stroke = null
  const x = Math.max(0, Math.floor(box.x0))
  const y = Math.max(0, Math.floor(box.y0))
  const w = Math.min(S.w, Math.ceil(box.x1)) - x
  const h = Math.min(S.h, Math.ceil(box.y1)) - y
  if (w <= 0 || h <= 0) return

  const before = maskCtx.getImageData(x, y, w, h)
  const cov = strokeCtx.getImageData(x, y, w, h).data
  const after = new ImageData(new Uint8ClampedArray(before.data), w, h)
  const d = after.data
  for (let i = 0; i < d.length; i += 4) {
    const c = (cov[i] / 255) * strength
    if (!c) continue
    const v = erase ? d[i] * (1 - c) : d[i] + (255 - d[i]) * c
    d[i] = d[i + 1] = d[i + 2] = v
  }
  maskCtx.putImageData(after, x, y)
  strokeCtx.fillStyle = '#000'
  strokeCtx.fillRect(x, y, w, h)
  pushHistory({ x, y, before, after })
  maskChanged()
}

/* ---------------- view: zoom, pan, split ---------------- */

function applyTransform() {
  stage.style.transform = `translate(${S.tx}px, ${S.ty}px) scale(${S.z})`
  stage.classList.toggle('pixelated', S.z >= 2)
  $('#zoom-out').textContent = `${Math.round(S.z * 100)}%`
  applyView()
  updateCursor()
}

function fit() {
  const pad = 32
  const { width, height } = viewport.getBoundingClientRect()
  S.z = Math.min((width - pad * 2) / S.w, (height - pad * 2) / S.h, 1)
  S.tx = (width - S.w * S.z) / 2
  S.ty = (height - S.h * S.z) / 2
  applyTransform()
}

function zoomAt(z, cx, cy) {
  z = Math.min(Math.max(z, 0.02), 32)
  S.tx = cx - ((cx - S.tx) * z) / S.z
  S.ty = cy - ((cy - S.ty) * z) / S.z
  S.z = z
  applyTransform()
}

function zoomCenter(z) {
  const { width, height } = viewport.getBoundingClientRect()
  zoomAt(z, width / 2, height / 2)
}

function applyView() {
  if (!S.rendered) return
  const split = S.view === 'split'
  previewHdr.hidden = S.view === 'sdr'
  previewSdr.hidden = S.view === 'hdr'
  divider.hidden = !split
  // SDR copy sits on top; clip it to the left of the divider in split view
  previewSdr.style.clipPath = split ? `inset(0 ${(1 - S.split) * 100}% 0 0)` : ''
  if (split) divider.style.left = `${S.tx + S.split * S.w * S.z}px`
}

$('#fit').addEventListener('click', fit)
$('#actual').addEventListener('click', () => zoomCenter(1))
new ResizeObserver(() => S.rgba && applyTransform()).observe(viewport)

viewport.addEventListener('wheel', e => {
  if (!S.rgba) return
  e.preventDefault()
  const r = viewport.getBoundingClientRect()
  if (e.ctrlKey || e.metaKey) {
    // pinch arrives as ctrl+wheel
    zoomAt(S.z * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
  } else {
    S.tx -= e.deltaX
    S.ty -= e.deltaY
    applyTransform()
  }
}, { passive: false })

divider.addEventListener('pointerdown', e => {
  e.stopPropagation()
  divider.setPointerCapture(e.pointerId)
  const move = ev => {
    const r = viewport.getBoundingClientRect()
    S.split = Math.min(Math.max((ev.clientX - r.left - S.tx) / (S.w * S.z), 0), 1)
    applyView()
  }
  divider.addEventListener('pointermove', move)
  divider.addEventListener('pointerup', () => divider.removeEventListener('pointermove', move), { once: true })
})

/* ---------------- pointer: brush or pan ---------------- */

let spaceHeld = false
let altHeld = false
let pointer = null // last pointer position in viewport coords

function toImage(e) {
  const r = viewport.getBoundingClientRect()
  return { x: (e.clientX - r.left - S.tx) / S.z, y: (e.clientY - r.top - S.ty) / S.z }
}

const brushing = () => S.mode === 'mask' && !spaceHeld

function updateCursor() {
  const show = S.rgba && brushing() && pointer && !viewport.classList.contains('panning')
  cursor.hidden = !show
  viewport.classList.toggle('brushing', !!show)
  viewport.classList.toggle('can-pan', !!S.rgba && !brushing())
  if (!show) return
  const d = brushRadius() * 2 * S.z
  cursor.style.width = cursor.style.height = `${d}px`
  cursor.style.left = `${pointer.x}px`
  cursor.style.top = `${pointer.y}px`
  cursor.style.setProperty('--inner', `${(d / 2) * val('softness')}px`)
  const erase = (S.tool === 'erase') !== altHeld
  cursor.style.borderStyle = erase ? 'dashed' : 'solid'
}

viewport.addEventListener('pointerdown', e => {
  if (!S.rgba) return
  viewport.setPointerCapture(e.pointerId)

  if (e.button === 0 && brushing()) {
    beginStroke(toImage(e), (S.tool === 'erase') !== e.altKey)
    return
  }

  // pan: space-drag, middle button, or any drag outside mask mode
  const start = { x: e.clientX, y: e.clientY, tx: S.tx, ty: S.ty }
  viewport.classList.add('panning')
  updateCursor()
  const move = ev => {
    S.tx = start.tx + ev.clientX - start.x
    S.ty = start.ty + ev.clientY - start.y
    applyTransform()
  }
  viewport.addEventListener('pointermove', move)
  viewport.addEventListener('pointerup', () => {
    viewport.removeEventListener('pointermove', move)
    viewport.classList.remove('panning')
    updateCursor()
  }, { once: true })
})

viewport.addEventListener('pointermove', e => {
  const r = viewport.getBoundingClientRect()
  pointer = { x: e.clientX - r.left, y: e.clientY - r.top }
  updateCursor()
  if (stroke) for (const ev of e.getCoalescedEvents?.() ?? [e]) extendStroke(toImage(ev))
})

viewport.addEventListener('pointerup', () => stroke && endStroke())
viewport.addEventListener('pointercancel', () => stroke && endStroke())
viewport.addEventListener('pointerleave', () => {
  pointer = null
  updateCursor()
})

/* ---------------- keyboard ---------------- */

const keys = {
  b: () => setTool('paint'),
  e: () => setTool('erase'),
  x: () => setTool(S.tool === 'paint' ? 'erase' : 'paint'),
  m: () => {
    const cb = $('#overlay')
    cb.checked = !cb.checked
    cb.dispatchEvent(new Event('change'))
  },
  h: () => setView('hdr'),
  s: () => setView('sdr'),
  '\\': () => setView('split'),
  0: fit,
  1: () => zoomCenter(1),
  '=': () => zoomCenter(S.z * 1.25),
  '+': () => zoomCenter(S.z * 1.25),
  '-': () => zoomCenter(S.z / 1.25),
  '[': () => nudge('size', 1 / 1.2),
  ']': () => nudge('size', 1.2),
  '{': () => nudge('softness', null, -0.1),
  '}': () => nudge('softness', null, 0.1),
}

function nudge(id, mul, add = 0) {
  const input = $(`#${id}`)
  input.value = mul ? Math.round(input.value * mul) || 1 : +input.value + add
  input.dispatchEvent(new Event('input'))
}

document.addEventListener('keydown', e => {
  if (e.key === 'Alt') {
    altHeld = true
    updateCursor()
  }
  if (e.metaKey || e.ctrlKey) return
  if (e.key === ' ') {
    e.preventDefault()
    spaceHeld = true
    updateCursor()
    return
  }
  const fn = keys[e.key]
  if (fn && S.rgba) {
    e.preventDefault()
    fn()
  }
})

document.addEventListener('keyup', e => {
  if (e.key === ' ') spaceHeld = false
  if (e.key === 'Alt') altHeld = false
  updateCursor()
})

/* ---------------- rendering ---------------- */

let renderTimer = null

function scheduleRender(delay = 250) {
  if (!S.rgba) return
  S.dirty = true
  clearTimeout(renderTimer)
  renderTimer = setTimeout(render, delay)
}

function readMask() {
  const d = maskCtx.getImageData(0, 0, S.w, S.h).data
  const out = new Uint8Array(S.w * S.h)
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4]
  return out
}

async function render() {
  renderTimer = null
  if (S.rendering || !S.rgba) return
  S.rendering = true
  S.dirty = false
  $('#busy').hidden = false
  const status = $('#render-status')
  try {
    const res = await api.render({
      rgba: S.rgba,
      mask: S.mode === 'mask' ? readMask() : null,
      w: S.w,
      h: S.h,
      boost: val('boost'),
      threshold: val('threshold'),
      quality: val('quality'),
    })
    const url = URL.createObjectURL(new Blob([res.bytes], { type: 'image/jpeg' }))
    await Promise.all([previewHdr, previewSdr].map(img => {
      const old = img.src
      img.src = url
      return img.decode().finally(() => old.startsWith('blob:') && URL.revokeObjectURL(old))
    }))
    S.rendered = true
    applyView()
    $('#export').disabled = false
    $('#info').textContent =
      `${S.w}×${S.h} · peak ${res.peak_gain}× · ${(res.bytes.length / 1024 / 1024).toFixed(1)} MB`
    status.textContent = `Rendered in ${res.ms} ms`
    status.classList.remove('error')
  } catch (e) {
    showError(e)
  } finally {
    S.rendering = false
    $('#busy').hidden = true
    if (S.dirty && !renderTimer) render()
  }
}

/** Wait until the preview reflects every pending change. */
async function flushRender() {
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
  while (S.dirty || S.rendering) {
    if (!S.rendering) await render()
    else await new Promise(r => setTimeout(r, 50))
  }
}

async function exportImage() {
  if (!S.rgba) return
  try {
    await flushRender()
    const res = await api.exportImage(S.name)
    if (res) $('#render-status').textContent = `Saved ${res.path.split('/').pop()}`
  } catch (e) {
    showError(e)
  }
}

function showError(e) {
  const status = $('#render-status')
  status.textContent = String(e.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
  status.classList.add('error')
}

$('#open').addEventListener('click', () => openImage())
$('#export').addEventListener('click', exportImage)

/* ---------------- drag & drop ---------------- */

viewport.addEventListener('dragover', e => {
  e.preventDefault()
  viewport.classList.add('drag-over')
})
viewport.addEventListener('dragleave', () => viewport.classList.remove('drag-over'))
viewport.addEventListener('drop', async e => {
  e.preventDefault()
  viewport.classList.remove('drag-over')
  const file = e.dataTransfer.files[0]
  if (!file) return
  if (/\.mask\.[a-z]+$/i.test(file.name) && S.rgba) {
    await loadMaskBytes(new Uint8Array(await file.arrayBuffer()))
    setMode('mask')
  } else {
    openImage(api.pathForFile(file))
  }
})
// dropping outside the viewport shouldn't navigate the window to the file
document.addEventListener('dragover', e => e.preventDefault())
document.addEventListener('drop', e => e.preventDefault())

/* ---------------- menu + display ---------------- */

api.onMenu(cmd => ({
  open: () => openImage(),
  'load-mask': loadMaskDialog,
  export: exportImage,
  'save-mask': saveMask,
  undo,
  redo,
})[cmd]?.())

api.onOpenPath(path => openImage(path))

const hdrQuery = matchMedia('(dynamic-range: high)')
const showDisplay = () => {
  $('#display-hdr').classList.toggle('on', hdrQuery.matches)
  $('#display-text').textContent = hdrQuery.matches ? 'HDR display' : 'SDR display — HDR preview unavailable'
}
hdrQuery.addEventListener('change', showDisplay)
showDisplay()
setMode('auto')

// hook for scripts/smoke.js (drives the app end-to-end)
window.__uhdr = { S, openImage, setMode, setTool, flushRender, maskPixel: (x, y) => maskCtx.getImageData(x, y, 1, 1).data[0] }
