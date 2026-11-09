# Project-Zero: Complete Setup & User Guide

Project-Zero is a lightweight, offline-first AI engineering and computer science study assistant built natively for **Obsidian**. It is specifically engineered to run smoothly on low-spec hardware (such as dual-core laptops with 8 GB RAM and no dedicated GPU) by managing a local `llama.cpp` inference server on demand and releasing 100% of RAM when idle.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Directory Structure](#2-directory-structure)
3. [Step-by-Step Installation & Setup](#3-step-by-step-installation--setup)
4. [Enabling the Plugin & Theme in Obsidian](#4-enabling-the-plugin--theme-in-obsidian)
5. [Using the Project-Zero Cockpit](#5-using-the-project-zero-cockpit)
6. [Interactive Self-Grading Quizzes](#6-interactive-self-grading-quizzes)
7. [External Codebase & GitHub Monitoring](#7-external-codebase--github-monitoring)
8. [Performance & Memory Tuning](#8-performance--memory-tuning)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. System Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **CPU** | 64-bit x86 CPU with AVX2 support (e.g., Intel Core i5-4300U) | 4+ Core CPU (Intel/AMD or Apple Silicon) |
| **RAM** | 4 GB (with 1.5B Q4 model) / 8 GB (with 3B Q4 model) | 8 GB+ |
| **Disk Space** | 2.5 GB free space | 5 GB free space |
| **OS** | Linux (Ubuntu/Mint/Debian/Arch) or Windows 10/11 | Linux or Windows 10/11 |
| **Software** | Obsidian (v1.5.0+), Python 3.8+ (optional, for background codebase scanner) | Obsidian Desktop |

---

## 2. Directory Structure

When opened as an Obsidian vault, Project-Zero uses the following layout:

```text
Project-Zero/
├── .obsidian/
│   ├── plugins/project-zero/     # Native Obsidian plugin (main.js, styles.css, manifest.json, USER_GUIDE.md)
│   └── snippets/samurai-zen.css  # High-efficiency dark theme & UI layout
├── bin/
│   ├── llama-server              # Precompiled llama.cpp server binary (or llama-server.exe on Windows)
│   ├── monitor.py                # Read-only codebase & GitHub scanner with AST semantic diffing
│   └── download_model.py         # Helper script to fetch the default GGUF model
├── models/
│   └── qwen2.5-3b-instruct-q4_k_m.gguf  # Local quantized LLM weights (auto-detected)
├── Projects/                     # Auto-generated & manual technical profiles of your codebases
├── Study/
│   └── Courses/                  # Course syllabi, notes, and interactive self-grading quizzes
├── Suggestions/                  # Saved engineering audits and architectural notes
├── config.env                    # Hardware, thread, and port settings
├── projects.json                 # List of local folders and GitHub repos to monitor
├── zero.sh / zero.bat            # CLI wrapper for Linux and Windows
└── USER_GUIDE.md                 # This guide
```

---

## 3. Step-by-Step Installation & Setup

### Step 1: Clone or Download the Vault
Clone the repository or extract the Project-Zero folder to your machine:
```bash
git clone <repository-url> Project-Zero
cd Project-Zero
```

### Step 2: Place the Inference Binary (`llama-server`)
Project-Zero requires the `llama-server` executable from [llama.cpp releases](https://github.com/ggerganov/llama.cpp/releases) inside the `bin/` folder:
- **Linux:** Place `llama-server` along with its shared libraries (`libllama.so`, `libggml*.so`) inside `bin/` and ensure it is executable:
  ```bash
  chmod +x bin/llama-server zero.sh
  ```
- **Windows:** Download the `llama-bXXXX-bin-win-avx2-x64.zip` release from `llama.cpp` and extract `llama-server.exe` (and any accompanying `.dll` files) into the `bin/` folder.

### Step 3: Download a `.gguf` Model
Place any `.gguf` instruction-tuned model inside the `models/` folder.
- **Automated Download (Default Qwen 2.5 3B Q4_K_M):**
  ```bash
  python3 bin/download_model.py
  ```
- **Custom Model:** You can drop *any* `.gguf` file into `models/`. If `qwen2.5-3b-instruct-q4_k_m.gguf` is not present, the plugin automatically scans `models/` and loads the first `.gguf` file it finds.

---

## 4. Enabling the Plugin & Theme in Obsidian

1. Launch **Obsidian** and click **Open folder as vault**, then select the `Project-Zero` directory.
2. Open **Settings** (gear icon in the bottom-left corner):
   - Navigate to **Community plugins**.
   - Click **Turn on community plugins** (if prompted).
   - Under **Installed plugins**, enable **Project-Zero Assistant**.
3. Enable the optimized dark interface (optional):
   - Navigate to **Settings -> Appearance**.
   - Scroll down to **CSS snippets** and toggle on **`samurai-zen`**.

Once enabled, the **Project-Zero Cockpit** automatically opens in your right sidebar, or you can click the terminal icon in the left ribbon at any time.

---

## 5. Using the Project-Zero Cockpit

### Header Controls
- **Status Indicator (`Standby` / `Starting...` / `Active`):**
  - `Standby`: `llama-server` is off; **0 MB RAM** is used by the AI engine.
  - `Starting...`: Model weights are being mapped into memory (~6-8 seconds on dual-core CPUs).
  - `Active`: Engine is warm and streaming tokens. Automatically shuts down after **45 seconds of inactivity**.
- **`Free RAM` Button:** Immediately terminates the background `llama-server` process and returns system memory to the OS.
- **`Guide` Button:** Opens this `USER_GUIDE.md` directly inside your active Obsidian pane.
- **`Expand` Button:** Opens the Project-Zero Cockpit in a full-width main editor tab.

### Operating Modes
Switch between the two specialized modes using the mode bar:
1. **Engineering Mode (`work`):**
   - Configured for systems architecture, code reviews, debugging, and memory/CPU optimization.
   - Automatically injects the relevant project profile from `Projects/<ProjectName>.md` when your prompt mentions any of your projects (supports fuzzy matching such as `Evaluate noor-e-basr(2)` or `Review Project-Zero`).
2. **Course Study Mode (`study`):**
   - Configured for computer science coursework, algorithms, and system design exam preparation.
   - Automatically injects the course syllabus from `Study/Courses/<CourseName>/Syllabus.md` when you mention a course name (e.g., `CS-Algorithms` or `System-Design`).

### Session History Drawer
- Click the **Session Bar** (`Session 1 [v]`) below the header to expand or collapse your saved chat sessions.
- Click **`+ New`** to start a fresh conversation thread.
- Click **`x`** next to any inactive session to delete it.
- Sessions persist automatically across Obsidian restarts.

### Sending, Stopping, and Saving Responses
- **Send Prompt:** Click **Send** or press `Ctrl + Enter` (`Cmd + Enter` on macOS).
- **Stop Generation (`Stop` Button):**
  - Clicking **Stop** while a response is streaming cleanly aborts the HTTP stream using `AbortController` **without killing the server**. Partial output is preserved and rendered as Markdown so your next prompt responds immediately without reloading the model.
  - Clicking **Stop** when no response is streaming acts like `Free RAM` and shuts down the server.
- **`Copy` & `Save Note`:**
  - Every assistant message includes a **Copy** button and a **Save Note** button.
  - In **Engineering Mode**, `Save Note` writes the response to `Suggestions/YYYY-MM-DD-HH-MM-SS.md`.
  - In **Course Study Mode**, `Save Note` automatically detects the subject and whether the note contains a quiz, filing it into `Study/Courses/<Course>/Quizzes/` or `Study/Courses/<Course>/Notes/`.

---

## 6. Interactive Self-Grading Quizzes

Project-Zero includes a built-in Obsidian Markdown codeblock processor for interactive self-grading quizzes. Any fenced codeblock labeled ```` ```quiz ```` is rendered as an interactive test card with option selection, instant grading, score badges, and explanations.

### How to Create an Interactive Quiz
In any Markdown note (or by asking Project-Zero in **Course Study Mode** to generate a quiz), write a ```` ```quiz ```` block using the following syntax:

````markdown
```quiz
Q1: Which KV-cache quantization flag reduces llama-server memory usage by ~50%?
- [ ] --mmap
- [x] -ctk q4_0 -ctv q4_0
- [ ] --poll 0
- [ ] -fa off
Explanation: Quantizing both the K and V cache tensors to 4-bit (q4_0) cuts KV cache RAM consumption by roughly half compared to fp16.

Q2: What is the time complexity of finding the minimum element in a Binary Min-Heap?
- [x] O(1)
- [ ] O(log n)
- [ ] O(n)
- [ ] O(n log n)
Explanation: The minimum element is always stored at the root node (index 0) of a Min-Heap.
```
````

### Interactive Controls
- Click any option row (`[ ]` -> `[*]`) to select your answer.
- Click **Check Answers** at the bottom of the quiz to grade all questions, highlight `[Correct]` / `[Incorrect]` selections, reveal explanations, and calculate your percentage score.
- Click **Retry** to clear your selections and retake the quiz.

---

## 7. External Codebase & GitHub Monitoring

Project-Zero includes a zero-dependency Python scanner (`bin/monitor.py`) that inspects your local development folders and GitHub repositories, extracts AST/signature-level semantic diffs, and updates Markdown summaries inside `Projects/`.

### Security Boundary (Read-Only Guarantee)
`bin/monitor.py` enforces an unbypassable write barrier (`safe_vault_write()`):
- External project directories are opened strictly in **read-only** mode.
- The script can **only** write files inside your Project-Zero vault (`Projects/` and `Suggestions/`). Any attempt to write outside the vault raises a `PermissionError`.

### Configuring `projects.json`
Edit `projects.json` in the root of the vault to add local directories or GitHub repositories:

```json
{
  "github_username": "your-github-username",
  "scan_directories": [
    "/home/username/Desktop/Work"
  ],
  "local_projects": [
    {
      "name": "My-Backend-Service",
      "path": "/home/username/projects/my-backend-service",
      "category": "Systems Engineering",
      "auto_review": true
    }
  ],
  "courses": [
    {
      "name": "CS-Algorithms",
      "topics": ["Graphs", "Dynamic Programming", "Heaps & Trees"]
    }
  ]
}
```

### Running the Scanner via CLI
Use `zero.sh` (Linux/macOS) or `zero.bat` (Windows) from a terminal:

```bash
# Scan all configured projects, extract AST/Git diffs, and update Projects/*.md
./zero.sh sync

# Run an AI architectural review on changed projects and save to Suggestions/
./zero.sh review

# Check current engine status and RAM usage
./zero.sh status
```

---

## 8. Performance & Memory Tuning

Project-Zero comes pre-tuned for dual-core laptops (such as the Intel Core i5-4300U with 8 GB RAM). All runtime flags are configured in `ensureServerRunning()` inside `.obsidian/plugins/project-zero/main.js` and `config.env`:

| Flag | Default Value | Purpose |
| :--- | :--- | :--- |
| `-c` | `1536` | Context window size in tokens (balances codebase context and low RAM). |
| `-t` / `-tb` | `2` / `2` | Pins generation and batch threads to physical CPU cores to prevent thermal throttling. |
| `-b` / `-ub` | `256` / `128` | Optimizes prompt ingestion batch sizes for dual-core CPU caches. |
| `-fa` | `on` | Enables CPU Flash Attention to reduce memory bandwidth overhead. |
| `-ctk` / `-ctv` | `q4_0` / `q4_0` | Compresses K and V cache tensors to 4-bit, cutting KV memory footprint by ~60%. |
| `--poll` | `0` | Disables busy-wait thread spinlocks between tokens, dramatically reducing CPU spikes. |

### Adjusting for Higher-End Hardware
If you are running on a machine with 4+ physical cores and 16 GB+ RAM, you can increase `-t 4 -tb 4` and `-c 4096` in `.obsidian/plugins/project-zero/main.js` and `config.env` for faster prompt ingestion and larger context windows.

---

## 9. Troubleshooting

### "Server startup timed out after 30 seconds"
1. Verify that `bin/llama-server` (or `bin/llama-server.exe` on Windows) exists and has execute permissions (`chmod +x bin/llama-server`).
2. Verify that at least one `.gguf` file exists in the `models/` directory.
3. Test the binary directly in a terminal to check for missing system libraries:
   ```bash
   ./bin/llama-server --version
   ```
   *(On Linux, if it reports `libllama.so: cannot open shared object file`, ensure `libllama.so` and `libggml*.so` are in the same `bin/` directory).*

### Port 8080 is Already in Use
If another local service uses port `8080`, update `this.serverPort = 8080;` in `.obsidian/plugins/project-zero/main.js` and `PORT=8080` in `config.env` to any free port (such as `8085`), then reload Obsidian (`Ctrl + R`).

### High RAM Usage When Not Prompting
Project-Zero automatically terminates `llama-server` after 45 seconds of inactivity. To release RAM immediately at any moment, click **`Free RAM`** in the top-right header of the Project-Zero panel or run the command **`Project-Zero Assistant: Stop Engine (Free RAM)`** from the Obsidian Command Palette (`Ctrl + P`).
