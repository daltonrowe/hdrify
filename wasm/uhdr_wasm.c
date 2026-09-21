/*
 * Minimal wasm entry point for libultrahdr: HDR + SDR raw intents in, Ultra HDR
 * JPEG out. Mirrors the calls ultrahdr_app makes for the flags lib/core.js uses
 *   -a 4 -t 0 -C 0   HDR: linear RGBA half-float, BT.709
 *   -b 3 -c 0        SDR: RGBA8888 sRGB, BT.709
 *   -M 1 -D 1 -s 1 -G 1 -q/-Q quality -L peak_nits
 * so the web build produces the same file as the CLI and the Electron app.
 *
 * JS usage (see web/src/worker.js):
 *   n = _uhdrw_encode(hdrPtr, sdrPtr, w, h, quality, peakNits)
 *   n > 0  -> HEAPU8.subarray(_uhdrw_output(), _uhdrw_output() + n), then _uhdrw_release()
 *   n <= 0 -> UTF8ToString(_uhdrw_error())
 */

#include <emscripten/emscripten.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ultrahdr_api.h"

static unsigned char* g_out = NULL;
static char g_err[300] = "";

static int fail(uhdr_codec_private_t* enc, uhdr_error_info_t status, const char* step) {
  if (status.has_detail) {
    strncpy(g_err, status.detail, sizeof(g_err) - 1);
  } else {
    // the error code enum has no string table in the public API; the step is the useful part
    snprintf(g_err, sizeof(g_err), "%s failed (uhdr error %d)", step, (int)status.error_code);
  }
  uhdr_release_encoder(enc);
  return -1;
}

#define CHECK(call)                                              \
  do {                                                           \
    uhdr_error_info_t s_ = (call);                               \
    if (s_.error_code != UHDR_CODEC_OK) return fail(enc, s_, #call); \
  } while (0)

static uhdr_raw_image_t packed(uhdr_img_fmt_t fmt, uhdr_color_transfer_t ct, void* data, int w, int h) {
  uhdr_raw_image_t img;
  memset(&img, 0, sizeof(img));
  img.fmt = fmt;
  img.cg = UHDR_CG_BT_709;
  img.ct = ct;
  img.range = UHDR_CR_FULL_RANGE;
  img.w = (unsigned)w;
  img.h = (unsigned)h;
  img.planes[UHDR_PLANE_PACKED] = data;
  img.stride[UHDR_PLANE_PACKED] = (unsigned)w;
  return img;
}

/* Returns the encoded size in bytes, or -1 (message via uhdrw_error). */
EMSCRIPTEN_KEEPALIVE
int uhdrw_encode(void* hdr_rgba_half, void* sdr_rgba8888, int w, int h, int quality, float peak_nits) {
  free(g_out);
  g_out = NULL;
  g_err[0] = '\0';

  uhdr_codec_private_t* enc = uhdr_create_encoder();
  if (!enc) {
    strcpy(g_err, "could not create encoder");
    return -1;
  }

  uhdr_raw_image_t hdr = packed(UHDR_IMG_FMT_64bppRGBAHalfFloat, UHDR_CT_LINEAR, hdr_rgba_half, w, h);
  uhdr_raw_image_t sdr = packed(UHDR_IMG_FMT_32bppRGBA8888, UHDR_CT_SRGB, sdr_rgba8888, w, h);

  CHECK(uhdr_enc_set_raw_image(enc, &hdr, UHDR_HDR_IMG));
  CHECK(uhdr_enc_set_raw_image(enc, &sdr, UHDR_SDR_IMG));
  CHECK(uhdr_enc_set_quality(enc, quality, UHDR_BASE_IMG));
  CHECK(uhdr_enc_set_quality(enc, quality, UHDR_GAIN_MAP_IMG));
  CHECK(uhdr_enc_set_using_multi_channel_gainmap(enc, 1));
  CHECK(uhdr_enc_set_gainmap_scale_factor(enc, 1));
  CHECK(uhdr_enc_set_gainmap_gamma(enc, 1.0f));
  CHECK(uhdr_enc_set_preset(enc, UHDR_USAGE_BEST_QUALITY));
  CHECK(uhdr_enc_set_target_display_peak_brightness(enc, peak_nits));
  CHECK(uhdr_encode(enc));

  uhdr_compressed_image_t* out = uhdr_get_encoded_stream(enc);
  if (!out || !out->data || !out->data_sz) {
    strcpy(g_err, "encoder produced no output");
    uhdr_release_encoder(enc);
    return -1;
  }
  // copy out so the encoder (and its working buffers) can be freed right away
  g_out = (unsigned char*)malloc(out->data_sz);
  if (!g_out) {
    strcpy(g_err, "out of memory copying output");
    uhdr_release_encoder(enc);
    return -1;
  }
  memcpy(g_out, out->data, out->data_sz);
  int size = (int)out->data_sz;
  uhdr_release_encoder(enc);
  return size;
}

EMSCRIPTEN_KEEPALIVE
unsigned char* uhdrw_output(void) { return g_out; }

EMSCRIPTEN_KEEPALIVE
void uhdrw_release(void) {
  free(g_out);
  g_out = NULL;
}

EMSCRIPTEN_KEEPALIVE
const char* uhdrw_error(void) { return g_err; }
