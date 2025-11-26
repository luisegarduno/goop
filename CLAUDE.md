# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**goop** is an AI Coding Agent built as a monorepo with separate frontend and backend packages. The backend uses Hono + Drizzle ORM + PostgreSQL + Anthropic API, while the frontend is built with React + Vite + TailwindCSS + Zustand.

## Project Status

**Phase 1 (Infrastructure Setup)**: Complete
- Monorepo structure with Bun workspaces
- Package scaffolding (backend and frontend)
- PostgreSQL via Docker Compose
- TypeScript configuration

**Phase 2 (Database Schema & Configuration)**: Complete
- Database schema with 3 tables (sessions, messages, message_parts)
- Sessions table includes working directory storage
- Drizzle ORM setup with migrations
- Type-safe configuration management with Zod validation
- Environment variable loading from root .env

**Phase 3 (Backend Core - Hono Server & API Routes)**: Complete
- Hono HTTP server with CORS and logging middleware
- RESTful API routes for sessions and messages
- Server-Sent Events (SSE) streaming endpoint
- Health check endpoint
- Drizzle relations for efficient data querying

**Phase 4 (Anthropic Provider & Tool System)**: Complete
- Abstract provider interface for AI integrations
- Anthropic Claude provider with streaming support
- Tool execution system with security constraints
- Read file tool implementation
- Tool registry with Zod schema validation

**Phase 5 (Session Manager & Streaming Integration)**: Complete
- Session manager orchestrating AI conversations
- Real-time message streaming via SSE
- Automatic tool execution and result handling
- Conversation history management
- Database persistence for all message parts

**Phase 6 (Frontend - Terminal UI)**: Complete
- React 19 with Vite and TailwindCSS 4
- Terminal-inspired dark theme UI
- Zustand state management
- Real-time SSE connection for streaming responses
- Message display with text, tool use, and tool result rendering
- Input box with streaming state management

## Development Environment

This project uses **Bun** as the runtime and package manager. All commands should be run with `bun` rather than `npm` or `yarn`.

### Initial Setup

1. Copy `.env.example` to `.env` in the project root and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `NODE_ENV` - Environment (development, production, test)
   - `HONO_BACKEND_PORT` - Backend server port (default: 3001)

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

4. Run database migrations (from backend package):
   ```bash
   cd packages/backend
   bun run db:migrate
   ```

5. Test configuration loading:
   ```bash
   cd packages/backend
   bun run src/config/index.ts
   ```

### Running the Application

1. Start the backend server (from `packages/backend`):
   ```bash
   bun run dev
   ```
   - Backend runs on http://localhost:3001
   - Health check: http://localhost:3001/health

2. In a new terminal, start the frontend (from `packages/frontend`):
   ```bash
   bun run dev
   ```
   - Frontend runs on http://localhost:3000
   - Opens automatically in browser

3. Use the application:
   - On first load, a setup modal will appear prompting for session title and working directory
   - Working directory determines the base path for file operations (e.g., read_file tool)
   - Type messages in the terminal-style input box
   - See AI responses stream in real-time
   - Ask Claude to read files: "Can you read the package.json file?"
   - All conversation history and session settings are persisted in PostgreSQL
   - Session data (including working directory) is also saved to localStorage for restoration

### Quick Setup Script

For convenience, use the `setup.sh` script (if available):
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install all dependencies
- Start PostgreSQL
- Create `.env` if it doesn't exist
- Run database migrations

## Common Commands

### Monorepo-level (run from root)

- `bun run dev` - Start dev servers for all packages
- `bun run build` - Build all packages
- `bun run test` - Run tests for all packages
- `bun run typecheck` - Type-check all packages

### Backend (`packages/backend`)

