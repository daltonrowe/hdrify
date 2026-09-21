# uhdr web — the app in the browser, via WebAssembly

The same UI as the Electron app (`app/renderer/`), running entirely client-side:
libultrahdr is compiled to wasm and runs in a Web Worker. Images never leave the
device. The output is a static site (~840 KB, wasm ~213 KB gzipped) that any static
host can serve (GitHub Pages, Netlify, S3…). It needs no special headers because
it doesn't use threads or SharedArrayBuffer.

```sh
brew install emscripten   # one-time
npm run web:wasm          # compile libultrahdr + wrapper -> web/build/wasm/
npm run web               # assemble web/dist/ and serve it (npx serve)
npm run web:verify        # wasm vs native encoder on every image in in/
npm run web:smoke         # browser end-to-end: open, paint, encode, screenshot
```

Deploy by uploading `web/dist/` after `npm run web:build`.

## Layout

| path | what |
|---|---|
| `wasm/uhdr_wasm.c` | C entry point: raw HDR + SDR in, Ultra HDR JPEG out. Mirrors the `ultrahdr_app` calls the CLI uses |
| `scripts/build-wasm.sh` | builds libultrahdr v1.4.0 + libjpeg-turbo with Emscripten, links the wrapper to `uhdr.mjs` + `uhdr.wasm` |
| `src/worker.js` | module worker: `lib/hdr.js` builds the HDR intent, then the wasm encodes it |
| `src/api.js` | browser implementation of the `window.uhdr` bridge the renderer uses (Electron's is `app/preload.cjs`) |
| `src/web.css` | small overrides (no macOS title bar) |
| `scripts/build-web.js` | copies renderer + `lib/hdr.js` + `src/` + wasm into `dist/` and patches `index.html` (CSP, bridge script) |
| `scripts/verify-wasm.js` | encodes identical pixels natively and in wasm, compares metadata and PSNR |
| `scripts/smoke-web.js` | serves `dist/` over http and drives it in Chromium (via Electron, no preload) |

## Parity with native

`npm run web:verify` on the sample images: gain-map metadata is **identical**. The
pixels differ only by rounding: libultrahdr's RGB→YUV step uses NEON natively and
scalar C in wasm, and libjpeg-turbo builds without SIMD for wasm. That gives
SDR PSNR 49–70 dB and HDR PSNR 57–85 dB, far below visible (>45 dB).

Speed: wasm encodes are ~2.5–3.5× slower than native (~250 ms vs ~80 ms at
1600×1000). The worker keeps painting smooth while an encode runs.

## Browser support

| | open / paint / export | HDR preview |
|---|---|---|
| Chrome / Edge (desktop) | yes (native save dialog) | yes, on an HDR display |
| Safari 26 | yes (download) · also opens HEIC | yes, on an HDR display |
| Firefox | yes (download) | no, SDR only (export is still HDR) |

Differences from the Electron app: no HEIC outside Safari, no TIFF, no Finder
"Open With", and no auto-loading of a sibling `*.mask.png` (drop the mask onto the
image instead). Very large images are bounded by wasm32's 4 GB memory, roughly
50 MP.
