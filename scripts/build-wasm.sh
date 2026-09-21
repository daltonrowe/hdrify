#!/usr/bin/env bash
# Compile libultrahdr (+ libjpeg-turbo) and web/wasm/uhdr_wasm.c to WebAssembly.
# Output: web/build/wasm/uhdr.mjs + uhdr.wasm. Needs Emscripten (brew install emscripten).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

VERSION=v1.4.0
SRC=vendor/libultrahdr
LIB=web/build/libuhdr
OUT=web/build/wasm

command -v emcc >/dev/null || { echo "emcc not found: brew install emscripten" >&2; exit 1; }
[ -d "$SRC" ] || git clone -q --depth 1 --branch "$VERSION" https://github.com/google/libultrahdr "$SRC"

# CMake 4 dropped <3.5 compat; the libjpeg-turbo that libultrahdr pulls in still declares an older minimum
export CMAKE_POLICY_VERSION_MINIMUM=3.5

emcmake cmake -S "$SRC" -B "$LIB" \
  -DCMAKE_BUILD_TYPE=Release \
  -DUHDR_BUILD_DEPS=ON \
  -DUHDR_BUILD_EXAMPLES=OFF \
  -DUHDR_ENABLE_INSTALL=OFF \
  -DUHDR_WRITE_XMP=ON -DUHDR_WRITE_ISO=ON
cmake --build "$LIB" --target uhdr -j "$(sysctl -n hw.ncpu)"

mkdir -p "$OUT"
emcc -O3 -c web/wasm/uhdr_wasm.c -I "$SRC" -o "$LIB/uhdr_wasm.o"
# libuhdr is C++, so link with em++. The module runs in a Worker (and in Node for tests).
em++ -O3 "$LIB/uhdr_wasm.o" "$LIB/libuhdr.a" "$LIB/turbojpeg/src/turbojpeg-build/libjpeg.a" \
  -o "$OUT/uhdr.mjs" \
  -sMODULARIZE -sEXPORT_ES6 -sEXPORT_NAME=createUhdr \
  -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=4GB \
  -sEXPORTED_FUNCTIONS=_uhdrw_encode,_uhdrw_output,_uhdrw_release,_uhdrw_error,_malloc,_free \
  -sEXPORTED_RUNTIME_METHODS=HEAPU8,UTF8ToString \
  -sFILESYSTEM=0

ls -la "$OUT"
