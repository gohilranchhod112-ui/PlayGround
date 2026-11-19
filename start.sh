#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

if [[ -f package-lock.json ]]; then
  /usr/bin/time -p npm ci --no-audit --no-fund
else
  /usr/bin/time -p npm install --no-audit --no-fund
fi

/usr/bin/time -p npm run build

/usr/bin/time -p mkdir -p "$WEB_DIR" "$DIST_DIR"
/usr/bin/time -p node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({project:process.argv[2],directory:process.argv[3]}))' \
  "$WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$DIST_DIR"

exec /usr/bin/time -p npm run preview -- --host 0.0.0.0 --port "$PORT"
