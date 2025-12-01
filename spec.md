# AI Coding Agent Architecture Analysis & Implementation Guide

## Implementation Plan - TypeScript AI Coding Agent

### Project Specifications

**Core Requirements**:

- **Runtime**: Bun + TypeScript
- **Frontend**: React 19 + TailwindCSS 4 (terminal-like web UI on localhost)
- **Backend**: Lightweight HTTP server (Hono)
- **AI Providers**: Anthropic Claude, OpenAI GPT (implemented); Google Gemini, llama.cpp (planned)
- **Tools**: Read, write, edit, grep, glob (implemented); bash (planned)
- **Modes**: Ask/Plan/Build mode system (planned)
- **Approval**: Y/N prompts for tool calls (planned)
- **Streaming**: Real-time SSE streaming to UI
- **Database**: PostgreSQL 17 + postgres + Drizzle ORM
- **Schema**: Zod validation everywhere
- **Testing**: Vitest framework (comprehensive coverage planned)
- **CI/CD**: GitHub Actions (planned)
- **Cross-platform**: Windows, macOS, Linux

### Architecture Overview

```
┌─────────────────────────────────────────┐
│     React + TailwindCSS Web UI          │
│     (localhost:3000)                    │
│  - Terminal-like interface              │
│  - Real-time streaming display          │
│  - Approval prompts (Y/N)               │
└─────────────────┬───────────────────────┘
                  │ HTTP + SSE
                  ▼
┌─────────────────────────────────────────┐
│     Bun + TypeScript Backend            │
│     Hono HTTP Server (localhost:3001)   │
│  ┌────────────────────────────────────┐ │
│  │  Session Manager                   │ │
│  │  - Create/resume sessions          │ │
│  │  - Mode enforcement                │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Provider System                   │ │
│  │  - Anthropic, OpenAI, Google       │ │
│  │  - llama.cpp adapter               │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Tool Registry                     │ │
│  │  - File operations                 │ │
│  │  - Shell execution                 │ │
│  │  - Search (grep)                   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Approval Manager                  │ │
│  │  - Y/N prompts                     │ │
│  │  - Stream to UI                    │ │
│  └────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ Drizzle ORM
                  ▼
┌─────────────────────────────────────────┐
│     PostgreSQL 17 Database              │
│  - sessions (with provider, model)      │
│  - messages                             │
│  - message_parts                        │
└─────────────────────────────────────────┘
```

### Detailed File Structure

```
ai-coding-agent/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts                 # Entry point, Hono server
│   │   │   ├── config/
│   │   │   │   ├── index.ts             # Zod-validated config loader ✅
│   │   │   │   └── schema.ts            # Message type schemas ✅
│   │   │   ├── db/
│   │   │   │   ├── index.ts             # Drizzle client ✅
│   │   │   │   ├── schema.ts            # Drizzle schema (3 tables) ✅
│   │   │   │   ├── migrate.ts           # Migration runner ✅
│   │   │   │   └── migrations/          # SQL migrations ✅
│   │   │   ├── providers/
│   │   │   │   ├── index.ts             # Provider registry
│   │   │   │   ├── base.ts              # Abstract provider interface
│   │   │   │   ├── anthropic.ts         # Claude integration ✅
│   │   │   │   └── openai.ts            # GPT integration ✅
│   │   │   ├── tools/
│   │   │   │   ├── index.ts             # Tool registry ✅
│   │   │   │   ├── base.ts              # Tool interface ✅
│   │   │   │   ├── read.ts              # File reading ✅
│   │   │   │   ├── write.ts             # File writing ✅
│   │   │   │   ├── edit.ts              # File editing ✅
│   │   │   │   ├── grep.ts              # Code search (regex) ✅
│   │   │   │   └── glob.ts              # File pattern matching ✅
│   │   │   ├── session/
│   │   │   │   └── index.ts             # Session manager & conversation orchestration ✅
│   │   │   ├── streaming/
│   │   │   │   └── index.ts             # SSE event formatting ✅
│   │   │   ├── api/
│   │   │   │   └── routes.ts            # REST & SSE endpoints ✅
│   │   │   └── utils/
│   │   │       ├── security.ts          # Path validation ✅
│   │   │       └── validation.ts        # API key validation ✅
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx                 # Entry point
│       │   ├── App.tsx                  # Root component
│       │   ├── components/
│       │   │   ├── Terminal.tsx         # Message display with auto-scroll ✅
│       │   │   ├── InputBox.tsx         # User input with send button ✅
│       │   │   ├── SessionSwitcher.tsx  # Session dropdown ✅
│       │   │   ├── SetupModal.tsx       # Session creation modal ✅
│       │   │   └── SettingsModal.tsx    # Provider/model settings ✅
│       │   ├── hooks/
│       │   │   └── useSSE.ts            # SSE connection hook ✅
│       │   ├── stores/
│       │   │   └── session.ts           # Zustand store ✅
│       │   ├── api/
│       │   │   └── client.ts            # Backend API client ✅
│       │   └── styles/
│       │       └── index.css            # TailwindCSS config
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── vitest.config.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                       # Run tests on PR
│       ├── coverage.yml                 # Coverage reporting
│       └── release.yml                  # Build and release
│
├── docker-compose.yml                   # PostgreSQL for local dev
├── .env.example                         # Environment template
├── package.json                         # Workspace root
├── bun.lockb                            # Bun lock file
└── README.md
```

