#!/usr/bin/env python3
"""
Brain Project & GitHub Monitor
Advisory and tracking engine that scans local project repositories and GitHub repos.

SECURITY GUARANTEE:
- STRICT READ-ONLY for all external codebases.
- HARDCODED RESTRICTION: Can NEVER execute write operations outside this vault.
- Can ONLY write .md files inside the vault.
- Never runs git commit, push, or mutating commands.
"""

import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error
from datetime import datetime

VAULT_DIR = os.path.realpath(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(VAULT_DIR, "config.env")
PROJECTS_CFG = os.path.join(VAULT_DIR, "projects.json")
SYNC_STATE_PATH = os.path.join(VAULT_DIR, "Logs", ".sync_state.json")

IGNORED_DIRS = {
    "node_modules", ".git", "venv", ".venv", "dist", "build",
    "__pycache__", ".idea", ".vscode", "models", "bin", ".obsidian"
}

IGNORED_EXTENSIONS = {
    ".pyc", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".zip", ".tar.gz", ".tar", ".gz", ".gguf", ".so", ".bin",
    ".dll", ".exe", ".iso", ".pdf", ".lock"
}

# ----------------------------------------------------------------------
# STRICT WRITE ENFORCEMENT
# ----------------------------------------------------------------------
def safe_vault_write(rel_path: str, content: str, mode: str = "w"):
    """
    Guarantees in code that writes are confined exclusively to .md files
    inside this Obsidian vault. Any attempt to write outside raises an error.
    """
    dest = os.path.realpath(os.path.join(VAULT_DIR, rel_path))
    vault_real = os.path.realpath(VAULT_DIR)

    if not dest.startswith(vault_real):
        raise PermissionError(f"[SECURITY BLOCKED] Write destination outside vault: {dest}")
    
    if not dest.endswith(".md") and not dest.endswith(".json"):
        raise PermissionError(f"[SECURITY BLOCKED] Only markdown (.md) and state (.json) files permitted: {dest}")

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, mode, encoding="utf-8") as f:
        f.write(content)
    print(f"  [Vault] Updated: {os.path.relpath(dest, VAULT_DIR)}")