- `bun run dev` - Start backend dev server with hot reload (watches `src/index.ts`)
- `bun run build` - Build backend to `dist/` directory
- `bun run start` - Run production build
- `bun run db:generate` - Generate Drizzle migration files from schema changes
- `bun run db:migrate` - Apply migrations to database (runs `src/db/migrate.ts`)
- `bun test` - Run backend tests
- `bun run typecheck` - Type-check without emitting files

### Frontend (`packages/frontend`)

- `bun run dev` - Start Vite dev server
- `bun run build` - Build for production (runs `tsc -b && vite build`)
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build locally

## Architecture

### Monorepo Structure

This is a Bun workspace monorepo where each package in `packages/` is independently buildable and runnable. The root `package.json` defines scripts that filter and run commands across all workspace packages.

### Backend (`@goop/backend`)

**Tech Stack:**
- **Hono** (^4.0.0) - Lightweight web framework with built-in CORS and logging
- **Drizzle ORM** (0.44.7) - TypeScript ORM for PostgreSQL with relations
- **Drizzle Kit** (0.31.7) - Database migration toolkit
- **Postgres** (^3.4.0) - PostgreSQL client for Node.js
- **Zod** (^3.25.76) - Schema validation and type inference
- **zod-to-json-schema** (^3.22.0) - Convert Zod schemas to JSON Schema for AI tools
- **Dotenv** (^17.2.3) - Environment variable loading from root .env
- **Anthropic SDK** (^0.24.0) - Claude API integration with streaming support

**File Structure:**
```
src/
├── api/
│   └── routes.ts         # REST API endpoints and SSE streaming
├── config/
│   ├── index.ts          # Configuration loader with Zod validation
│   └── schema.ts         # Zod schemas for message types
├── db/
│   ├── index.ts          # Drizzle client initialization
│   ├── schema.ts         # Drizzle database schema with relations
│   ├── migrate.ts        # Migration runner script
│   └── migrations/       # Generated SQL migration files
├── providers/
│   ├── base.ts           # Abstract provider interface
│   └── anthropic.ts      # Claude API integration with streaming
├── session/
│   └── index.ts          # Session manager orchestrating conversations
├── streaming/
│   └── index.ts          # SSE event types and formatting
├── tools/
│   ├── base.ts           # Tool interface definition
│   ├── index.ts          # Tool registry and execution
│   └── read.ts           # Read file tool implementation
└── index.ts              # Hono server entry point
```

**Key Patterns:**

1. **Environment Variables**: All packages load `.env` from the monorepo root using:
   ```typescript
   config({ path: "../../.env" });
   ```

2. **Configuration Management**: Type-safe config loading with Zod validation in `src/config/index.ts`:
   - Validates all required environment variables on startup
   - Provides strongly-typed config object
   - Run directly to test: `bun run src/config/index.ts`

3. **Database Migrations**:
   - Schema defined in `src/db/schema.ts` using Drizzle ORM
   - Generate migrations: `bun run db:generate` (uses `drizzle-kit generate`)
   - Apply migrations: `bun run db:migrate` (runs `src/db/migrate.ts`)
   - Migration files stored in `src/db/migrations/`

4. **Server Configuration**:
   - Port: `process.env.HONO_BACKEND_PORT` (default: 3001)
   - Environment: `process.env.NODE_ENV` (default: development)
   - CORS configured for frontend origin (localhost:3000)
   - Health check available at `/health`

5. **Provider System**:
   - Abstract `Provider` interface in `src/providers/base.ts`
   - Current implementation: Anthropic Claude (claude-3-5-sonnet-20241022)
   - Providers expose async generator for streaming responses
   - Streaming events: text deltas, tool use, and completion
   - Future-ready for OpenAI, Google, and local model providers

6. **Tool System**:
   - Tools define name, description, and Zod input schema
   - Tool execution requires `ToolContext` with workingDir from session
   - Security: Read tool validates paths stay within working directory
   - Working directory is set per-session and stored in database
   - Registry at `src/tools/index.ts` exports all available tools
   - Currently implemented: `read_file` tool for reading local files