### Module Responsibilities

#### Backend Modules

**1. Config Module** (`backend/src/config/`)

- Load environment variables (API keys, DB connection)
- Parse .goop.json config files (project-specific settings)
- Zod schemas for validation
- Provider credentials management

**2. Database Module** (`backend/src/db/`)

- Drizzle ORM setup with postgres client
- Schema definitions (3 tables with UUID PKs, cascade deletes):
  ```typescript
  sessions: id, title, working_directory, provider, model, created_at, updated_at;
  messages: id, session_id, role, created_at;
  message_parts: id, message_id, type, content, order;
  ```
- Migration management with Drizzle Kit
- Connection via postgres client

**3. Providers Module** (`backend/src/providers/`)

- Abstract `Provider` interface:
  ```typescript
  interface Provider {
    name: string;
    stream(messages: ProviderMessage[], tools: ToolDefinition[]): AsyncGenerator<StreamEvent>;
  }
  ```
- **Implemented**: Anthropic Claude (static model list), OpenAI GPT (dynamic model fetching)
- **Planned**: Google Gemini, llama.cpp local models
- Streaming events: text deltas, tool_use, completion
- Per-session provider/model stored in database

**4. Tools Module** (`backend/src/tools/`)

- Abstract `Tool` interface:
  ```typescript
  interface Tool<T> {
    name: string;
    description: string;
    schema: ZodSchema<T>;
    execute(input: T, context: ToolContext): Promise<string>;
  }
  ```
- **Implemented**: read_file, write_file, edit_file, grep, glob
- **Planned**: bash (shell execution)
- Security: Path validation against working directory
- Tools receive `ToolContext` with `workingDir` from session

**5. Session Module** (`backend/src/session/`)

- Create/resume sessions
- Conversation orchestration (user message → AI → tool execution → response)
- Message history loading from database
- Streaming with SSE events
- Persistence of all message parts
- Working directory enforcement for tool execution

**6. Streaming Module** (`backend/src/streaming/`)

- SSE event formatting for real-time updates
- Event types:
  ```typescript
  "message.start", "message.delta", "message.done";
  "tool.start", "tool.result";
  ```
- All events formatted as SSE-compatible strings

**7. API Module** (`backend/src/api/`)

- Hono routes:
  - GET `/health` - Health check
  - POST `/api/sessions` - Create session (body: title, workingDirectory, provider, model, apiKey?)
  - GET `/api/sessions` - List all sessions
  - GET `/api/sessions/:id` - Get specific session
  - PATCH `/api/sessions/:id` - Update session settings
  - DELETE `/api/sessions/:id` - Delete session
  - GET `/api/sessions/:id/messages` - Get message history
  - POST `/api/sessions/:id/messages` - Send message & stream response (SSE)
  - GET `/api/providers` - List available providers
  - GET `/api/providers/:name/models` - Get model list
  - GET `/api/providers/:name/api-key` - Get masked API key from .env
  - POST `/api/providers/validate` - Validate API key

#### Frontend Modules

**1. Terminal Component** (`frontend/src/components/Terminal.tsx`)

- Terminal-like UI with TailwindCSS dark theme
- Monospace font, color-coded roles
- Auto-scroll to latest messages during streaming
- Message rendering: text, tool_use, tool_result

**2. Input Box** (`frontend/src/components/InputBox.tsx`)

- Text input with send button
- Auto-focus when streaming finishes
- Submit on Enter
- Streaming state indicator

**3. Session Components**

