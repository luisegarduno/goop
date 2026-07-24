# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Project Overview

**goop** is an AI Coding Agent monorepo with Bun workspaces. Backend: Hono + Drizzle ORM + PostgreSQL + AI Provider APIs (Anthropic Claude & OpenAI GPT). Frontend: React 19 + Vite + TailwindCSS 4 + Zustand.

**Status:** Core functionality complete (Phases 1-6). Terminal-style UI with SSE streaming, multi-provider support, and comprehensive tool system (read, write, edit, grep, glob). Providers come in two kinds: API-key chat providers (`anthropic`, `openai`) and subscription-backed agent providers (`claude-code` via the Claude Agent SDK, `codex` via the Codex SDK) that bill the user's own Claude Pro/Max or ChatGPT plan through their CLI logins.

## Quick Start

**Setup:**
```bash
# Install dependencies
bun install

# Start PostgreSQL
docker-compose up -d

# Run migrations
cd packages/backend && bun run db:migrate

# Start backend (terminal 1)
cd packages/backend && bun run dev

# Start frontend (terminal 2)
cd packages/frontend && bun run dev
```

**Environment Variables** (`.env` in root):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/goop
ANTHROPIC_API_KEY=sk-ant-...   # optional when using the claude-code subscription provider
OPENAI_API_KEY=sk-...          # optional when using the codex subscription provider
HONO_BACKEND_PORT=3001
NODE_ENV=development
# Optional overrides:
# FRONTEND_ORIGIN=http://localhost:3000   (backend CORS origin)
# VITE_API_BASE=http://localhost:3001/api (frontend -> backend base URL)
# CLAUDE_CODE_OAUTH_TOKEN=...             (headless auth for claude-code provider)
```

**Subscription providers** need a one-time CLI login instead of API keys:
- `claude-code`: run `claude` → `/login` (Claude Pro/Max). Detection checks
  `CLAUDE_CODE_OAUTH_TOKEN`, `~/.claude/.credentials.json`, and `~/.claude.json`.
- `codex`: run `codex login` (ChatGPT Plus/Pro). Detection checks `$CODEX_HOME/auth.json`
  (default `~/.codex/auth.json`). The `codex` binary is bundled via `@openai/codex-sdk`.

## Common Commands

**Root:**
- `bun run dev` - Start all dev servers
- `bun run build` - Build all packages
- `bun run typecheck` - Type-check all packages

**Backend (`packages/backend`):**
- `bun run dev` - Dev server with hot reload
- `bun run db:generate` - Generate migrations from schema changes
- `bun run db:migrate` - Apply migrations to database
- `bun test` - Run tests

**Frontend (`packages/frontend`):**
- `bun run dev` - Vite dev server
- `bun run build` - Production build

## Architecture

### Backend File Structure
```
packages/backend/src/
├── api/routes.ts          # REST & SSE endpoints
├── config/
│   ├── index.ts           # Zod-validated config loader
│   └── schema.ts          # Message type schemas
├── db/
│   ├── schema.ts          # Drizzle ORM schema (3 tables)
│   ├── migrate.ts         # Migration runner
│   └── migrations/        # Generated SQL
├── providers/
│   ├── base.ts            # Chat Provider interface (API-key providers)
│   ├── anthropic.ts       # Claude integration (API key)
│   ├── openai.ts          # GPT integration (API key)
│   └── agent/             # Subscription-backed agent providers
│       ├── types.ts       # AgentProvider interface + AgentStreamEvent
│       ├── claude-code.ts # Claude Agent SDK wrapper (Claude Pro/Max)
│       ├── codex.ts       # Codex SDK wrapper (ChatGPT plans)
│       └── recap.ts       # Conversation recap for unresumable sessions
├── session/index.ts       # Conversation orchestration (chat + agent paths)
├── streaming/index.ts     # SSE event formatting
├── tools/
│   ├── base.ts            # Tool interface
│   ├── read.ts, write.ts, edit.ts, grep.ts, glob.ts
│   └── index.ts           # Tool registry
├── utils/
│   ├── security.ts        # Path validation
│   ├── validation.ts      # API key validation
│   └── agent-auth.ts      # CLI login detection for subscription providers
└── index.ts               # Hono server entry
```

### Frontend File Structure
```
packages/frontend/src/
├── api/client.ts          # Backend API calls
├── components/
│   ├── Terminal.tsx       # Message display
│   ├── InputBox.tsx       # User input
│   ├── SessionSwitcher.tsx # Session dropdown
│   ├── SetupModal.tsx     # Session creation
│   └── SettingsModal.tsx  # Provider/model settings
├── stores/session.ts      # Zustand store
└── App.tsx                # Root component (also handles SSE stream parsing)
```

### Database Schema

**PostgreSQL 17** via Docker. Three tables with UUID PKs and cascade deletes:

1. **sessions** - id, title, working_directory, provider, model, agent_session_id (native Claude Code session / Codex thread id for resume; null for API-key providers), timestamps
2. **messages** - id, session_id (FK), role (user|assistant), created_at
3. **message_parts** - id, message_id (FK), type (text|tool_use|tool_result), content (jsonb), order

**Files:**
- Schema: `packages/backend/src/db/schema.ts`
- Config: `packages/backend/drizzle.config.ts`
- Migrations: `packages/backend/src/db/migrations/`

## Key Patterns

### Environment Loading
All packages load `.env` from root:
```typescript
config({ path: "../../.env" });
```

### Database Migrations
```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration
cd packages/backend && bun run db:generate
# 3. Review SQL in src/db/migrations/
# 4. Apply
bun run db:migrate
```

### Provider System
Two provider kinds, both created via `createProvider()` in `src/providers/index.ts`:

**Chat providers** (`authType: "api_key"`) - goop runs the tool loop:
- Abstract `Provider` interface in `src/providers/base.ts`
- Async generator yields `StreamEvent` (text deltas, tool_use, completion)
- Anthropic: Static model list (current aliases, e.g. claude-opus-4-8)
- OpenAI: Dynamic model fetching from API

**Agent providers** (`authType: "subscription"`) - the runtime runs its own tool loop:
- `AgentProvider` interface in `src/providers/agent/types.ts`; `runTurn()` yields
  `AgentStreamEvent` (session id, text, tool_use, tool_result)
- `claude-code`: wraps `@anthropic-ai/claude-agent-sdk` `query()`. Restricted to
  goop's file tools (Read/Write/Edit/Grep/Glob, no Bash), `permissionMode: "dontAsk"`,
  `ANTHROPIC_API_KEY` stripped from the subprocess env so billing stays on the
  subscription. Models are CLI aliases (sonnet/opus/haiku).
- `codex`: wraps `@openai/codex-sdk` threads. `sandboxMode: "workspace-write"`,
  `approvalPolicy: "never"`, `OPENAI_API_KEY` stripped. Model "default" defers to
  the Codex CLI's configured default.
- Native sessions resume via `sessions.agent_session_id`; if resume fails (or the
  working directory changed, which clears the id), the turn falls back to a fresh
  session seeded with a recap built from stored history (`agent/recap.ts`).
- Event mappers (`ClaudeCodeEventMapper`, `CodexEventMapper`) are exported and
  unit-tested with synthetic SDK events.
- Per-session provider/model stored in database (both kinds)

### Tool System
- Tools implement `Tool<T>` with Zod schema, name, description, execute()
- Receive `ToolContext` with `workingDir` from session
- Security: Path validation prevents traversal attacks
- Register in `src/tools/index.ts`
- Current tools: `read_file`, `write_file`, `edit_file`, `grep`, `glob`

### Session Flow
1. User sends message → `POST /api/sessions/:id/messages`
2. Session manager loads history from DB
3. Provider streams response (text + tool calls)
4. Tools executed automatically with results fed back to provider
5. All message parts persisted to DB
6. SSE events: `message.start`, `message.delta`, `tool.start`, `tool.result`, `message.done`

For agent providers the flow is the same from the client's perspective, but steps 3-4
happen inside the agent runtime (`SessionManager.processAgentMessage`): goop mirrors the
runtime's events into the same SSE grammar and DB part shapes, stores the native
session/thread id for resume, and pre-checks CLI login (returning 400 with a login hint
when unauthenticated). Stream errors are surfaced as a `message.delta` with `⚠ ...`
before `message.done`.

### Frontend State
- Zustand store in `src/stores/session.ts`
- Manages: sessionId, workingDirectory, provider, model, messages, streaming state
- Persists to localStorage for page refresh
- SSE hook (`useSSE.ts`) updates store with streaming deltas
- No prop drilling - components use hooks

### API Endpoints (Backend)
**Core:**
- `GET /health` - Health check
- `POST /api/sessions` - Create session (body: title, workingDirectory, provider, model, apiKey?)
- `GET /api/sessions` - List sessions (ordered by updatedAt DESC)
- `GET /api/sessions/:id` - Get specific session
- `PATCH /api/sessions/:id` - Update settings
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/sessions/:id/messages` - Load message history
- `GET /api/sessions/:id/context` - Context-window usage breakdown (itemized System prompt/Tools/Messages/Free space via the Anthropic SDK `countTokens` endpoint). Returns `{ supported: false }` for non-`anthropic` providers.

