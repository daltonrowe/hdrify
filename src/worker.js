/**
 * Encoder worker: builds the HDR intent (lib/hdr.js, shared with the CLI and
 * Electron app) and encodes with libultrahdr compiled to wasm
 * (web/wasm/uhdr_wasm.c). Runs off the main thread so painting stays smooth.
 *
 * in:  { id, job: { rgba, mask, w, h, boost, threshold, quality } }
 * out: { id, result: { bytes, size, peak_gain, ms } } | { id, error }
 */

import createUhdr from './uhdr.mjs'
import { buildHdr, targetPeakNits } from './hdr.js'

const ready = createUhdr()

async function encode({ rgba, mask, w, h, boost, threshold, quality }) {
  if (w % 2 || h % 2) throw new Error(`dimensions must be even, got ${w}x${h}`)
  const M = await ready
  const t0 = performance.now()
  const { hdr, peak } = buildHdr(rgba, { mask, boost, threshold })

  const hdrPtr = M._malloc(hdr.byteLength)
  const sdrPtr = M._malloc(rgba.byteLength)
  try {
    if (!hdrPtr || !sdrPtr) throw new Error(`out of memory for a ${w}x${h} image`)
    // read HEAPU8 only after the mallocs: memory growth replaces the view
    M.HEAPU8.set(new Uint8Array(hdr.buffer), hdrPtr)
    M.HEAPU8.set(rgba, sdrPtr)
    const n = M._uhdrw_encode(hdrPtr, sdrPtr, w, h, quality, targetPeakNits(boost))
    if (n <= 0) throw new Error(`libultrahdr: ${M.UTF8ToString(M._uhdrw_error())}`)
    const out = M._uhdrw_output()
    const bytes = M.HEAPU8.slice(out, out + n)
    M._uhdrw_release()
    return { bytes, size: [w, h], peak_gain: Math.round(peak * 100) / 100, ms: Math.round(performance.now() - t0) }
  } finally {
    M._free(hdrPtr)
    M._free(sdrPtr)
  }
}

self.onmessage = async ({ data: { id, job } }) => {
  try {
    const result = await encode(job)
    self.postMessage({ id, result }, [result.bytes.buffer])
  } catch (e) {
    self.postMessage({ id, error: e.message ?? String(e) })
  }
}