- `SessionSwitcher.tsx` - Dropdown menu for switching sessions with keyboard navigation
- `SetupModal.tsx` - Session creation (title, working directory, provider, model, API key)
- `SettingsModal.tsx` - Update provider, model, working directory mid-conversation

**4. SSE Hook** (`frontend/src/hooks/useSSE.ts`)

- EventSource connection to streaming endpoint
- Parse SSE events (message.start, message.delta, tool.start, tool.result, message.done)
- Update Zustand store with streaming deltas
- Auto-reconnect on errors

**5. Session Store** (`frontend/src/stores/session.ts`)

- Zustand store for session state
- Manages: sessionId, workingDirectory, provider, model, messages, streaming state
- Persists to localStorage for page refresh
- Actions: addMessage, appendText, setStreaming, loadSession, etc.

### Phase-by-Phase Development

#### Phase 1: Foundation

1. **Project setup**

   ```bash
   mkdir ai-coding-agent && cd ai-coding-agent
   bun init -y
   mkdir -p packages/{backend,frontend}
   # Setup workspace in root package.json
   ```

2. **Backend skeleton**:

   - Initialize backend package
   - Install dependencies:
     ```bash
     bun add hono @hono/node-server drizzle-orm postgres zod
     bun add -d drizzle-kit @types/node vitest
     ```
   - Create basic Hono server in `backend/src/index.ts`
   - Setup Drizzle schema in `backend/src/db/schema.ts`
   - Run migrations with `drizzle-kit generate` and `drizzle-kit push`

3. **Frontend skeleton**:
   - Initialize React + Vite:
     ```bash
     cd packages/frontend
     bun create vite . --template react-ts
     bun add tailwindcss @tailwindcss/vite autoprefixer zustand
     ```
   - Configure TailwindCSS
   - Create App.tsx with basic layout

#### Phase 2: Provider Integration ✅ COMPLETE

1. **Provider abstraction**: ✅
   - Created `backend/src/providers/base.ts` with interface
   - Installed Anthropic SDK and OpenAI SDK

2. **Anthropic provider**: ✅
   - Implemented in `backend/src/providers/anthropic.ts`
   - Streaming with tool calling support
   - Static model list (Haiku, Sonnet, Opus variants)

3. **OpenAI provider**: ✅
   - Implemented in `backend/src/providers/openai.ts`
   - Streaming with tool calling support
   - Dynamic model fetching from API

#### Phase 3: Core Tools ✅ COMPLETE (bash planned)

1. **Tool registry**: ✅
   - Created `backend/src/tools/base.ts` with Tool interface
   - Created `backend/src/tools/index.ts` registry

2. **File tools**: ✅
   - `read.ts`: Read file contents with path validation
   - `write.ts`: Create/overwrite files
   - `edit.ts`: String replacement edits
   - Zod schemas for all inputs

3. **Search tools**: ✅
   - `grep.ts`: Regex search with context lines via fast-glob
   - `glob.ts`: File pattern matching

4. **Bash tool**: ⏳ PLANNED
   - Shell command execution with approval system

#### Phase 4: Session & API ✅ COMPLETE (approval planned)

1. **Session manager**: ✅
   - Created `backend/src/session/index.ts`
   - Create/resume/list sessions
   - Message history persistence to PostgreSQL
   - Conversation orchestration with tool execution

2. **API routes**: ✅
   - Sessions CRUD endpoints
   - Messages GET/POST endpoints with SSE streaming
   - Provider endpoints (list, models, validate)

3. **Approval system**: ⏳ PLANNED
   - Y/N prompts for dangerous operations
   - Approval history tracking

#### Phase 5: Streaming & Frontend ✅ COMPLETE

1. **SSE implementation**: ✅
   - Created `backend/src/streaming/index.ts`
   - SSE event formatting
   - POST `/api/sessions/:id/messages` returns SSE stream

2. **Frontend state management**: ✅
   - Zustand store in `frontend/src/stores/session.ts`
   - API client in `frontend/src/api/client.ts`
   - localStorage persistence

3. **Frontend SSE hook**: ✅
   - `frontend/src/hooks/useSSE.ts`
   - EventSource connection
   - Parse events and update store

4. **Terminal UI**: ✅
   - Terminal-style message display
   - Streaming indicator (blinking cursor)
   - Auto-scroll to latest messages
   - Session management UI (switcher, setup modal, settings modal)

#### Phase 6: Testing & Polish ⏳ PLANNED

