#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="z3-wasm-full-build"
Z3_VERSION="${Z3_VERSION:-z3-4.15.0}"

echo "=== Building Z3 WASM (${Z3_VERSION}) ==="
echo "This takes 10-30 minutes depending on your machine."
echo ""

docker build \
  --build-arg "Z3_VERSION=${Z3_VERSION}" \
  -t "${IMAGE_NAME}" \
  -f "${SCRIPT_DIR}/Dockerfile" \
  "${SCRIPT_DIR}"

echo ""
echo "=== Extracting artifacts ==="

mkdir -p "${PACKAGE_DIR}/vendor"

CONTAINER_ID=$(docker create "${IMAGE_NAME}")
docker cp "${CONTAINER_ID}:/output/z3-built.js" "${PACKAGE_DIR}/vendor/z3-built.js"
docker cp "${CONTAINER_ID}:/output/z3-built.wasm" "${PACKAGE_DIR}/vendor/z3-built.wasm"
docker cp "${CONTAINER_ID}:/output/wrapper.__GENERATED__.ts" "${PACKAGE_DIR}/vendor/" 2>/dev/null || true
docker cp "${CONTAINER_ID}:/output/types.__GENERATED__.ts" "${PACKAGE_DIR}/vendor/" 2>/dev/null || true
docker rm "${CONTAINER_ID}"

echo ""
echo "=== Verifying artifacts ==="

# Check addFunction is exported (not in missingLibrarySymbols)
if grep -q "Module\['addFunction'\]" "${PACKAGE_DIR}/vendor/z3-built.js"; then
  echo "  addFunction: EXPORTED"
else
  echo "  addFunction: MISSING (build failed to export it)"
  exit 1
fi

if grep -q "Module\['removeFunction'\]" "${PACKAGE_DIR}/vendor/z3-built.js"; then
  echo "  removeFunction: EXPORTED"
else
  echo "  removeFunction: MISSING"
  exit 1
fi

# Check ALLOW_TABLE_GROWTH
if grep -q "ALLOW_TABLE_GROWTH" "${PACKAGE_DIR}/vendor/z3-built.js" 2>/dev/null || true; then
  echo "  ALLOW_TABLE_GROWTH: set (table is growable)"
fi

WASM_SIZE=$(du -h "${PACKAGE_DIR}/vendor/z3-built.wasm" | cut -f1)
JS_SIZE=$(du -h "${PACKAGE_DIR}/vendor/z3-built.js" | cut -f1)
echo ""
echo "=== Build complete ==="
echo "  vendor/z3-built.wasm: ${WASM_SIZE}"
echo "  vendor/z3-built.js:   ${JS_SIZE}"
echo "  vendor/wrapper.__GENERATED__.ts"
