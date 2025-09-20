#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/gradio.pid"
LOG_FILE="$ROOT/gradio.log"
APP_FILE="$ROOT/admin_rag.py"

# Optional: point to Ollama models cache if used by admin_rag
export OLLAMA_MODELS="${OLLAMA_MODELS:-$HOME/.ollama}"

start_gradio() {
  echo "[gradio] starting..."
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[gradio] already running (pid $(cat "$PID_FILE"))"
    return 0
  fi
  cd "$ROOT"
  nohup /usr/bin/python3 "$APP_FILE" > "$LOG_FILE" 2>&1 & echo $! > "$PID_FILE"
  # health check (wait up to 120s, PDFs/embeddings may take time)
  for i in {1..120}; do
    if curl -sSf http://127.0.0.1:7860 >/dev/null; then
      echo "[gradio] healthy on http://127.0.0.1:7860"
      return 0
    fi
    sleep 1
  done
  echo "[gradio] failed to become healthy" >&2
  tail -n 120 "$LOG_FILE" || true
  exit 1
}

stop_gradio() {
  echo "[gradio] stopping..."
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
}

status_gradio() {
  echo "[status] process: $( [[ -f "$PID_FILE" ]] && ps -p "$(cat "$PID_FILE")" -o pid=,cmd= || echo down )"
  echo "[status] port 7860: $(curl -s http://127.0.0.1:7860 >/dev/null && echo up || echo down)"
}

logs_gradio() {
  echo "--- gradio.log ---"; tail -n 200 "$LOG_FILE" || true
}

case "${1:-}" in
  start|"")
    start_gradio
    ;;
  stop)
    stop_gradio
    ;;
  status)
    status_gradio
    ;;
  logs)
    logs_gradio
    ;;
  restart)
    stop_gradio || true
    start_gradio
    ;;
  *)
    echo "usage: $0 [start|stop|restart|status|logs]"; exit 2;
    ;;
esac