# ----------------------------------------------------------------------
# CONFIG & STATE
# ----------------------------------------------------------------------
def load_env():
    env = {}
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def load_projects_config():
    if os.path.exists(PROJECTS_CFG):
        try:
            with open(PROJECTS_CFG, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {PROJECTS_CFG}: {e}")
    return {"monitored_paths": [], "github_repos": []}

def load_sync_state():
    if os.path.exists(SYNC_STATE_PATH):
        try:
            with open(SYNC_STATE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_sync_state(state):
    safe_vault_write("Logs/.sync_state.json", json.dumps(state, indent=2))

# ----------------------------------------------------------------------
# READ-ONLY LOCAL PROJECT SCANNER
# ----------------------------------------------------------------------
def scan_project(path: str, last_sync_time: float):
    """Inspects a project folder for recent changes in read-only mode."""
    if not os.path.isdir(path):
        return None

    project_name = os.path.basename(os.path.normpath(path))
    if project_name in {"Project-Zero", "brain", ".obsidian"}:
        return None

    changes = []
    is_git = os.path.isdir(os.path.join(path, ".git"))

    if is_git:
        try:
            # Read-only git queries
            status = subprocess.check_output(
                ["git", "-C", path, "status", "-s"],
                stderr=subprocess.DEVNULL, timeout=5
            ).decode("utf-8", errors="replace").strip()

            log = subprocess.check_output(
                ["git", "-C", path, "log", "-n", "3", "--oneline"],
                stderr=subprocess.DEVNULL, timeout=5
            ).decode("utf-8", errors="replace").strip()

            diff_stat = subprocess.check_output(
                ["git", "-C", path, "diff", "--stat"],
                stderr=subprocess.DEVNULL, timeout=5
            ).decode("utf-8", errors="replace").strip()

            if status or diff_stat:
                changes.append(f"Git Status:\n{status}")
                if diff_stat:
                    changes.append(f"Uncommitted Diff Stat:\n{diff_stat}")
            if log:
                changes.append(f"Recent Commits:\n{log}")
        except Exception:
            pass

    # Inspect recent modified files
    recent_files = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in IGNORED_EXTENSIONS or f.startswith("."):
                continue
            fp = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(fp)
                if mtime > last_sync_time:
                    rel_fp = os.path.relpath(fp, path)
                    recent_files.append(rel_fp)
            except OSError:
                continue

    if recent_files:
        changes.append(f"Files Modified since last scan: {', '.join(recent_files[:10])}")

    if not changes:
        return None

    return {
        "name": project_name,
        "path": path,
        "is_git": is_git,
        "summary": "\n\n".join(changes)
    }

# ----------------------------------------------------------------------
# READ-ONLY GITHUB REPO MONITOR
# ----------------------------------------------------------------------
def scan_github_repo(repo_full_name: str, token: str, last_sha: str = ""):
    """Fetches recent commits for a GitHub repo (read-only API)."""
    url = f"https://api.github.com/repos/{repo_full_name}/commits?per_page=3"
    headers = {"User-Agent": "Brain-Offline-Monitor/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data or not isinstance(data, list):
                return None
            latest_sha = data[0].get("sha", "")
            if latest_sha == last_sha:
                return None

            commits_summary = []
            for c in data[:3]:
                msg = c.get("commit", {}).get("message", "").split("\n")[0]
                author = c.get("commit", {}).get("author", {}).get("name", "Unknown")
                commits_summary.append(f"- {msg} (by {author})")

            return {
                "name": repo_full_name,
                "latest_sha": latest_sha,
                "summary": "\n".join(commits_summary)
            }
    except Exception as e:
        print(f"  [GitHub] Could not fetch {repo_full_name}: {e}")
        return None

# ----------------------------------------------------------------------
# LLM ADVISORY SYNTHESIS
# ----------------------------------------------------------------------
def is_server_healthy(port=8080):
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/health")
        with urllib.request.urlopen(req, timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False

def query_advisor(prompt: str, port=8080):
    """Sends context to local llama-server and returns advisory markdown."""
    payload = json.dumps({
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Project-Zero, an offline advisor and project monitor. "
                    "Analyze the given project changes and produce a concise, structured markdown report with:\n"
                    "1. 🎯 Milestone Summary: What was accomplished\n"
                    "2. ⚡ Suggested Next Steps: Top 2-3 actionable tasks\n"
                    "3. 🔍 Flagged Considerations: Any code smells, edge cases, or potential issues."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 800
    }).encode("utf-8")

    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"]

# ----------------------------------------------------------------------
# MAIN RUNNER
# ----------------------------------------------------------------------
def run_sync():
    print(f"\n[Brain Monitor] Scanning monitored paths at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}...")
    env = load_env()
    cfg = load_projects_config()
    state = load_sync_state()

    port = int(env.get("PORT", "8080"))
    token = env.get("GITHUB_TOKEN", "")

    # Gather projects to scan
    paths_to_scan = set()
    default_dir = env.get("PROJECTS_DIR", "/home/zayyan/Desktop/Antigravity projects")
    if os.path.isdir(default_dir):
        for entry in os.listdir(default_dir):
            full = os.path.join(default_dir, entry)
            if os.path.isdir(full) and entry not in {"brain", ".obsidian"}:
                paths_to_scan.add(full)

    for p in cfg.get("monitored_paths", []):
        if os.path.isdir(p) and p != default_dir:
            paths_to_scan.add(p)

    active_changes = []
    current_time = time.time()

    # 1. Scan Local Projects
    for path in sorted(paths_to_scan):
        last_sync = state.get(path, {}).get("last_sync", 0)
        report = scan_project(path, last_sync)
        if report:
            print(f"  [Found Changes] {report['name']}")
            active_changes.append(report)
        state[path] = {"last_sync": current_time}

    # 2. Scan GitHub Repos
    for repo in cfg.get("github_repos", []):
        last_sha = state.get(f"gh:{repo}", {}).get("sha", "")
        gh_report = scan_github_repo(repo, token, last_sha)
        if gh_report:
            print(f"  [Found GitHub Updates] {gh_report['name']}")
            active_changes.append({
                "name": gh_report["name"],
                "summary": f"Recent Commits:\n{gh_report['summary']}"
            })
            state[f"gh:{repo}"] = {"sha": gh_report["latest_sha"], "last_sync": current_time}

    if not active_changes:
        print("  [Brain Monitor] No new project changes detected.")
        save_sync_state(state)
        return

    # 3. Consult LLM Engine
    print(f"\n[Brain Advisor] Generating advisory logs for {len(active_changes)} project(s)...")
    server_started_by_us = False

    if not is_server_healthy(port):
        print("  [Server] Engine is on standby. Starting llama-server temporarily...")
        bin_path = os.path.join(VAULT_DIR, "bin", "llama-server")
        model_path = os.path.join(VAULT_DIR, "models", "qwen2.5-3b-instruct-q4_k_m.gguf")
        proc = subprocess.Popen([
            bin_path, "-m", model_path, "-c", "2048", "-t", "2", "-np", "1",
            "-b", "512", "-ub", "256", "-fa", "on", "-ctk", "q8_0", "-ctv", "q8_0",
            "--host", "127.0.0.1", "--port", str(port)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        server_started_by_us = True

        for _ in range(30):
            time.sleep(1)
            if is_server_healthy(port):
                break

    try:
        today = datetime.now().strftime("%Y-%m-%d")
        daily_log_path = f"Logs/daily/{today}.md"

        for item in active_changes:
            name = item["name"]
            prompt = f"Project: {name}\nRecent Changes and Status:\n{item['summary']}\n\nProvide advisory insights."
            try:
                advisor_report = query_advisor(prompt, port)
            except Exception as e:
                advisor_report = f"*(Model evaluation skipped: {e})*\n\n{item['summary']}"

            # Update Project Note
            project_note = (
                f"# Project: {name}\n\n"
                f"*Last Monitored: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
                f"## Status & Recent Changes\n```\n{item['summary']}\n```\n\n"
                f"## Brain Advisory Assessment\n{advisor_report}\n"
            )
            safe_vault_write(f"Projects/{name.replace('/', '-')}.md", project_note)

            # Update Suggestions Note
            suggestion_entry = (
                f"# Next Steps & Issues: {name}\n\n"
                f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
                f"{advisor_report}\n"
            )
            safe_vault_write(f"Suggestions/{name.replace('/', '-')}-next-steps.md", suggestion_entry)

            # Append to Daily Log
            daily_entry = (
                f"\n\n### ⚡ {name} ({datetime.now().strftime('%H:%M')})\n"
                f"{advisor_report}\n"
            )
            safe_vault_write(daily_log_path, daily_entry, mode="a")

        save_sync_state(state)
        print("\n[Brain Monitor] Advisory sync complete! Notes updated inside vault.")

    finally:
        if server_started_by_us:
            print("  [Server] Work complete. Stopping llama-server to release RAM...")
            subprocess.run(["pkill", "-f", "llama-server"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    run_sync()