1. **Backend tests**:
   - Tool tests (unit): Each tool with mocked context
   - Provider tests: Mock API responses
   - Session tests: CRUD operations
   - Vitest targeting 90%+ coverage

2. **Frontend tests**:
   - Component tests: Terminal, modals, input
   - Hook tests: useSSE
   - Vitest + React Testing Library

3. **GitHub Actions**:
   - CI workflow with PostgreSQL service
   - Coverage reporting

4. **Documentation**: ✅ PARTIAL
   - README with setup instructions ✅
   - CLAUDE.md architecture guide ✅
   - API documentation (in progress)

### Minimal Library Recommendations

#### Backend

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "drizzle-orm": "0.44.7",
    "postgres": "^3.4.0",
    "zod": "^3.25.76",
    "zod-to-json-schema": "^3.22.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "openai": "^6.9.1",
    "fast-glob": "^3.3.3",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "drizzle-kit": "0.31.7",
    "@types/bun": "latest"
  }
}
```

#### Frontend

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "vite": "^7.2.4",
    "tailwindcss": "^4.1.17",
    "@tailwindcss/vite": "^4.1.17",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.9.3",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2"
  }
}
```

### Streaming Implementation Best Practices

1. **Backend SSE Setup**:

```typescript
// backend/src/streaming/index.ts
import { EventEmitter } from "events";

export const eventBus = new EventEmitter();

export const createSSEStream = (c: Context) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const handlers = {
        "message.delta": (data) => send("message.delta", data),
        "tool.started": (data) => send("tool.started", data),
        "approval.requested": (data) => send("approval.requested", data),
      };

      Object.entries(handlers).forEach(([event, handler]) => {
        eventBus.on(event, handler);
      });

      // Cleanup on close
      c.req.raw.signal.addEventListener("abort", () => {
        Object.entries(handlers).forEach(([event, handler]) => {
          eventBus.off(event, handler);
        });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
```

2. **Frontend SSE Hook**:

```typescript
// frontend/src/hooks/useSSE.ts
import { useEffect } from "react";
import { useSessionStore } from "../stores/session";

export const useSSE = (sessionId: string) => {
  const updateMessage = useSessionStore((s) => s.updateMessage);
  const addApprovalRequest = useSessionStore((s) => s.addApprovalRequest);

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:3001/api/events?session=${sessionId}`
    );

    eventSource.addEventListener("message.delta", (e) => {
      const data = JSON.parse(e.data);
      updateMessage(data.messageId, data.delta);
    });

    eventSource.addEventListener("approval.requested", (e) => {
      const data = JSON.parse(e.data);
      addApprovalRequest(data);
    });

    eventSource.onerror = () => {
      console.error("SSE connection error, reconnecting...");
      // Browser auto-reconnects
    };

    return () => eventSource.close();
  }, [sessionId]);
};
```

### Testing Framework Strategy

**Vitest Configuration**:

```typescript
// vitest.config.ts (both backend and frontend)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node", // or 'jsdom' for frontend
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    setupFiles: ["./test/setup.ts"],
  },
});
```

**Test Structure**:

```typescript
// backend/src/tools/read.test.ts
import { describe, it, expect, vi } from "vitest";
import { ReadTool } from "./read";
import * as fs from "fs/promises";

vi.mock("fs/promises");

describe("ReadTool", () => {
  it("should read file contents", async () => {
    const mockContent = "file contents";
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);

    const tool = new ReadTool();
    const result = await tool.execute({ path: "/test.txt" }, mockContext);

    expect(result.content).toBe(mockContent);
    expect(fs.readFile).toHaveBeenCalledWith("/test.txt", "utf-8");
  });

  it("should handle file not found", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

    const tool = new ReadTool();
    await expect(
      tool.execute({ path: "/missing.txt" }, mockContext)
    ).rejects.toThrow("File not found");
  });
});
```

### Cross-Platform Considerations

**Path Handling**:

```typescript
import { join, resolve, normalize } from "path";
import { homedir } from "os";

// Always use path.join for cross-platform paths
const configPath = join(homedir(), ".goop", "config.json");

