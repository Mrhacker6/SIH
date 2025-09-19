#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACK_PID_FILE="$ROOT/api.pid"
FRONT_LOG="$ROOT/frontend-dev.log"
export OLLAMA_MODELS="$HOME/.ollama"

start_backend() {
  echo "[backend] starting..."
  if [[ -f "$BACK_PID_FILE" ]] && kill -0 "$(cat "$BACK_PID_FILE")" 2>/dev/null; then
    echo "[backend] already running (pid $(cat "$BACK_PID_FILE"))"
  else
    cd "$ROOT"
    nohup /usr/bin/python3 "$ROOT/api_server.py" > "$ROOT/api.log" 2>&1 & echo $! > "$BACK_PID_FILE"
    sleep 1
  fi
  # health check
  for i in {1..20}; do
    if curl -s http://localhost:8000/health >/dev/null; then
      echo "[backend] healthy"
      return 0
    fi
    sleep 1
  done
  echo "[backend] failed to become healthy" >&2
  tail -n 80 "$ROOT/api.log" || true
  exit 1
}

start_frontend() {
  echo "[frontend] starting..."
  cd "$ROOT/frontend"
  nohup npm run dev --yes > "$FRONT_LOG" 2>&1 & echo $! > "$ROOT/frontend.pid"
  # health check
  for i in {1..30}; do
    if curl -sSf http://localhost:3000 >/dev/null; then
      echo "[frontend] healthy"
      return 0
    fi
    sleep 1
  done
  echo "[frontend] failed to become healthy" >&2
  tail -n 80 "$FRONT_LOG" || true
  exit 1
}

case "${1:-}" in
  stop)
    echo "[stop] stopping services"
    [[ -f "$BACK_PID_FILE" ]] && kill "$(cat "$BACK_PID_FILE")" 2>/dev/null || true
    [[ -f "$ROOT/frontend.pid" ]] && kill "$(cat "$ROOT/frontend.pid")" 2>/dev/null || true
    ;;
  start|"")
    start_backend
    start_frontend
    echo "[ok] backend: http://localhost:8000  frontend: http://localhost:3000"
    ;;
  status)
    echo "[status] backend: $(curl -s http://localhost:8000/health || echo down)"
    echo "[status] frontend: $(curl -s http://localhost:3000 >/dev/null && echo up || echo down)"
    ;;
  logs)
    echo "--- api.log ---"; tail -n 100 "$ROOT/api.log" || true
    echo "--- frontend-dev.log ---"; tail -n 100 "$FRONT_LOG" || true
    ;;
  *)
    echo "usage: $0 [start|stop|status|logs]"; exit 2;
    ;;
esac