7. **Session Manager**:
   - Located in `src/session/index.ts`
   - Orchestrates conversation flow: user message → AI response → tool execution → final response
   - Manages conversation history loading from database
   - Handles streaming with SSE events
   - Persists all message parts (text, tool_use, tool_result) to database
   - Updates session timestamps on each interaction
   - Emits message.start event after tool execution to properly indicate assistant response continuation
   - Uses working directory stored in session for all tool executions

8. **Server-Sent Events (SSE)**:
   - Event types: `message.start`, `message.delta`, `tool.start`, `tool.result`, `message.done`
   - Streaming endpoint: `POST /api/sessions/:id/messages`
   - Returns SSE stream with `Content-Type: text/event-stream`
   - Frontend connects via EventSource API
   - All events formatted in `src/streaming/index.ts`

### Frontend (`frontend`)

**Tech Stack:**
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS 4** - Styling (includes `@tailwindcss/vite` plugin)
- **Zustand** - State management
- **TypeScript** - Type safety

**File Structure:**
```
src/
├── api/
│   └── client.ts         # Backend API communication functions
├── components/
│   ├── InputBox.tsx      # Message input with send button
│   ├── SetupModal.tsx    # Session setup modal for title and working directory
│   └── Terminal.tsx      # Main message display component
├── hooks/
│   └── useSSE.ts         # Server-Sent Events hook for streaming
├── stores/
│   └── session.ts        # Zustand store for session state
├── styles/
│   └── index.css         # Tailwind imports and base styles
├── App.tsx               # Root component with session initialization
└── main.tsx              # React entry point
```

**Key Patterns:**

1. **State Management with Zustand**:
   - Single store in `src/stores/session.ts`
   - Manages: sessionId, workingDirectory, messages array, streaming state, current text buffer
   - Actions: setSessionId, setWorkingDirectory, addMessage, appendText, finishStreaming, setStreaming
   - Persists session data to localStorage for page refresh
   - No prop drilling - components access state via hooks

2. **Server-Sent Events (SSE)**:
   - Hook in `src/hooks/useSSE.ts` manages EventSource connection
   - Listens for: `message.start`, `message.delta`, `message.done`, `tool.start`, `tool.result`
   - Automatically reconnects on errors
   - Updates Zustand store with streaming text deltas

3. **Terminal UI Design**:
   - Dark theme with monospace font (Monaco, Menlo, Consolas)
   - Color-coded roles: user (cyan), assistant (green), tool (orange)
   - Setup modal for session configuration (title and working directory)
   - Displays text, tool usage, and tool results inline
   - Streaming indicator (blinking cursor) during AI responses
   - Fixed input box at bottom with auto-scroll

4. **API Client**:
   - Functions: `createSession(title, workingDirectory)`, `getSession()`, `getMessages()`, `sendMessage()`
   - Base URL: `http://localhost:3001/api`
   - Returns JSON for REST calls
   - POST to `/sessions/:id/messages` triggers SSE stream
   - Working directory stored in session and used for all file operations

5. **Session Lifecycle**:
   - App checks localStorage for existing session on mount
   - If no session exists, SetupModal prompts user for session title and working directory
   - Session ID and working directory stored in both Zustand and localStorage
   - Messages persist in PostgreSQL
   - Page refresh restores session from localStorage and loads message history from backend

### Database

**Infrastructure:**
- **PostgreSQL 17** runs in Docker via `docker-compose.yml`
- Container name: `goop-agent-postgres`
- Default port: 5432
- Health checks are configured to ensure database readiness
- Connection string in `.env`: `DATABASE_URL`

**Schema:**

The database uses three tables with UUID primary keys and cascade delete relationships:

1. **sessions** - Chat sessions
   - `id` (UUID, primary key)
   - `title` (text) - Session title
   - `working_directory` (text) - Base path for file operations
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

