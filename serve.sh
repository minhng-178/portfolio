#!/usr/bin/env bash
# serve.sh — Serve the portfolio UI locally and open it in the browser.

set -euo pipefail

PORT=${1:-8080}
UI_DIR="$(cd "$(dirname "$0")/ui" && pwd)"

echo "Serving $UI_DIR on http://localhost:$PORT"
echo "Press Ctrl+C to stop."

# Open browser after a short delay so the server is ready
(sleep 0.5 && open "http://localhost:$PORT") &

cd "$UI_DIR"
python3 -m http.server "$PORT"