**Streaming:**
- `POST /api/sessions/:id/messages` - Send message & stream response (SSE)

**Providers:**
- `GET /api/providers` - List available providers (includes `authType`: api_key | subscription)
- `GET /api/providers/:name/models` - Get model list
- `GET /api/providers/:name/status` - Auth status (env key present, or CLI login state for subscription providers)
- `GET /api/providers/:name/api-key` - Get masked API key from .env (subscription providers report none)
- `POST /api/providers/validate` - Validate API key (api_key providers only)

## Development Notes

### Adding a Provider
1. Create `src/providers/{name}.ts` implementing `Provider` interface
2. Register in `src/providers/index.ts`
3. Add API key validation in `src/config/index.ts`

### Adding a Tool
1. Create `src/tools/{name}.ts` with Zod schema and `Tool` implementation
2. Register in `src/tools/index.ts` array
3. Tools auto-available to all providers

### Security Considerations
- All file tools validate paths against `workingDir` (session-scoped)
- API keys validated but NOT stored in DB
- Zod schema validation on all inputs
- CORS restricted to frontend origin (`FRONTEND_ORIGIN` overridable)
- Subscription providers never handle credentials: goop only detects existing CLI
  logins on the local machine and delegates auth to the official SDKs. Per
  Anthropic's terms, do not host goop as a multi-user service on subscription
  auth - claude.ai login may not be offered to a product's end users; use API keys
  for anything beyond personal use.

### Session Lifecycle
- SetupModal on first load → create session with title, workingDir, provider, model
- Settings modal allows updating provider/model/workingDir mid-conversation
- Changing providers clears message history (compatibility)
- Session data in localStorage + PostgreSQL
- SessionSwitcher dropdown to navigate between sessions

## Troubleshooting

**Database:**
- Check PostgreSQL: `docker-compose ps`
- Verify migrations: `psql $DATABASE_URL -c "\dt"`

**Backend:**
- API key set: `echo $ANTHROPIC_API_KEY`
- Port available: `lsof -i :3001`
- TypeScript errors: `bun run typecheck`

**Frontend:**
- Backend running on 3001
- Use `localhost:3000` not `127.0.0.1` (CORS)
- Check DevTools Network tab for SSE connection

**Streaming:**
- Look for `text/event-stream` Content-Type
- Check firewall/proxy not blocking SSE

**Tools:**
- Verify `workingDir` in session
- Check backend logs for detailed errors
- Ensure paths relative to workingDir or absolute