// Normalize user input paths
const normalizedPath = normalize(userInput);
```

**Shell Execution**:

```typescript
// backend/src/tools/bash.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class BashTool implements Tool {
  async execute(input: { command: string }, context: Context) {
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
    const args = process.platform === "win32" ? ["/c"] : ["-c"];

    try {
      const { stdout, stderr } = await execAsync(input.command, {
        shell,
        cwd: context.workingDir,
        timeout: 30000,
      });
      return { stdout, stderr };
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }
}
```

**File System**:

```typescript
// Use forward slashes internally, convert on display
const displayPath =
  process.platform === "win32" ? path.replace(/\//g, "\\") : path;
```

### Current Implementation

**Web-based UI** (React 19 + Vite + TailwindCSS 4):
- Terminal-style interface on localhost:3000
- Real-time streaming via SSE
- Session management with provider/model selection
- Desktop wrapper (Tauri) possible future enhancement

### PostgreSQL + Drizzle Setup

**Schema Definition**:

```typescript
// backend/src/db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  workingDirectory: text("working_directory").notNull(),
  provider: text("provider").notNull().default("anthropic"),
  model: text("model").notNull().default("claude-3-5-haiku-latest"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageParts = pgTable("message_parts", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => messages.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'text' | 'tool_use' | 'tool_result'
  content: jsonb("content").notNull(),
  order: integer("order").notNull(),
});
```

**Connection**:

```typescript
// backend/src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**docker-compose.yml**:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: goop-agent-postgres
    env_file:
      - .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
volumes:
  postgres-data:
```

### GitHub Actions CI/CD

**.github/workflows/ci.yml**:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: goop
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run backend tests
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://user:password@localhost:5432/goop
        run: bun test --coverage

      - name: Run frontend tests
        working-directory: packages/frontend
        run: bun test --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/*/coverage/lcov.info
```

### Best Practices for TypeScript Development

1. **Strict TypeScript Config**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

2. **Zod for Runtime Validation**:

```typescript
import { z } from "zod";

export const FileReadInput = z.object({
  path: z.string().min(1),
  encoding: z.enum(["utf-8", "ascii"]).default("utf-8"),
});

export type FileReadInput = z.infer<typeof FileReadInput>;

// Use in tool
const validatedInput = FileReadInput.parse(rawInput);
```

3. **Error Handling**:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ToolExecutionError extends AppError {
  constructor(toolName: string, message: string) {
    super(`Tool '${toolName}' failed: ${message}`, "TOOL_EXECUTION_ERROR", 500);
  }
}

// Use in Hono
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});
```

4. **Dependency Injection**:

```typescript
// backend/src/context.ts
export interface AppContext {
  db: Database;
  providers: ProviderRegistry;
  tools: ToolRegistry;
  eventBus: EventEmitter;
}

export const createContext = (): AppContext => ({
  db: createDatabase(),
  providers: new ProviderRegistry(),
  tools: new ToolRegistry(),
  eventBus: new EventEmitter(),
});

// Use in routes
app.use("*", async (c, next) => {
  c.set("context", createContext());
  await next();
});
```

5. **Async/Await Best Practices**:

```typescript
// Always handle Promise rejections
try {
  const result = await tool.execute(input, context);
  return result;
} catch (error) {
  throw new ToolExecutionError(tool.name, error.message);
}

// Use Promise.all for parallel operations
const [files, diagnostics] = await Promise.all([
  readFiles(paths),
  runDiagnostics(code),
]);

// Use for await...of for streams
for await (const chunk of stream) {
  eventBus.emit("message.delta", chunk);
}
```

---

## Summary & Key Takeaways

### Architecture Principles

1. **Event-driven streaming** enables real-time, responsive UIs
2. **Tool-based extensibility** provides clear abstraction boundaries
3. **Session-based state** simplifies context management
4. **Permission systems** balance automation with control
5. **Provider abstraction** enables multi-model support

### Technology Choices

- **Bun**: Faster than Node, built-in TypeScript, SQLite support
- **Hono**: Lightweight (4KB), fast, edge-compatible
- **Drizzle**: Type-safe ORM with excellent PostgreSQL support
- **Zod**: Runtime validation + type inference
- **Vitest**: Fast, modern, Vite-native testing
- **TailwindCSS**: Utility-first, small bundles
- **Tauri** (future): Small bundles, fast, secure

### Critical Success Factors

1. **Start with web UI** (faster iteration than desktop)
2. **SSE for streaming** (simpler than WebSockets)
3. **Zod everywhere** (catch errors early)
4. **Test as you build** (maintain 90%+ coverage)
5. **Mode enforcement in tools** (security by design)

This implementation plan provides a production-ready foundation that can scale to support advanced features while maintaining the simplicity and clarity demonstrated by the analyzed projects.
