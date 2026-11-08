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
    this.sessions = [];
    this.activeSessionId = null;
    this.isDrawerOpen = false;
    this.isGenerating = false;
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

    // 1. Clean Top Header
    const header = container.createDiv({ cls: "brain-header" });
    const title = header.createDiv({ cls: "brain-title" });
    title.innerHTML = `<span>⚔️</span> <span>PROJECT-ZERO</span>`;

    this.statusPill = header.createDiv({ cls: "brain-status-pill standby" });
    this.statusPill.innerHTML = `<span class="brain-status-dot"></span> <span class="status-text">Standby</span>`;

    // 2. Collapsible Session Selector Bar
    const sessionBar = container.createDiv({ cls: "brain-session-bar" });
    this.sessionTitleBtn = sessionBar.createEl("button", { cls: "brain-session-btn" });
    this.sessionTitleBtn.onclick = () => this.toggleSessionDrawer();

    const newSessionBtn = sessionBar.createEl("button", { cls: "brain-session-new-btn", text: "+ New" });
    newSessionBtn.onclick = () => this.createNewSession();

    // 3. Collapsible Session Drawer
    this.sessionDrawerEl = container.createDiv({ cls: "brain-session-drawer" });

    // 4. Streamlined Mode Switcher (2 Tabs Only)
    const modeTabs = container.createDiv({ cls: "brain-mode-toggle" });
    this.workTab = modeTabs.createEl("button", {
      cls: "brain-mode-tab active work",
      text: "💻 Engineering"
    });
    this.studyTab = modeTabs.createEl("button", {
      cls: "brain-mode-tab",
      text: "📚 Course Study"
    });

    this.workTab.onclick = () => this.setMode("work");
    this.studyTab.onclick = () => this.setMode("study");

    // 5. Spacious Chat List
    this.chatList = container.createDiv({ cls: "brain-chat-list" });

    // 6. Minimalist Input Bar
    const inputArea = container.createDiv({ cls: "brain-input-container" });
    this.textarea = inputArea.createEl("textarea", {
      cls: "brain-textarea",
      attr: { placeholder: "Ask Project-Zero, audit code, or request a quiz... (Ctrl+Enter)" }
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

    // Load Sessions & Initialize
    await this.loadSessions();
    this.renderSessionBar();
    this.renderChatHistory();
  }

  async loadSessions() {
    const data = await this.plugin.loadData();
    if (data && data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
      this.sessions = data.sessions;
      this.activeSessionId = data.activeSessionId || this.sessions[0].id;
    } else {
      const initialSession = {
        id: "sess-" + Date.now(),
        title: "Session 1",
        mode: this.currentMode,
        messages: [],
        createdAt: new Date().toLocaleDateString()
      };
      this.sessions = [initialSession];
      this.activeSessionId = initialSession.id;
      await this.saveSessions();
    }
  }

  async saveSessions() {
    await this.plugin.saveData({
      sessions: this.sessions,
      activeSessionId: this.activeSessionId
    });
  }

  getActiveSession() {
    let sess = this.sessions.find(s => s.id === this.activeSessionId);
    if (!sess) {
      sess = this.sessions[0];
      if (sess) this.activeSessionId = sess.id;
    }
    return sess;
  }

  renderSessionBar() {
    const active = this.getActiveSession();
    const titleText = active ? active.title : "Sessions";
    this.sessionTitleBtn.innerHTML = `<span>💬</span> <span class="brain-session-name">${titleText}</span> <span class="brain-caret">${this.isDrawerOpen ? '▴' : '▾'}</span>`;
  }

  renderSessionDrawer() {
    this.sessionDrawerEl.empty();
    const list = this.sessionDrawerEl.createDiv({ cls: "brain-session-list" });

    for (const sess of this.sessions) {
      const item = list.createDiv({ cls: `brain-session-item ${sess.id === this.activeSessionId ? 'active' : ''}` });
      const info = item.createDiv({ cls: "brain-session-info" });
      info.innerHTML = `<span class="brain-session-item-title">${sess.title}</span> <span class="brain-session-item-date">${sess.createdAt || ''}</span>`;
      info.onclick = () => {
        this.switchSession(sess.id);
        this.toggleSessionDrawer(false);
      };

      if (this.sessions.length > 1) {
        const delBtn = item.createSpan({ cls: "brain-session-del", text: "✕" });
        delBtn.onclick = (e) => {
          e.stopPropagation();
          this.deleteSession(sess.id);
        };
      }
    }
  }

  toggleSessionDrawer(open) {
    this.isDrawerOpen = typeof open === 'boolean' ? open : !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      this.renderSessionDrawer();
      this.sessionDrawerEl.addClass("open");
    } else {
      this.sessionDrawerEl.removeClass("open");
    }
    this.renderSessionBar();
  }

  async switchSession(id) {
    this.activeSessionId = id;
    const sess = this.getActiveSession();
    if (sess) {
      this.currentMode = sess.mode || "work";
      if (this.currentMode === "work") {
        this.workTab.className = "brain-mode-tab active work";
        this.studyTab.className = "brain-mode-tab";
      } else {
        this.workTab.className = "brain-mode-tab";
        this.studyTab.className = "brain-mode-tab active study";
      }
      this.renderChatHistory();
      await this.saveSessions();
      this.renderSessionBar();
    }
  }

  async createNewSession() {
    const newSess = {
      id: "sess-" + Date.now(),
      title: `Session ${this.sessions.length + 1}`,
      mode: this.currentMode,
      messages: [],
      createdAt: new Date().toLocaleDateString()
    };
    this.sessions.unshift(newSess);
    this.activeSessionId = newSess.id;
    this.renderChatHistory();
    await this.saveSessions();
    this.renderSessionBar();
    this.toggleSessionDrawer(false);
    new Notice("Started new chat session");
  }

  async deleteSession(id) {
    this.sessions = this.sessions.filter(s => s.id !== id);
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions[0]?.id;
    }
    this.renderSessionDrawer();
    this.renderSessionBar();
    this.renderChatHistory();
    await this.saveSessions();
  }

  renderChatHistory() {
    this.chatList.empty();
    const sess = this.getActiveSession();
    if (!sess || !sess.messages || sess.messages.length === 0) {
      this.addWelcomeMessage();
      return;
    }
    for (const msg of sess.messages) {
      this.appendMessage(msg.role, msg.content);
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    const sess = this.getActiveSession();
    if (sess) {
      sess.mode = mode;
      this.saveSessions();
    }
    if (mode === "work") {
      this.workTab.className = "brain-mode-tab active work";
      this.studyTab.className = "brain-mode-tab";
    } else {
      this.workTab.className = "brain-mode-tab";
      this.studyTab.className = "brain-mode-tab active study";
    }
    new Notice(`Mode: ${mode === 'work' ? 'Engineering Mode' : 'Course Study Mode'}`);
  }

  addWelcomeMessage() {
    const welcome = this.currentMode === "work"
      ? "### 💻 Technical Engineering Mode\nSpecialized in code audits, systems architecture, and memory efficiency. Prompt about any project (e.g. *Project-Zero*, *StudyDezk*, *TrashSortAI*)."
      : "### 📚 Course Study Mode\nDedicated to coursework and exam prep. Prompt about any course (e.g. *CS-Algorithms*, *System-Design*) to generate quizzes or concept breakdowns.";
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
      const folder = this.currentMode === "study" ? "Study/Quick-Notes" : "Suggestions";
      const filename = `${folder}/${date}-${time}.md`;

      const header = `# Project-Zero Note\n*Mode: ${this.currentMode.toUpperCase()} | ${new Date().toLocaleString()}*\n\n`;
      await this.plugin.app.vault.create(filename, header + text);
      new Notice(`Note saved: ${filename}`);
    } catch (e) {
      new Notice(`Failed to save note: ${e.message}`);
    }
  }

  async findRelevantContext(text) {
    const lower = text.toLowerCase();
    try {
      const files = this.plugin.app.vault.getFiles();

      // Check for Project-Zero self review (truncated to first 90 lines to prevent prompt bloat)
      if (lower.includes("project-zero") || lower.includes("project zero") || lower.includes("own folder") || lower.includes("this project") || lower.includes("itself")) {
        const pzFile = this.plugin.app.vault.getAbstractFileByPath("Projects/Project-Zero.md");
        if (pzFile) {
          const raw = await this.plugin.app.vault.read(pzFile);
          const truncated = raw.split("\n").slice(0, 85).join("\n");
          return `[Technical Architecture Profile of Project-Zero]:\n${truncated}\n\n`;
        }
      }

      // Check projects
      const projectFiles = files.filter(f => f.path.startsWith("Projects/") && f.extension === "md" && f.name !== "README.md");
      for (const pf of projectFiles) {
        if (lower.includes(pf.basename.toLowerCase())) {
          const raw = await this.plugin.app.vault.read(pf);
          const truncated = raw.split("\n").slice(0, 85).join("\n");
          return `[Context for Codebase ${pf.basename}]:\n${truncated}\n\n`;
        }
      }

      // Check courses
      const syllabusFiles = files.filter(f => f.path.startsWith("Study/Courses/") && f.name === "Syllabus.md");
      for (const sf of syllabusFiles) {
        const courseName = sf.path.split("/")[2];
        if (lower.includes(courseName.toLowerCase())) {
          return `[Course Syllabus for ${courseName}]:\n${await this.plugin.app.vault.read(sf)}\n\n`;
        }
      }
    } catch (e) {
      console.warn("Context search error", e);
    }
    return "";
  }

  async handleSend() {
    const text = this.textarea.value.trim();
    if (!text || this.isGenerating) return;

    this.textarea.value = "";
    this.appendMessage("user", text);
    this.isGenerating = true;
    this.sendBtn.disabled = true;

    const sess = this.getActiveSession();
    if (sess) {
      sess.messages.push({ role: "user", content: text });
      if (sess.title.startsWith("Session ")) {
        sess.title = text.length > 26 ? text.slice(0, 23).trim() + "..." : text;
        this.renderSessionBar();
      }
      await this.saveSessions();
    }

    // Smart context detection (bounded context size)
    const detectedContext = await this.findRelevantContext(text);
    const contextPrompt = detectedContext ? `${detectedContext}[User Technical Request]:\n${text}` : text;

    const assistantMsg = this.chatList.createDiv({ cls: "brain-msg assistant" });
    const header = assistantMsg.createDiv({ cls: "brain-msg-header" });
    header.textContent = `PROJECT-ZERO (${this.currentMode.toUpperCase()})`;
    const contentEl = assistantMsg.createDiv({ cls: "brain-msg-content" });

    // Minimalist Loading Wave Animation
    const loadingEl = contentEl.createDiv({ cls: "brain-loading-indicator" });
    loadingEl.innerHTML = `
      <div class="brain-wave-dots">
        <span class="brain-wave-dot"></span>
        <span class="brain-wave-dot"></span>
        <span class="brain-wave-dot"></span>
      </div>
      <span class="brain-loading-label">Project-Zero is analyzing...</span>
    `;
    this.chatList.scrollTop = this.chatList.scrollHeight;

    let fullResponse = "";
    let hasStartedStreaming = false;
    let lastRenderTime = 0;
    let renderTimer = null;

    // High performance throttled DOM updater: saves 90% CPU overhead
    const updateDisplay = (isDone = false) => {
      const now = Date.now();
      if (isDone || now - lastRenderTime > 250) {
        lastRenderTime = now;
        contentEl.empty();
        MarkdownRenderer.render(this.plugin.app, fullResponse, contentEl, "/", this);
        this.chatList.scrollTop = this.chatList.scrollHeight;
      } else if (!renderTimer) {
        renderTimer = setTimeout(() => {
          renderTimer = null;
          updateDisplay(false);
        }, 250);
      }
    };

    try {
      await this.plugin.ensureServerRunning((status) => {
        const lbl = loadingEl.querySelector(".brain-loading-label");
        if (lbl) lbl.textContent = status;
      });

      const systemPrompt = this.currentMode === "work"
        ? `You are Project-Zero, a software systems architect and code auditor on a dual-core i5 ThinkPad.
CRITICAL RULES:
- Never give generic agile or management fluff.
- Be concise, direct, and technically rigorous. Provide concrete code, architecture analysis, and memory/performance solutions in clean GitHub markdown.`
        : `You are Project-Zero, a computer science tutor. Explain algorithms and system design with direct, concise examples and challenging practice problems.`;

      // Compact conversation history (last 2 messages only) to keep prompt evaluation sub-second
      const recentHistory = sess ? sess.messages.slice(-3, -1) : [];

      const messages = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: contextPrompt }
      ];

      await this.plugin.generateCompletion(messages, (chunk) => {
        if (!hasStartedStreaming) {
          hasStartedStreaming = true;
          loadingEl.remove();
        }
        fullResponse += chunk;
        updateDisplay(false);
      });

      if (renderTimer) clearTimeout(renderTimer);
      updateDisplay(true);

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

      if (sess) {
        sess.messages.push({ role: "assistant", content: fullResponse });
        await this.saveSessions();
      }

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
      "-tb", "3",
      "-np", "1",
      "-b", "256",
      "-ub", "128",
      "-fa", "on",
      "-ctk", "q8_0",
      "-ctv", "q8_0",
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
        temperature: 0.2,
        max_tokens: 800,
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
