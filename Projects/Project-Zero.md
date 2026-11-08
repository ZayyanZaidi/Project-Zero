# Project: Project-Zero

*Architecture & Technical Review Profile*

---

## 🏛 System Architecture & Stack

### 1. Hardware Constraint & Platform
* **Target Device:** Lenovo ThinkPad X250
* **Processor:** Intel Core i5-4300U (2 physical cores / 4 threads, Haswell/Broadwell family, AVX2 & FMA3 instructions)
* **Memory Target:** 8 GB Total System RAM (strictly capped to under 2.5 GB peak footprint)
* **Operating Systems:** Linux Mint (Ubuntu 24.04 noble base) & Windows 10

### 2. Local Model Inference Server
* **Engine:** `llama.cpp` official precompiled AVX2 `llama-server` binary (`bin/llama-server`).
* **Active Model:** `Qwen 2.5 3B Instruct` (`Q4_K_M` quantization, 2,104,932,768 bytes on disk).
* **Low-RAM Runtime Flags:**
  * `-t 2`: Compute pinned to 2 threads matching physical CPU cores to eliminate hyperthread contention and thermal throttling.
  * `-c 2048`: Context window restricted to 2048 tokens to keep KV cache memory footprint under ~280 MB RAM.
  * `-np 1`: Single concurrent processing slot to prevent memory duplication spikes.
  * `--mmap`: OS kernel memory-mapping enabled for instantaneous paging.
  * `--host 127.0.0.1 --port 8080`: Local OpenAI-compatible REST API loopback.

### 3. Native Obsidian Assistant Integration
* **Plugin:** Vanilla JavaScript Obsidian plugin (`.obsidian/plugins/project-zero/main.js`).
* **Zero-Idle Lifecycle:**
  * Auto-spawns `llama-server` on prompt submission via Node `child_process.spawn`.
  * Streams tokens live into Obsidian using Server-Sent Events (`res.body.getReader()`).
  * Enforces a 90-second idle auto-shutdown timer (`pkill -f llama-server`) that releases all 2.2 GB of RAM as soon as user is idle.
  * Kills child processes unconditionally on Obsidian window unload (`onunload`).

### 4. Codebase Monitoring & Security Boundary
* **Engine:** Pure Python standard library script (`bin/monitor.py`).
* **Security Enforcement:**
  * Reads external project repositories strictly in read-only mode (`git status -s`, `git log -n 3`, file modification timestamp checks).
  * Excludes heavy trees (`node_modules`, `.git`, `venv`, `dist`, `bin`, `models`).
  * **Unbypassable Write Barrier:** `safe_vault_write()` function hardcoded to assert that file paths start with `VAULT_DIR` and end in `.md`. Any write outside the vault throws `PermissionError`. Never executes mutating git commands.

---

## 🔍 Technical Improvements & Code Opportunities
1. **llama-server KV Cache Compression:**
   * Adding `--ctk q8_0 --ctv q8_0` or `--ctk q4_0` flags to `llama-server` reduces KV cache RAM usage by 40–60%.
2. **Flash Attention on CPU:**
   * Adding `-fa` (`--flash-attn`) to `llama-server` startup arguments to reduce memory bandwidth during long context ingestion.
3. **Chunk Batching:**
   * Adding `-b 512 -ub 256` to optimize chunk sizes during prompt ingestion on dual-core U-series CPUs.
4. **Interactive Quiz Self-Grading:**
   * Adding an interactive Obsidian checklist/grading component in `Study/Courses/<course>/Quizzes/` so the user can submit answers and get instant feedback.
5. **AST/Tree-sitter Semantic Diffing:**
   * Replacing raw git file-modification scans in `bin/monitor.py` with function/class signature diffs so the LLM receives semantic code modifications rather than file-level change lists.
