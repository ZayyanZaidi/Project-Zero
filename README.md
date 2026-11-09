# PROJECT-ZERO

> **Lightweight, Offline AI Assistant & Engineering Cockpit** running 100% locally on CPU inside Obsidian.
> Built for dual-core, low-RAM machines (e.g. Lenovo ThinkPad X250, 8GB RAM).

---

## Core Features

* **On-Demand Local LLM Engine:**
  * Runs quantized models (`Qwen 2.5 3B Instruct Q4_K_M`) via `llama.cpp`'s `llama-server`.
  * **Zero Idle Memory:** Auto-spawns on prompt submission and terminates after 45s idle (0 MB RAM / 0% CPU when not generating).
* **Midnight Sapphire Obsidian Cockpit:**
  * High-definition Hokusai ocean wave watermark visible across the workspace.
  * Midnight Prussian Blue and Deep Sapphire theme with crisp contrasting white typography, zero text-glow overhead, and zero GPU blur filters.
* **Two Distinct Modes:**
  * **Engineering Mode:** Read-only tracking of local codebases and GitHub repos. Produces architectural next-steps, bug audits, and progress logs without ever mutating code outside the vault.
  * **Course Study Mode:** Dedicated academic study hub with course folders, syllabus trackers, concept breakdowns, and interactive self-grading quizzes.
* **Strict Security Boundary:**
  * Hardcoded in code: write operations are restricted strictly to `.md` files inside this vault.
  * Automatically ignores heavy folders (`node_modules`, `.git`, `venv`, `dist`, `bin`, `models`).

---

## Quick Start

### 1. Launching
* **Linux:** `./launch-zero.sh`
* **Windows:** `launch-zero.bat`

### 2. CLI Controls
```bash
./zero.sh start   # Boots the llama-server manually
./zero.sh sync    # Scans monitored codebases and generates advisory logs
./zero.sh test    # Sends a quick verification prompt
```

---

## Vault Structure

```
Project-Zero/
├── .obsidian/               <- Midnight Sapphire theme, plugins (Project-Zero, Dataview)
├── Dashboard.md             <- Command Center cockpit with Dataview tables
├── Projects/                <- Monitored codebase profiles & architecture specs
├── Study/                   <- Course study hub
│   └── Courses/             <- Course folders (Syllabus, Notes, Quizzes)
├── Suggestions/             <- Actionable next steps and bug audits
├── Logs/                    <- Daily progress timelines and sync state
├── models/                  <- GGUF model files (gitignored)
├── bin/                     <- Precompiled llama-server & monitor engine (gitignored)
├── config.env               <- Hardware flags & configuration (gitignored)
└── zero.sh                  <- Server & sync CLI controller
```
