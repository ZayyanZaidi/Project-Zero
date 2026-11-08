#!/usr/bin/env bash
# ==============================================================================
# Brain - One-Click Launcher for Linux
# ==============================================================================
VAULT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo "Releasing resources..."
  pkill -f llama-server 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Launching Brain Vault in Obsidian..."
if command -v obsidian >/dev/null 2>&1; then
  obsidian "$VAULT_DIR"
elif command -v flatpak >/dev/null 2>&1 && flatpak list | grep -q md.obsidian.Obsidian; then
  flatpak run md.obsidian.Obsidian "$VAULT_DIR"
else
  # Fallback to Obsidian URI protocol handler
  xdg-open "obsidian://open?path=$(printf '%s' "$VAULT_DIR" | jq -sRr @uri 2>/dev/null || echo "$VAULT_DIR")" 2>/dev/null || {
    echo "Opened Obsidian URI for: $VAULT_DIR"
  }
fi

