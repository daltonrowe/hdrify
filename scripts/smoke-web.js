/**
 * Browser smoke test for web/dist, using Electron's Chromium as a plain browser
 * (no preload, no Node in the page, served over http like a real site).
 * Opens an image, paints a mask stroke with real mouse events, waits for the
 * wasm encode, saves the preview JPEG + screenshot, reports console errors.
 *
 *   npx electron web/scripts/smoke-web.js <image> <outdir>
 */
import { app, BrowserWindow } from 'electron'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

const [image, outDir] = process.argv.slice(-2).map(p => resolve(p))
const dist = join(import.meta.dirname, '../dist')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' }
const wait = ms => new Promise(r => setTimeout(r, ms))

const server = createServer(async (req, res) => {
  const path = join(dist, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]))
  try {
    const body = await readFile(path)
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)

// (a top-level await on whenReady deadlocks: Electron fires ready after the ESM main finishes evaluating)
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1400, height: 900, webPreferences: { sandbox: true, contextIsolation: true } })
  const problems = []
  win.webContents.on('console-message', e => e.level === 'error' || e.level === 'warning' ? problems.push(e.message) : null)

  try {
    await win.loadURL(`http://127.0.0.1:${server.address().port}/`)
    const js = code => win.webContents.executeJavaScript(code)
    const until = async (cond, ms = 30000) => {
      for (const t0 = Date.now(); !(await js(cond)); await wait(100))
        if (Date.now() - t0 > ms) throw new Error(`timeout: ${cond}`)
    }
    await mkdir(outDir, { recursive: true })

    // hand the page a real File, as drag & drop would
    const b64 = (await readFile(image)).toString('base64')
    // (built from base64 directly: the page's CSP rightly blocks fetching data: URLs)
    await js(`__uhdr.openImage(new File([Uint8Array.from(atob('${b64}'), c => c.charCodeAt(0))], ${JSON.stringify(basename(image))}))`)
    await until('__uhdr.S.rendered && !__uhdr.S.rendering && !__uhdr.S.dirty')
    const auto = await js('document.querySelector("#render-status").textContent')

    await js('__uhdr.setMode("mask"); __uhdr.setTool("paint")')
    await until('!__uhdr.S.rendering && !__uhdr.S.dirty')
    const box = await js(`(() => { const r = document.querySelector('#viewport').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })()`)
    const y = Math.round(box.y + box.h / 2)
    const x0 = Math.round(box.x + box.w * 0.3), x1 = Math.round(box.x + box.w * 0.7)
    const send = e => win.webContents.sendInputEvent(e)
    send({ type: 'mouseMove', x: x0, y })
    send({ type: 'mouseDown', x: x0, y, button: 'left', clickCount: 1 })
    for (let x = x0; x <= x1; x += 8) {
      // (a leftButtonDown modifier gets these rejected by Chromium's input validation)
      send({ type: 'mouseMove', x, y })
      await wait(8)
    }
    send({ type: 'mouseUp', x: x1, y, button: 'left', clickCount: 1 })
    await wait(300)
    await js('__uhdr.flushRender()')

    const S = await js('({ w: __uhdr.S.w, h: __uhdr.S.h, z: __uhdr.S.z, tx: __uhdr.S.tx, ty: __uhdr.S.ty })')
    const ix = Math.round((box.w / 2 - S.tx) / S.z), iy = Math.round((box.h / 2 - S.ty) / S.z)
    const stroke = { ix, iy, inside: await js(`__uhdr.maskPixel(${ix}, ${iy})`), outside: await js('__uhdr.maskPixel(5, 5)') }
    const status = await js('document.querySelector("#render-status").textContent')
    const error = await js('document.querySelector("#render-status").classList.contains("error")')

    const jpg = await js(`fetch(document.querySelector('#preview-hdr').src).then(r => r.blob()).then(b => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result.split(',')[1]); f.readAsDataURL(b) }))`)
    await writeFile(join(outDir, 'preview.jpg'), Buffer.from(jpg, 'base64'))
    await writeFile(join(outDir, 'screenshot.png'), (await win.webContents.capturePage()).toPNG())

    console.log(JSON.stringify({ auto, status, error, size: [S.w, S.h], stroke, problems }))
    app.exit(error || problems.length ? 1 : 0)
  } catch (e) {
    console.error(e, problems)
    app.exit(1)
  }
})