2. **messages** - Messages within sessions
   - `id` (UUID, primary key)
   - `session_id` (UUID, foreign key → sessions.id)
   - `role` (text) - 'user' | 'assistant'
   - `created_at` (timestamp)
   - Cascade delete when session is deleted

3. **message_parts** - Parts of a message (text, tool_use, tool_result)
   - `id` (UUID, primary key)
   - `message_id` (UUID, foreign key → messages.id)
   - `type` (text) - 'text' | 'tool_use' | 'tool_result'
   - `content` (jsonb) - Flexible JSON content
   - `order` (integer) - Order of parts within message
   - Cascade delete when message is deleted

**Schema Files:**
- Drizzle schema: `packages/backend/src/db/schema.ts`
- Zod validation schemas: `packages/backend/src/config/schema.ts`
- Generated migrations: `packages/backend/src/db/migrations/`

## TypeScript Configuration

The root `tsconfig.json` uses modern TypeScript settings:
- Target: ESNext with bundler module resolution
- JSX: `react-jsx` (React 17+ transform)
- Strict mode enabled
- `verbatimModuleSyntax` for explicit imports/exports
- `noEmit` mode (Bun handles transpilation)

## Working with Database Migrations

**Workflow for schema changes:**

1. Modify the schema in `packages/backend/src/db/schema.ts`
2. Generate migration files:
   ```bash
   cd packages/backend
   bun run db:generate
   ```
3. Review the generated SQL in `src/db/migrations/`
4. Apply migrations to database:
   ```bash
   bun run db:migrate
   ```

**Configuration:**
- Drizzle config: `packages/backend/drizzle.config.ts`
- Loads `DATABASE_URL` from root `.env` file
- Schema path: `./src/db/schema.ts`
- Migrations output: `./src/db/migrations`

**Important Notes:**
- Always review generated migrations before applying
- Migration runner (`src/db/migrate.ts`) uses a single connection for safety
- Cascade deletes are configured: deleting a session deletes all messages and parts
- All IDs are UUIDs with `gen_random_uuid()` defaults
- Migration 0001_premium_vapor.sql added `working_directory` column with default value for existing sessions

## API Endpoints

The backend exposes the following REST and SSE endpoints:

**REST Endpoints:**
- `GET /health` - Health check (returns `{ status: "ok" }`)
- `POST /api/sessions` - Create new session
  - Request body: `{ title?: string, workingDirectory?: string }`
  - Returns session object with id, title, workingDirectory, createdAt, updatedAt
  - Default title: "New Conversation"
  - workingDirectory is required
- `GET /api/sessions` - List all sessions (ordered by updatedAt DESC)
- `GET /api/sessions/:id` - Get specific session by ID
- `GET /api/sessions/:id/messages` - Get all messages for a session (with parts)

**SSE Streaming:**
- `POST /api/sessions/:id/messages` - Send user message and stream AI response
  - Request body: `{ content: string }`
  - Working directory is retrieved from the session in the database
  - Returns: SSE stream with events (message.start, message.delta, tool.start, tool.result, message.done)
  - Content-Type: `text/event-stream`
  - Note: message.start event is emitted both at conversation start and after tool execution completes

## Working with Providers

**Adding a New AI Provider:**

1. Create provider file in `packages/backend/src/providers/{provider-name}.ts`
2. Implement the `Provider` interface from `src/providers/base.ts`:
   ```typescript
   export class MyProvider implements Provider {
     name = "my-provider";
     async *stream(messages: ProviderMessage[], tools: ToolDefinition[]): AsyncGenerator<StreamEvent> {
       // Implementation
     }
   }
   ```
3. Handle streaming events: yield `{ type: "text", text }` for text and `{ type: "tool_use", toolUse }` for tool calls
4. Update `src/session/index.ts` to support provider selection (future enhancement)
5. Add provider configuration to `src/config/index.ts`

