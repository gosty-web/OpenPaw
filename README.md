# 🐾 OpenPaw - Local-First AI Agent Orchestration

OpenPaw is a premium, local-first platform for building, managing, and orchestrating sovereign AI agents. It transforms "AI services" into "AI sovereignty" by giving you full control over your agents' memories, personality files, and tool access.

Built with **React 18**, **Vite**, **TypeScript**, and **SQLite**, OpenPaw is designed for developers who want a high-performance, aesthetically pleasing (Linear + Vercel inspired), and private environment for their AI agents.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Optional: ElevenLabs API Key (for Voice), Groq/Anthropic/OpenAI keys (for Intelligence)

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/your-repo/openpaw.git
cd openpaw

# Install dependencies (Root, Client, and Server)
npm install
cd client && npm install
cd ../server && npm install

# Create environment file
cp .env.example .env
```

### 3. Launch
```bash
# From the root directory
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:7411](http://localhost:7411)

---

## ✨ Core Features

### 🧠 Agent Sovereignty
Every agent in OpenPaw is defined by a collection of Markdown "soul files".
- **IDENTITY.md**: Permanent facts and characteristics.
- **SOUL.md**: The core personality and behavioral drivers.
- **MEMORY.md**: Long-term tiered memory (Hot, Episodic, Semantic).
- **USER.md**: The agent's evolving model of you.

### 🛠️ Extensible Tooling
- **MCP (Model Context Protocol)**: Connect to GitHub, Google Drive, or local filesystems via standardized transport layers (stdio, SSE, HTTP).
- **Skills**: Native capabilities like Web Search (Brave, Google, DuckDuckGo) and Browser Automation (Puppeteer).
- **Voice Engine**: Real-time STT (Groq) and TTS (ElevenLabs) integration.

### 🌐 Omni-Channel Orchestration
Bridge your agents to the real world:
- **Telegram & Discord**: Interactive bots with slash commands.
- **Slack**: Workspace integration with thread support.
- **WhatsApp**: Local session pairing via QR code.

### 📊 Monitoring & Workspaces
- **Instances**: Real-time monitoring of active sessions and logs.
- **Workspaces**: Hierarchical organization (Org > Team > Project) with task bidding systems.
- **Cron Jobs**: Scheduled agent tasks for autonomous operations.

---

## 📂 Project Structure

```bash
OpenPaw/
├── client/             # Vite + React Frontend
│   └── src/
│       ├── components/ # Shared UI components
│       ├── lib/        # API client & internal logic
│       └── pages/      # 16+ Premium styled pages
├── server/             # Node.js + TS + SQLite Backend
│   └── src/
│       ├── agents/     # Agent Engine & Soul management
│       ├── llm/        # Multi-provider routing (Anthropic, OpenAI, etc.)
│       ├── channels/   # External bridge implementations
│       └── db/         # SQLite schema & persistence
└── .agent/             # AI Development cortex
```

---

## ✅ What's Implemented

- [x] **Premium UI**: 16 dedicated pages with Linear/Vercel styling.
- [x] **Multi-Provider LLM**: Support for Anthropic, OpenAI, Gemini, and Ollama.
- [x] **Multi-Modal Engines**: Voice STT/TTS, Web Search, and Browser Automation.
- [x] **Memory System**: Three-tier memory persistence for agents.
- [x] **MCP Protocol**: Full client-side management of MCP nodes.
- [x] **Channel Bridges**: Telegram, WhatsApp, Discord, and Slack integrations.
- [x] **Task Orchestration**: Workspace task creation and bidding system.

## 🔜 Remaining / Roadmap

- [ ] **A2A (Agent-to-Agent) Peer Discovery**: Automated capability discovery between agents.
- [ ] **Advanced Task Planning**: Visual graph editor for complex multi-agent workflows.
- [ ] **Native Mobile App**: React Native bridge for mobile monitoring.
- [ ] **Local LLM Fine-tuning Interface**: One-click fine-tuning for Ollama models.

---

## 📄 License

MIT © 2026 OpenPaw Team
