# GEMINI.md - OpenPaw Project Instructions

This file contains persistent instructions, coding patterns, and architectural rules for the OpenPaw project. Antigravity MUST follow these rules to maintain consistency and prevent regressions.

## 🌟 Project Overview
OpenPaw is a local-first, agent-orchestration platform designed for high-autonomy AI agents. It uses a monorepo structure with a React frontend and a TypeScript/Express/SQLite backend.

## 🏗️ Architectural Patterns

### 1. Agent State & Files
- **MD-Based State**: Agents maintain their internal state through specific Markdown files: `SOUL.md`, `IDENTITY.md`, `MEMORY.md`, `GROWTH.md`, etc.
- **Atomic Operations**: When updating agent state, ensure these files are updated in the SQLite database (`files` table) and kept in sync with the agent's logic.
- **FileManager**: Use `AgentFileManager` for managing these core agent artifacts.

### 2. Database & Persistence
- **SQLite (Better-SQLite3)**: The primary data store is a local SQLite database located in the user's data directory.
- **Schema Management**: All schema changes MUST be reflected in `server/src/db/schema.ts` and managed via migrations in `server/src/db/migrations.ts`.
- **Primary Keys**: Always use `randomUUID()` or `uuid v11` for new record IDs.

### 3. Communication
- **Socket.io**: Real-time updates between server and client are handled via Socket.io.
- **Event-Driven**: Prefer emitting events for state changes (e.g., `agent:updated`, `message:new`) rather than relying solely on polling.

## 💻 Coding Standards

### Backend (server/)
- **TypeScript Strictness**: Use precise types for all data structures. Avoid `any`.
- **Modular Logic**: Keep `index.ts` manageable by delegating to specialized modules in `agents/`, `db/`, etc.
- **Async/Await**: Use modern async patterns with proper error handling (try/catch blocks).

### Frontend (client/)
- **React + Vite**: Use functional components and hooks.
- **State Management**: Use `zustand` for global app state (see `client/src/lib/store.ts`).
- **Styling**: Vanilla CSS + Tailwind. Prefer established utility classes.
- **Premium UI**: Follow the "UI/UX Excellence" persona guidelines for animations and transitions.

## ⚠️ "Don't Mess Up" Rules
1. **Never Break the Monorepo**: Keep `client` and `server` dependencies separate in their respective `package.json` files. Shared logic should be carefully managed if introduced.
2. **Schema Integrity**: Do not perform destructive DDL operations without a clear migration path. Always check `TABLE_COUNT` in `schema.ts`.
3. **Agent Consistency**: Ensure that an agent's `personality` and `role` are consistent across their database record and their `.md` state files.
4. **Local-First**: Always assume the application is running locally. Avoid hardcoding external URLs or unnecessary cloud dependencies.
5. **Atomic Messages**: When adding messages, ensure they are linked to the correct `agentId` and `sessionId`.

## 🛠️ Development Workflow
- **Setup**: `npm run setup` in the root.
- **Dev**: `npm run dev` in the root (runs both client and server via `concurrently`).
- **Build**: `npm run build` to build both targets.
