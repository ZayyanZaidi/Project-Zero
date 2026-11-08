#!/usr/bin/env bash
# ==============================================================================
# Project-Zero - Local Model Server & Sync Manager
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/config.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$SCRIPT_DIR/config.env"; set +a
fi

MODEL_PATH="${MODEL_PATH:-$SCRIPT_DIR/models/qwen2.5-3b-instruct-q4_k_m.gguf}"
LLAMA_SERVER_BIN="${LLAMA_SERVER_BIN:-$SCRIPT_DIR/bin/llama-server}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8080}"
THREADS="${THREADS:-2}"
CTX_SIZE="${CTX_SIZE:-2048}"
PARALLEL="${PARALLEL:-1}"

case "${1:-start}" in
  start)
    if [ ! -f "$MODEL_PATH" ]; then
      echo "Error: Model file not found at $MODEL_PATH"
      exit 1
    fi
    if [ ! -x "$LLAMA_SERVER_BIN" ]; then
      echo "Error: llama-server binary not found or not executable at $LLAMA_SERVER_BIN"
      exit 1
    fi
    echo "Starting Project-Zero model server on http://$HOST:$PORT..."
    echo "Model:   $MODEL_PATH"
    echo "Threads: $THREADS | Context: $CTX_SIZE | Slots: $PARALLEL"
    exec "$LLAMA_SERVER_BIN" \
      -m "$MODEL_PATH" \
      -c "$CTX_SIZE" \
      -t "$THREADS" \
      -np "$PARALLEL" \
      -b 512 \
      -ub 256 \
      -fa on \
      -ctk q8_0 \
      -ctv q8_0 \
      --host "$HOST" \
      --port "$PORT"
    ;;

  sync)
    echo "Running Project-Zero Codebase & GitHub Monitor..."
    python3 "$SCRIPT_DIR/bin/monitor.py"
    ;;

  test)
    echo "Testing server at http://$HOST:$PORT..."
    curl -s -X POST "http://$HOST:$PORT/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -d '{
        "messages": [
          {"role": "system", "content": "You are Project-Zero, an offline assistant. Answer in one short sentence."},
          {"role": "user", "content": "Hello! Confirm you are running offline on CPU."}
        ],
        "max_tokens": 50,
        "temperature": 0.2
      }' | grep -o '"content":"[^"]*"' || echo "Server is not responding. Run './zero.sh start' first."
    echo ""
    ;;

  *)
    echo "Usage: $0 [start|sync|test]"
    exit 1
    ;;
esac

