#!/usr/bin/env node
/**
 * Assemble the static site in web/dist/ from:
 *   app/renderer/*        the UI shared with the Electron app (unchanged)
 *   lib/hdr.js            the HDR-intent math shared with the CLI
 *   web/src/*             browser bridge (window.uhdr), encoder worker, web CSS
 *   web/build/wasm/*      libultrahdr compiled by web/scripts/build-wasm.sh
 * Everything is flat in dist/ so it can be hosted from any static server.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '../..')
const dist = join(root, 'web/dist')
const r = p => join(root, p)

if (!existsSync(r('web/build/wasm/uhdr.wasm'))) {
  console.error('missing web/build/wasm/uhdr.wasm: run web/scripts/build-wasm.sh first')
  process.exit(1)
}

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

const copies = {
  'app/renderer/app.js': 'app.js',
  'app/renderer/style.css': 'style.css',
  'lib/hdr.js': 'hdr.js',
  'web/src/api.js': 'api.js',
  'web/src/worker.js': 'worker.js',
  'web/src/web.css': 'web.css',
  'web/build/wasm/uhdr.mjs': 'uhdr.mjs',
  'web/build/wasm/uhdr.wasm': 'uhdr.wasm',
}
for (const [from, to] of Object.entries(copies)) copyFileSync(r(from), join(dist, to))

// Same page as the Electron renderer, with the web bridge + tweaks swapped in.
let html = readFileSync(r('app/renderer/index.html'), 'utf8')
const edits = [
  // wasm instantiation needs 'wasm-unsafe-eval'; the encoder runs in a same-origin worker
  [/content="default-src 'self';/, `content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';`],
  ['<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="web.css">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="description" content="Add HDR to photos as Ultra HDR JPEGs, right in your browser.">'],
  // module scripts run in document order, so window.uhdr exists before app.js reads it
  ['<script type="module" src="app.js"></script>', '<script type="module" src="api.js"></script>\n  <script type="module" src="app.js"></script>'],
  // browsers decode fewer formats than macOS (HEIC is Safari-only, no TIFF)
  ['<span>jpg · png · heic · tiff · webp — or ⌘O</span>', '<span>jpg · png · webp · avif — or ⌘O</span>'],
  ['<footer id="status">', '<footer id="status">\n      <div class="local-note">Runs in your browser: images never leave your device.</div>'],
]
for (const [from, to] of edits) {
  const next = html.replace(from, to)
  if (next === html) throw new Error(`index.html edit no longer applies: ${from}`)
  html = next
}
writeFileSync(join(dist, 'index.html'), html)

console.log(`built ${dist}`)
