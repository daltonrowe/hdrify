/**
 * Pure SDR -> HDR intent math, shared by Node (lib/core.js) and the browser
 * (web/src/worker.js). No Node or DOM APIs.
 *
 *   rgba  RGBA8888 sRGB pixels                                -> SDR intent
 *   gain  per-pixel linear multiplier, from either
 *           auto: highlights above `threshold` ramp up to `boost` x
 *           mask: 8-bit gray per pixel, white = boost x, black = 1 x
 *   hdr   linear RGBA half-float, 1.0 == SDR white            -> HDR intent
 */

export const srgbToLinear = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

export const smoothstep = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1)
  return t * t * (3 - 2 * t)
}

// float32 -> IEEE half bits (round-to-nearest, no NaN handling needed for our range)
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
export function toHalf(v) {
  f32[0] = v
  const x = u32[0]
  const sign = (x >>> 16) & 0x8000
  const exp = ((x >>> 23) & 0xff) - 127 + 15
  let mant = x & 0x7fffff
  if (exp <= 0) {
    if (exp < -10) return sign
    mant |= 0x800000
    return sign | ((mant >> (14 - exp)) + ((mant >> (13 - exp)) & 1))
  }
  if (exp >= 31) return sign | 0x7c00
  // adding the round bit may carry into the exponent, which is the correct result
  return (sign | (exp << 10) | (mant >> 13)) + ((mant >> 12) & 1)
}

/**
 * Build the HDR intent. Scaling RGB by one factor per pixel preserves hue.
 * With a mask the gain comes from the mask; otherwise from the highlight curve.
 */
export function buildHdr(rgba, { mask, boost = 4, threshold = 0.6 }) {
  const n = rgba.length / 4
  const out = new Uint16Array(n * 4)
  const one = toHalf(1)
  let peak = 1
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2]
    let gain
    if (mask) {
      gain = 1 + (boost - 1) * (mask[i] / 255)
    } else {
      // Rec.709 luma of the *encoded* values is a decent perceptual brightness proxy
      const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      gain = 1 + (boost - 1) * smoothstep(threshold, 1, y) ** 2
    }
    if (gain > peak) peak = gain
    out[i * 4] = toHalf(srgbToLinear[r] * gain)
    out[i * 4 + 1] = toHalf(srgbToLinear[g] * gain)
    out[i * 4 + 2] = toHalf(srgbToLinear[b] * gain)
    out[i * 4 + 3] = one
  }
  return { hdr: out, peak }
}

/** Target display peak for the encoder: full boost applies at `boost` x SDR-white (203 nits) headroom. */
export const targetPeakNits = boost => Math.max(203, Math.min(10000, 203 * boost))
