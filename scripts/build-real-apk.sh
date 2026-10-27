#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "=== Building & Signing Official Javaneh Android APK (v1 + v2 + v3) ==="
python3 "$ROOT_DIR/scripts/build-apk.py"
echo "=== APK Build Complete ==="