**Current Provider:**
- Anthropic Claude (claude-3-5-sonnet-20241022)
- Streaming via Anthropic SDK
- Supports tool calling with automatic JSON schema conversion via zod-to-json-schema

## Working with Tools

**Adding a New Tool:**

1. Create tool file in `packages/backend/src/tools/{tool-name}.ts`
2. Define Zod input schema:
   ```typescript
   export const MyToolInputSchema = z.object({
     param: z.string().describe("Parameter description"),
   });
   ```
3. Implement `Tool` interface:
   ```typescript
   export class MyTool implements Tool<MyToolInput> {
     name = "my_tool";
     description = "What this tool does";
     schema = MyToolInputSchema;

     async execute(input: MyToolInput, context: ToolContext): Promise<string> {
       // Implementation
       return "Result string";
     }
   }
   ```
4. Register in `src/tools/index.ts`:
   ```typescript
   export const tools: Tool[] = [new ReadFileTool(), new MyTool()];
   ```
5. Tools automatically available to all AI providers

**Tool Security:**
- Tools receive `ToolContext` with `workingDir` for path validation
- Validate all inputs against Zod schema before execution
- Return errors as strings (displayed to AI and user)
- Consider path traversal attacks (e.g., `../../etc/passwd`)
- Future: Add approval system for dangerous operations

**Current Tools:**
- `read_file` - Read local file contents with path validation

## Testing

**Current Status:**
- Phase 1-6 complete with manual testing
- Test infrastructure minimal (relies on Bun's built-in test runner)
- Manual end-to-end testing verified all functionality

**Future Testing (Phase 7+):**
- Unit tests for tools, providers, and utilities
- Integration tests for API endpoints
- End-to-end tests with real database
- Mock Anthropic API responses for predictable tests
- Frontend component tests with React Testing Library
- Aim for 90%+ code coverage

**Running Tests:**
```bash
# From package directory
bun test

# From root (all packages)
bun run test
```

## Next Steps & Future Enhancements

**Immediate Improvements:**
- Better error handling and user feedback
- Conversation context pruning for long sessions
- Multiple conversation UI (session list sidebar)
- Session switching/management UI
- Clear session/start new conversation functionality

**Planned Features (Future Phases):**

**Phase 7: Additional Providers**
- OpenAI GPT-4 integration
- Google Gemini support
- Local llama.cpp models
- Provider selection in UI

**Phase 8: Extended Tool Set**
- `write_file` - Create/overwrite files
- `edit_file` - Apply diff-based edits
- `bash` - Execute shell commands (with approval)
- `grep` - Search code with regex
- `glob` - List files matching patterns

**Phase 9: Approval System**
- User approval for dangerous operations (write, edit, bash)
- Y/N prompts in UI
- Approval history tracking
- Configurable approval rules

**Phase 10: Mode System**
- Ask mode (read-only tools)
- Plan mode (analysis and planning)
- Build mode (full tool access)
- Mode enforcement at tool execution level

**Phase 11: Testing & Production**
- 90%+ test coverage
- CI/CD with GitHub Actions
- Production deployment guide
- Performance optimizations
- Security hardening

## Troubleshooting

**Database connection issues:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in `.env`
- Verify migrations ran: `psql $DATABASE_URL -c "\dt"`

**Backend won't start:**
- Check ANTHROPIC_API_KEY is set in `.env`
- Verify port 3001 is available: `lsof -i :3001`
- Run `bun run typecheck` to check for TypeScript errors

**Frontend not connecting:**
- Ensure backend is running on port 3001
- Check browser console for CORS errors
- Verify frontend is on http://localhost:3000 (not 127.0.0.1)

**Streaming not working:**
- Check browser DevTools Network tab for SSE connection
- Look for `text/event-stream` Content-Type
- Verify no proxy/firewall blocking SSE

**Tool execution errors:**
- Check workingDir is set correctly in request
- Verify file paths are absolute or relative to workingDir
- Review backend logs for detailed error messages
