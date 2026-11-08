const { Plugin, ItemView, MarkdownRenderer, Notice } = require("obsidian");

const BRAIN_VIEW_TYPE = "project-zero-view";

function copyToClipboard(text) {
  try {
    const { clipboard } = window.require("electron");
    if (clipboard && clipboard.writeText) {
      clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fallback to Web API
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

class BrainAssistantView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.currentMode = "work"; // 'work' or 'study'
    this.chatHistory = [];
    this.isGenerating = false;
    this.selectedContext = "";
  }

  getViewType() {
    return BRAIN_VIEW_TYPE;
  }

  getDisplayText() {
    return "Project-Zero";
  }

  getIcon() {
    return "brain";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("brain-view-container");

    // 1. Compact Header HUD
    const header = container.createDiv({ cls: "brain-header" });
    const title = header.createDiv({ cls: "brain-title" });
    title.innerHTML = `<span>⚔️</span> <span>PROJECT-ZERO</span>`;

    this.statusPill = header.createDiv({ cls: "brain-status-pill standby" });
    this.statusPill.innerHTML = `<span class="brain-status-dot"></span> <span class="status-text">Standby</span>`;

    // 2. Streamlined Controls Row
    const controlsRow = container.createDiv({ cls: "brain-controls-row" });
    const modeTabs = controlsRow.createDiv({ cls: "brain-mode-toggle" });

    this.workTab = modeTabs.createEl("button", {
      cls: "brain-mode-tab active work",
      text: "💻 Projects"
    });
    this.studyTab = modeTabs.createEl("button", {
      cls: "brain-mode-tab",
      text: "📚 Courses"
    });

    this.workTab.onclick = () => this.setMode("work");
    this.studyTab.onclick = () => this.setMode("study");

    this.contextSelect = controlsRow.createEl("select", { cls: "brain-context-select" });
    this.contextSelect.onchange = () => {
      this.selectedContext = this.contextSelect.value;
      new Notice(`Context: ${this.selectedContext || 'All'}`);
    };
    await this.populateContextDropdown();

    // 3. High-Yield Action Chips
    this.quickActions = container.createDiv({ cls: "brain-quick-actions" });
    this.renderQuickActions();

    // 4. Chat Message List (Full User-Selectable Text)
    this.chatList = container.createDiv({ cls: "brain-chat-list" });
    this.addWelcomeMessage();

    // 5. Clean Input Bar
    const inputArea = container.createDiv({ cls: "brain-input-container" });
    this.textarea = inputArea.createEl("textarea", {
      cls: "brain-textarea",
      attr: { placeholder: "Ask Project-Zero, audit architecture, or request a course quiz... (Ctrl+Enter)" }
    });

    this.textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.stopBtn = inputArea.createEl("button", {
      cls: "brain-btn-stop-subtle",
      text: "⏹ Stop"
    });
    this.stopBtn.onclick = () => this.plugin.stopServer();

    this.sendBtn = inputArea.createEl("button", {
      cls: "brain-btn-send",
      text: "Send"
    });
    this.sendBtn.onclick = () => this.handleSend();

    this.plugin.onServerStatusChange = (status, text) => {
      this.updateStatus(status, text);
    };
  }

  async populateContextDropdown() {
    this.contextSelect.empty();

    if (this.currentMode === "work") {
      this.contextSelect.createEl("option", { text: "📁 All Codebases", value: "" });
      try {
        const files = this.plugin.app.vault.getFiles();
        const projectFiles = files.filter(f => f.path.startsWith("Projects/") && f.extension === "md" && f.name !== "README.md");
        for (const pf of projectFiles) {
          this.contextSelect.createEl("option", { text: pf.basename, value: pf.basename });
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    } else {
      this.contextSelect.createEl("option", { text: "📖 Select a Course", value: "" });
      try {
        const files = this.plugin.app.vault.getFiles();
        const syllabusFiles = files.filter(f => f.path.startsWith("Study/Courses/") && f.name === "Syllabus.md");
        for (const sf of syllabusFiles) {
          const courseFolder = sf.path.split("/")[2];
          this.contextSelect.createEl("option", { text: courseFolder, value: courseFolder });
        }
      } catch (e) {
        console.error("Failed to load courses", e);
      }
    }
    this.selectedContext = this.contextSelect.value;
  }

  async setMode(mode) {
    this.currentMode = mode;
    if (mode === "work") {
      this.workTab.className = "brain-mode-tab active work";
      this.studyTab.className = "brain-mode-tab";
    } else {
      this.workTab.className = "brain-mode-tab";
      this.studyTab.className = "brain-mode-tab active study";
    }
    await this.populateContextDropdown();
    this.renderQuickActions();
    new Notice(`Mode: ${mode === 'work' ? 'Project Engineering Mode' : 'Course Study Mode'}`);
  }

  renderQuickActions() {
    this.quickActions.empty();
    if (this.currentMode === "work") {
      this.createSyncPill("⚡ Sync Code");
      this.createActionPill("📋 Technical Review", () => {
        const target = this.selectedContext ? `for ${this.selectedContext}` : "for Project-Zero";
        return `Perform a deep technical architectural review ${target}. Analyze code implementation, memory & CPU efficiency, potential bottlenecks, and concrete technical improvements. Do not give generic project management advice.`;
      });
      this.createActionPill("🔍 Bug & Edge-Case Audit", () => {
        const target = this.selectedContext ? `in ${this.selectedContext}` : "in active codebases";
        return `Audit implementation details and flag specific edge cases, unhandled exceptions, and performance leaks ${target}.`;
      });
    } else {
      this.createActionPill("🎯 3-Q Quiz", () => {
        const target = this.selectedContext ? `on ${this.selectedContext}` : "on current course syllabus";
        return `Generate an interactive 3-question multiple-choice quiz ${target} with hidden answers at the bottom.`;
      });
      this.createActionPill("📖 Explain Concept", () => {
        const target = this.selectedContext ? `for ${this.selectedContext}` : "";
        return `Explain a core theoretical or algorithmic concept ${target} with concrete code snippets.`;
      });
      this.createActionPill("⚡ Flashcards", () => {
        const target = this.selectedContext ? `for ${this.selectedContext}` : "";
        return `Create a high-yield flashcard set of key exam definitions ${target}.`;
      });
    }
  }

  createActionPill(label, promptGenerator) {
    const pill = this.quickActions.createEl("button", {
      cls: "brain-action-pill",
      text: label
    });
    pill.onclick = () => {
      this.textarea.value = typeof promptGenerator === "function" ? promptGenerator() : promptGenerator;
      this.handleSend();
    };
  }

  createSyncPill(label) {
    const pill = this.quickActions.createEl("button", {
      cls: "brain-action-pill sync-btn",
      text: label
    });
    pill.onclick = async () => {
      new Notice("Running Project & GitHub Monitor scan...");
      const { exec } = window.require("child_process");
      const vaultPath = this.plugin.app.vault.adapter.basePath;
      const scriptPath = `${vaultPath}/bin/monitor.py`;

      this.updateStatus("starting", "Scanning...");
      exec(`python3 "${scriptPath}"`, async (err, stdout) => {
        if (err) {
          new Notice(`Scan notice: ${err.message}`);
        } else {
          new Notice("Project scan complete! Updated Projects/ and Suggestions/.");
        }
        this.updateStatus("standby", "Standby");
        await this.populateContextDropdown();
        this.appendMessage("assistant", "### ⚡ Project Monitor Sync Completed\n\n```\n" + (stdout || "Scan complete - vault notes updated.") + "\n```");
      });
    };
  }

  addWelcomeMessage() {
    const welcome = this.currentMode === "work"
      ? "### 💻 Technical Engineering Mode\nSpecialized in code audits, systems architecture, and memory efficiency. Select a codebase above or ask a technical question."
      : "### 📚 Course Study Mode\nDedicated to coursework and exam prep. Select a course above to generate quizzes, concept breakdowns, or flashcards.";
    this.appendMessage("assistant", welcome);
  }

  updateStatus(status, text) {
    if (!this.statusPill) return;
    this.statusPill.className = `brain-status-pill ${status}`;
    const textEl = this.statusPill.querySelector(".status-text");
    if (textEl) textEl.textContent = text;
    if (this.plugin.statusBarItem) {
      this.plugin.statusBarItem.setText(`🧠 Project-Zero: ${text}`);
    }

    if (this.stopBtn) {
      if (status === "active" || status === "starting") {
        this.stopBtn.addClass("visible");
      } else {
        this.stopBtn.removeClass("visible");
      }
    }
  }

  appendMessage(role, text) {
    const msg = this.chatList.createDiv({ cls: `brain-msg ${role}` });
    const header = msg.createDiv({ cls: "brain-msg-header" });
    header.textContent = role === "user" ? "YOU" : `PROJECT-ZERO (${this.currentMode.toUpperCase()})`;

    const content = msg.createDiv({ cls: "brain-msg-content" });

    if (role === "assistant") {
      MarkdownRenderer.render(this.plugin.app, text, content, "/", this);
      const actions = msg.createDiv({ cls: "brain-msg-actions" });

      const copyBtn = actions.createEl("button", { cls: "brain-btn-mini", text: "📋 Copy Text" });
      copyBtn.onclick = () => {
        copyToClipboard(text);
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => { copyBtn.textContent = "📋 Copy Text"; }, 2000);
        new Notice("Copied to clipboard!");
      };

      const saveBtn = actions.createEl("button", { cls: "brain-btn-mini", text: "💾 Save Note" });
      saveBtn.onclick = async () => {
        await this.saveMessageToVault(text);
      };
    } else {
      content.textContent = text;
    }

    this.chatList.scrollTop = this.chatList.scrollHeight;
    return content;
  }

  async saveMessageToVault(text) {
    try {
      const date = new Date().toISOString().split("T")[0];
      const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      let filename = "";

      if (this.currentMode === "study" && this.selectedContext) {
        const subfolder = text.toLowerCase().includes("quiz") ? "Quizzes" : "Notes";
        filename = `Study/Courses/${this.selectedContext}/${subfolder}/${date}-${time}.md`;
      } else if (this.currentMode === "study") {
        filename = `Study/Quick-Notes/${date}-${time}.md`;
      } else {
        const projPrefix = this.selectedContext ? `${this.selectedContext}-` : "";
        filename = `Suggestions/${projPrefix}${date}-${time}.md`;
      }

      const header = `# Project-Zero Note\n*Mode: ${this.currentMode.toUpperCase()} | Target: ${this.selectedContext || 'General'} | ${new Date().toLocaleString()}*\n\n`;
      await this.plugin.app.vault.create(filename, header + text);
      new Notice(`Note created: ${filename}`);
    } catch (e) {
      new Notice(`Failed to save note: ${e.message}`);
    }
  }

  async handleSend() {
    const text = this.textarea.value.trim();
    if (!text || this.isGenerating) return;

    this.textarea.value = "";
    this.appendMessage("user", text);
    this.isGenerating = true;
    this.sendBtn.disabled = true;

    // Check if prompt references Project-Zero or if a project is selected
    let targetProject = this.selectedContext;
    const lower = text.toLowerCase();
    if (!targetProject && (lower.includes("project-zero") || lower.includes("project zero") || lower.includes("own folder") || lower.includes("this project") || lower.includes("itself"))) {
      targetProject = "Project-Zero";
    }

    let contextPrompt = text;
    if (this.currentMode === "work" && targetProject) {
      try {
        const file = this.plugin.app.vault.getAbstractFileByPath(`Projects/${targetProject}.md`);
        if (file) {
          const content = await this.plugin.app.vault.read(file);
          contextPrompt = `[Technical Architecture Profile of ${targetProject}]:\n${content}\n\n[User Technical Request]:\n${text}`;
        }
      } catch (e) {
        console.warn("Could not read project file", e);
      }
    } else if (this.currentMode === "study" && this.selectedContext) {
      try {
        const file = this.plugin.app.vault.getAbstractFileByPath(`Study/Courses/${this.selectedContext}/Syllabus.md`);
        if (file) {
          const content = await this.plugin.app.vault.read(file);
          contextPrompt = `[Course Syllabus for ${this.selectedContext}]:\n${content}\n\n[Study Request]:\n${text}`;
        }
      } catch (e) {
        console.warn("Could not read syllabus file", e);
      }
    }

    const assistantMsg = this.chatList.createDiv({ cls: "brain-msg assistant" });
    const header = assistantMsg.createDiv({ cls: "brain-msg-header" });
    header.textContent = `PROJECT-ZERO (${this.currentMode.toUpperCase()})`;
    const contentEl = assistantMsg.createDiv({ cls: "brain-msg-content" });
    contentEl.textContent = "Starting engine...";

    let fullResponse = "";

    try {
      await this.plugin.ensureServerRunning((status) => {
        contentEl.textContent = status;
      });

      contentEl.textContent = "";

      const systemPrompt = this.currentMode === "work"
        ? `You are Project-Zero, an expert software systems architect, code auditor, and performance engineer running locally on an Intel i5 CPU with 8GB RAM.
CRITICAL RULES:
- NEVER give generic project management, agile, or corporate advice (e.g. "define goals", "set milestones", "daily standups", "improve communication").
- ALWAYS provide deep, concrete technical analysis: examine code architecture, memory footprint, CPU thread utilization, algorithms, edge cases, error handling, and file-level implementation suggestions.
- When reviewing Project-Zero, analyze its real offline stack: llama.cpp llama-server (AVX2, -t 2, -c 2048, --mmap), memory ceiling, Obsidian plugin lifecycle, bin/monitor.py read-only security barriers, and token streaming performance.`
        : `You are Project-Zero, an academic computer science tutor helping the user master coursework and prepare for technical exams. Explain algorithms, data structures, and system design with concrete code examples, and generate challenging practice problems. Format in clean GitHub markdown.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...this.chatHistory.slice(-4),
        { role: "user", content: contextPrompt }
      ];

      await this.plugin.generateCompletion(messages, (chunk) => {
        fullResponse += chunk;
        contentEl.empty();
        MarkdownRenderer.render(this.plugin.app, fullResponse, contentEl, "/", this);
        this.chatList.scrollTop = this.chatList.scrollHeight;
      });

      const actions = assistantMsg.createDiv({ cls: "brain-msg-actions" });
      const copyBtn = actions.createEl("button", { cls: "brain-btn-mini", text: "📋 Copy Text" });
      copyBtn.onclick = () => {
        copyToClipboard(fullResponse);
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => { copyBtn.textContent = "📋 Copy Text"; }, 2000);
        new Notice("Copied to clipboard!");
      };

      const saveBtn = actions.createEl("button", { cls: "brain-btn-mini", text: "💾 Save Note" });
      saveBtn.onclick = async () => {
        await this.saveMessageToVault(fullResponse);
      };

      this.chatHistory.push({ role: "user", content: text });
      this.chatHistory.push({ role: "assistant", content: fullResponse });

      this.plugin.resetIdleTimer();

    } catch (err) {
      contentEl.textContent = `[Error: ${err.message}]`;
    } finally {
      this.isGenerating = false;
      this.sendBtn.disabled = false;
    }
  }
}

class BrainPlugin extends Plugin {
  async onload() {
    this.serverProcess = null;
    this.idleTimer = null;
    this.serverPort = 8080;
    this.onServerStatusChange = null;

    this.registerView(BRAIN_VIEW_TYPE, (leaf) => new BrainAssistantView(leaf, this));

    this.addRibbonIcon("brain", "Project-Zero Cockpit", () => {
      this.activateView(false);
    });

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText("🧠 Project-Zero: Standby");
    this.statusBarItem.addClass("mod-clickable");
    this.statusBarItem.onclick = () => this.activateView(false);

    this.addCommand({
      id: "open-brain-sidebar",
      name: "Open Project-Zero in Sidebar",
      callback: () => this.activateView(false)
    });

    this.addCommand({
      id: "open-brain-tab",
      name: "Open Project-Zero in Main Tab",
      callback: () => this.activateView(true)
    });

    this.addCommand({
      id: "stop-brain-engine",
      name: "Stop Engine (Free RAM)",
      callback: () => this.stopServer()
    });

    this.app.workspace.onLayoutReady(() => {
      this.activateView(false);
    });
  }

  async onunload() {
    this.stopServer();
  }

  async activateView(inMainTab = false) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(BRAIN_VIEW_TYPE)[0];

    if (!leaf) {
      if (inMainTab) {
        leaf = workspace.getLeaf(true);
      } else {
        leaf = workspace.getRightLeaf(false);
      }
      await leaf.setViewState({ type: BRAIN_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async checkServerHealth() {
    try {
      const res = await fetch(`http://127.0.0.1:${this.serverPort}/health`, { signal: AbortSignal.timeout(1000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async ensureServerRunning(onProgress) {
    if (await this.checkServerHealth()) {
      if (this.onServerStatusChange) this.onServerStatusChange("active", "Active");
      return;
    }

    if (this.onServerStatusChange) this.onServerStatusChange("starting", "Starting...");
    if (onProgress) onProgress("Starting engine on CPU (~6-8s)...");

    const { spawn } = window.require("child_process");
    const vaultPath = this.app.vault.adapter.basePath;
    const binPath = `${vaultPath}/bin/llama-server`;
    const modelPath = `${vaultPath}/models/qwen2.5-3b-instruct-q4_k_m.gguf`;

    this.serverProcess = spawn(binPath, [
      "-m", modelPath,
      "-c", "2048",
      "-t", "2",
      "-np", "1",
      "--host", "127.0.0.1",
      "--port", `${this.serverPort}`
    ], {
      detached: true,
      stdio: "ignore"
    });

    this.serverProcess.unref();

    const startTime = Date.now();
    while (Date.now() - startTime < 30000) {
      await new Promise((r) => setTimeout(r, 600));
      if (await this.checkServerHealth()) {
        if (this.onServerStatusChange) this.onServerStatusChange("active", "Active");
        return;
      }
    }

    throw new Error("Server startup timed out after 30 seconds.");
  }

  stopServer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    try {
      const { exec } = window.require("child_process");
      exec("pkill -f llama-server");
    } catch (e) {
      console.error("Error stopping server:", e);
    }

    this.serverProcess = null;
    if (this.onServerStatusChange) this.onServerStatusChange("standby", "Standby");
    new Notice("Project-Zero Engine stopped. RAM released.");
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.stopServer();
    }, 90000);
  }

  async generateCompletion(messages, onChunk) {
    const res = await fetch(`http://127.0.0.1:${this.serverPort}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        temperature: 0.25,
        max_tokens: 500,
        stream: true
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              if (onChunk) onChunk(delta);
            }
          } catch {
            // Partial JSON
          }
        }
      }
    }

    return fullText;
  }
}

module.exports = BrainPlugin;
