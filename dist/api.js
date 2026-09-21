/**
 * Browser implementation of the `window.uhdr` bridge that app/renderer/app.js
 * talks to. In Electron that bridge is app/preload.cjs (IPC to the main
 * process); here files come from pickers / drag & drop, encoding happens in a
 * wasm worker, and saving uses the File System Access API with a download
 * fallback. Nothing leaves the browser.
 */

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
const pending = new Map()
let seq = 0
let lastRender = null

worker.onmessage = ({ data: { id, result, error } }) => {
  const p = pending.get(id)
  pending.delete(id)
  if (error) p?.reject(new Error(error))
  else p?.resolve(result)
}
worker.onerror = e => {
  const err = new Error(`encoder failed to load: ${e.message || 'see console'}`)
  for (const p of pending.values()) p.reject(err)
  pending.clear()
}

const encode = job => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  worker.postMessage({ id, job })
})

const stem = name => name.replace(/\.[^.]+$/, '')

function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

function download(bytes, name, type) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000)
  return { path: name, size: bytes.length }
}

async function save(bytes, name, type, description) {
  if (!window.showSaveFilePicker) return download(bytes, name, type)
  try {
    const ext = name.slice(name.lastIndexOf('.'))
    const handle = await showSaveFilePicker({ suggestedName: name, types: [{ description, accept: { [type]: [ext] } }] })
    const out = await handle.createWritable()
    await out.write(bytes)
    await out.close()
    return { path: handle.name, size: bytes.length }
  } catch (e) {
    if (e.name === 'AbortError') return null
    // the picker needs a recent user gesture; a slow final render can outlast it
    if (e.name === 'SecurityError' || e.name === 'NotAllowedError') return download(bytes, name, type)
    throw e
  }
}

// app menu accelerators (Electron) -> plain keyboard shortcuts here
function shortcut(e) {
  if (!(e.metaKey || e.ctrlKey)) return null
  switch (e.key.toLowerCase()) {
    case 'o': return e.shiftKey ? 'load-mask' : 'open'
    case 'e': return 'export'
    case 's': return e.shiftKey ? 'save-mask' : null
    case 'z': return e.shiftKey ? 'redo' : 'undo'
    default: return null
  }
}

window.uhdr = {
  // `file` is a File from drag & drop (see pathForFile) or undefined -> picker
  async openImage(file) {
    file ??= await pickFile('image/*,.heic,.heif')
    if (!file) return null
    return { name: stem(file.name), bytes: new Uint8Array(await file.arrayBuffer()), maskBytes: null }
  },

  async openMask() {
    const file = await pickFile('image/png,image/jpeg,image/webp')
    return file && { bytes: new Uint8Array(await file.arrayBuffer()) }
  },

  async render(job) {
    const result = await encode(job)
    lastRender = result.bytes
    return result
  },

  exportImage(name) {
    if (!lastRender) throw new Error('nothing rendered yet')
    return save(lastRender, `${name}-hdr.jpg`, 'image/jpeg', 'Ultra HDR JPEG')
  },

  saveMask: (bytes, name) => save(bytes, `${name}.mask.png`, 'image/png', 'PNG mask'),

  // no filesystem paths on the web: hand the File itself to openImage
  pathForFile: file => file,

  onMenu(fn) {
    document.addEventListener('keydown', e => {
      const cmd = shortcut(e)
      if (!cmd) return
      e.preventDefault()
      fn(cmd)
    })
  },

  // Finder "Open With" has no web equivalent
  onOpenPath() {},
}
