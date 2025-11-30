# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Project Overview

**goop** is an AI Coding Agent monorepo with Bun workspaces. Backend: Hono + Drizzle ORM + PostgreSQL + AI Provider APIs (Anthropic Claude & OpenAI GPT). Frontend: React 19 + Vite + TailwindCSS 4 + Zustand.

**Status:** Core functionality complete (Phases 1-6). Terminal-style UI with SSE streaming, multi-provider support, and comprehensive tool system (read, write, edit, grep, glob).

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
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
HONO_BACKEND_PORT=3001
NODE_ENV=development
```

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
│   ├── base.ts            # Provider interface
│   ├── anthropic.ts       # Claude integration
│   └── openai.ts          # GPT integration
├── session/index.ts       # Conversation orchestration
├── streaming/index.ts     # SSE event formatting
├── tools/
│   ├── base.ts            # Tool interface
│   ├── read.ts, write.ts, edit.ts, grep.ts, glob.ts
│   └── index.ts           # Tool registry
├── utils/
│   ├── security.ts        # Path validation
│   └── validation.ts      # API key validation
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
├── hooks/useSSE.ts        # EventSource hook
├── stores/session.ts      # Zustand store
└── App.tsx                # Root component
```

### Database Schema

**PostgreSQL 17** via Docker. Three tables with UUID PKs and cascade deletes:

1. **sessions** - id, title, working_directory, provider, model, timestamps
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
- Abstract `Provider` interface in `src/providers/base.ts`
- Async generator yields `StreamEvent` (text deltas, tool_use, completion)
- Per-session provider/model stored in database
- Anthropic: Static model list (Haiku, Sonnet, Opus variants)
- OpenAI: Dynamic model fetching from API

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

**Streaming:**
- `POST /api/sessions/:id/messages` - Send message & stream response (SSE)

**Providers:**
- `GET /api/providers` - List available providers
- `GET /api/providers/:name/models` - Get model list
- `GET /api/providers/:name/api-key` - Get masked API key from .env
- `POST /api/providers/validate` - Validate API key

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
- CORS restricted to frontend origin

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
