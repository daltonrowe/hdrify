#!/usr/bin/env node
/**
 * Encode every image in in/ twice, with the native ultrahdr_app (lib/core.js)
 * and with the wasm build (web/build/wasm/uhdr.mjs), from identical pixels,
 * and compare the outputs. Run after web/scripts/build-wasm.sh.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { buildHdr, encode, targetPeakNits } from '../../lib/core.js'
import createUhdr from '../build/wasm/uhdr.mjs'

process.chdir(join(import.meta.dirname, '../..'))
const M = await createUhdr()
const tmp = mkdtempSync(join(tmpdir(), 'uhdr-verify-'))
const opts = { boost: 4, threshold: 0.6, quality: 95 }

const magick = args => execFileSync('magick', args, { maxBuffer: 1 << 30 })

function load(src) {
  let [w, h] = magick([src, '-format', '%w %h', 'info:']).toString().split(' ').map(Number)
  w -= w % 2
  h -= h % 2
  const rgba = magick([src, '-colorspace', 'sRGB', '-crop', `${w}x${h}+0+0`, '+repage', '-alpha', 'off', '-alpha', 'opaque', '-depth', '8', 'rgba:-'])
  const maskPath = src.replace(/\.[^.]+$/, '.mask.png')
  const mask = existsSync(maskPath)
    ? magick([maskPath, '-alpha', 'remove', '-colorspace', 'Gray', '-resize', `${w}x${h}!`, '-depth', '8', 'gray:-'])
    : undefined
  return { rgba, w, h, mask }
}

function wasmEncode({ rgba, w, h, mask }) {
  const { hdr } = buildHdr(rgba, { mask, ...opts })
  const hp = M._malloc(hdr.byteLength), sp = M._malloc(rgba.byteLength)
  M.HEAPU8.set(new Uint8Array(hdr.buffer), hp)
  M.HEAPU8.set(rgba, sp)
  const t0 = performance.now()
  const n = M._uhdrw_encode(hp, sp, w, h, opts.quality, targetPeakNits(opts.boost))
  const ms = performance.now() - t0
  M._free(hp)
  M._free(sp)
  if (n <= 0) throw new Error(M.UTF8ToString(M._uhdrw_error()))
  const bytes = Buffer.from(M.HEAPU8.slice(M._uhdrw_output(), M._uhdrw_output() + n))
  M._uhdrw_release()
  return { bytes, ms }
}

// decode to linear half-float HDR and compare renditions pixel by pixel
function decodeHdr(file) {
  const raw = join(tmp, basename(file) + '.raw')
  const cfg = join(tmp, basename(file) + '.cfg')
  execFileSync('ultrahdr_app', ['-m', '1', '-j', file, '-o', '0', '-O', '4', '-z', raw, '-f', cfg])
  return { px: new Uint16Array(readFileSync(raw).buffer.slice(0)), meta: readFileSync(cfg, 'utf8') }
}
const half = b => { const e = (b >> 10) & 31, f = b & 1023; return e ? 2 ** (e - 15) * (1 + f / 1024) : 2 ** -14 * (f / 1024) }

let ok = true
for (const f of readdirSync('in').filter(f => /\.(jpe?g|png)$/i.test(f) && !/\.mask\./i.test(f)).sort()) {
  const src = join('in', f)
  const img = load(src)
  const nativeFile = join(tmp, `${basename(f, extname(f))}.native.jpg`)
  const t0 = performance.now()
  await encode({ ...img, ...opts, dst: nativeFile })
  const nativeMs = performance.now() - t0
  const native = readFileSync(nativeFile)
  const wasm = wasmEncode(img)
  const wasmFile = nativeFile.replace('.native.', '.wasm.')
  writeFileSync(wasmFile, wasm.bytes)

  const identical = native.equals(wasm.bytes)
  const a = decodeHdr(nativeFile), b = decodeHdr(wasmFile)
  const sameMeta = a.meta === b.meta
  // SDR base: PSNR of the two base JPEGs (compare exits 1 when images differ at all).
  // HDR: PSNR of the decoded linear renditions relative to the image's peak.
  const sdrPsnr = parseFloat(spawnSync('magick', ['compare', '-metric', 'PSNR', nativeFile, wasmFile, 'null:']).stderr)
  let se = 0, peak = 0
  for (let i = 0; i < a.px.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const x = half(a.px[i + c]), y = half(b.px[i + c])
      se += (x - y) ** 2
      peak = Math.max(peak, x)
    }
  }
  const hdrPsnr = 10 * Math.log10(peak ** 2 / (se / (a.px.length / 4 * 3)))
  ok &&= identical || (sameMeta && sdrPsnr > 45 && hdrPsnr > 45)
  console.log(`${f.padEnd(20)} ${img.w}x${img.h}${img.mask ? ' +mask' : '      '} native ${nativeMs.toFixed(0).padStart(3)} ms | wasm ${wasm.ms.toFixed(0).padStart(3)} ms (encode) | ${identical ? 'byte-identical' : `metadata ${sameMeta ? 'identical' : 'DIFFERENT'}, SDR PSNR ${sdrPsnr.toFixed(1)} dB, HDR PSNR ${hdrPsnr.toFixed(1)} dB`}`)
}
process.exit(ok ? 0 : 1)
