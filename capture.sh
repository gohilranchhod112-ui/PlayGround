#!/usr/bin/env bash
set -euo pipefail

: "${CAPTURE_URL:?Set CAPTURE_URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
export RUNTIME_DIR CAPTURE_URL CAPTURE_DIR
export CAPTURE_STRICT="${CAPTURE_STRICT:-1}"
export CAPTURE_AUTO_START="${CAPTURE_AUTO_START:-true}"
export CAPTURE_START_SELECTOR="${CAPTURE_START_SELECTOR:-#start-button}"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p bash -n capture.sh
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
