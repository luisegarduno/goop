# AI Coding Agent Architecture Analysis & Implementation Guide

## Implementation Plan - TypeScript AI Coding Agent

### Project Specifications

**Core Requirements**:

- **Runtime**: Bun + TypeScript
- **Frontend**: React + TailwindCSS (terminal-like web UI on localhost)
- **Backend**: Lightweight HTTP server (Hono)
- **AI Providers**: Anthropic, OpenAI, Google, llama.cpp local models
- **Modes**: Ask (read-only Q&A), Plan (read-only analysis), Build (development)
- **Approval**: Y/N prompts for each tool call
- **File Specification**: @ symbol for files/folders
- **Streaming**: Real-time tool call updates to UI
- **Database**: PostgreSQL + node-postgres + Drizzle ORM
- **Schema**: Zod validation everywhere
- **Testing**: 90%+ code coverage with Vitest
- **CI/CD**: GitHub Actions
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
│     PostgreSQL Database                 │
│  - sessions                             │
│  - messages                             │
│  - message_parts                        │
│  - tool_calls                           │
│  - approvals                            │
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
│   │   │   │   ├── index.ts             # Load .env, config files
│   │   │   │   └── schema.ts            # Zod config schemas
│   │   │   ├── db/
│   │   │   │   ├── index.ts             # Drizzle client
│   │   │   │   ├── schema.ts            # Drizzle schema definitions
│   │   │   │   └── migrations/          # SQL migrations
│   │   │   ├── providers/
│   │   │   │   ├── index.ts             # Provider registry
│   │   │   │   ├── base.ts              # Abstract provider interface
│   │   │   │   ├── anthropic.ts         # Claude integration
│   │   │   │   ├── openai.ts            # GPT integration
│   │   │   │   ├── google.ts            # Gemini integration
│   │   │   │   └── llamacpp.ts          # Local model integration
│   │   │   ├── tools/
│   │   │   │   ├── index.ts             # Tool registry
│   │   │   │   ├── base.ts              # Tool interface
│   │   │   │   ├── read.ts              # File reading (Ask/Plan/Build)
│   │   │   │   ├── write.ts             # File writing (Build only)
│   │   │   │   ├── edit.ts              # File editing (Build only)
│   │   │   │   ├── bash.ts              # Shell commands (Build only)
│   │   │   │   ├── grep.ts              # Code search (all modes)
│   │   │   │   └── glob.ts              # File listing (all modes)
│   │   │   ├── session/
│   │   │   │   ├── index.ts             # Session manager
│   │   │   │   ├── modes.ts             # Ask/Plan/Build mode logic
│   │   │   │   └── context.ts           # Context window management
│   │   │   ├── approval/
│   │   │   │   ├── index.ts             # Approval manager
│   │   │   │   └── strategies.ts        # Approval strategies (Y/N)
│   │   │   ├── streaming/
│   │   │   │   ├── index.ts             # SSE event emitter
│   │   │   │   └── types.ts             # Event type definitions
│   │   │   ├── api/
│   │   │   │   ├── routes.ts            # API route definitions
│   │   │   │   ├── sessions.ts          # Session endpoints
│   │   │   │   ├── messages.ts          # Message endpoints
│   │   │   │   └── events.ts            # SSE endpoint
│   │   │   └── utils/
│   │   │       ├── errors.ts            # Error handling
│   │   │       ├── logger.ts            # Logging utility
│   │   │       └── validation.ts        # Zod validation helpers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx                 # Entry point
│       │   ├── App.tsx                  # Root component
│       │   ├── components/
│       │   │   ├── Terminal.tsx         # Terminal-like UI
│       │   │   ├── MessageList.tsx      # Chat history
│       │   │   ├── InputBox.tsx         # User input with @ support
│       │   │   ├── ApprovalPrompt.tsx   # Y/N approval UI
│       │   │   ├── StreamingIndicator.tsx  # Loading states
│       │   │   └── ModeSelector.tsx     # Ask/Plan/Build toggle
│       │   ├── hooks/
│       │   │   ├── useSession.ts        # Session state management
│       │   │   ├── useSSE.ts            # SSE connection hook
│       │   │   └── useFileSelector.ts   # @ symbol file picker
│       │   ├── stores/
│       │   │   ├── session.ts           # Zustand store for session
│       │   │   └── ui.ts                # UI state store
│       │   ├── api/
│       │   │   └── client.ts            # Backend API client
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

- Drizzle ORM setup with node-postgres
- Schema definitions:
  ```typescript
  sessions: id, title, mode, created_at, updated_at;
  messages: id, session_id, role, content, created_at;
  message_parts: id, message_id, type, content, order;
  tool_calls: id, message_id, tool_name, input, output, status;
  approvals: id, tool_call_id, approved, feedback, created_at;
  ```
- Migration management
- Connection pooling

**3. Providers Module** (`backend/src/providers/`)

- Abstract `Provider` interface:
  ```typescript
  interface Provider {
    name: string;
    stream(messages: Message[], tools: Tool[]): AsyncGenerator<Event>;
    listModels(): Promise<Model[]>;
  }
  ```
- Anthropic: Messages API with streaming
- OpenAI: Chat completions with streaming
- Google: Gemini Pro API
- llama.cpp: HTTP API adapter

**4. Tools Module** (`backend/src/tools/`)

- Abstract `Tool` interface:
  ```typescript
  interface Tool {
    name: string;
    description: string;
    schema: ZodSchema;
    modes: Mode[]; // Which modes allow this tool
    execute(input: z.infer<Schema>, context: Context): Promise<Result>;
  }
  ```
- File tools: read (all), write/edit (Build only)
- Shell: bash (Build only, requires approval)
- Search: grep (all), glob (all)
- Mode enforcement at tool registry level

**5. Session Module** (`backend/src/session/`)

- Create/resume sessions
- Message history management
- Mode switching (Ask/Plan/Build)
- Context window pruning strategies
- @ symbol file resolution

**6. Approval Module** (`backend/src/approval/`)

- Intercept tool calls requiring approval
- Create pending approval records in DB
- Stream approval requests to UI via SSE
- Wait for Y/N response from frontend
- Execute or cancel based on response

**7. Streaming Module** (`backend/src/streaming/`)

- SSE event emitter for real-time updates
- Event types:
  ```typescript
  "session.created", "session.updated";
  "message.started", "message.delta", "message.completed";
  "tool.started", "tool.progress", "tool.completed";
  "approval.requested", "approval.responded";
  ```
- Event bus for internal pub/sub

**8. API Module** (`backend/src/api/`)

- Hono routes:
  - POST `/api/sessions` - Create session
  - GET `/api/sessions/:id` - Get session
  - POST `/api/sessions/:id/messages` - Send message
  - GET `/api/events` - SSE endpoint for all events
  - POST `/api/approvals/:id` - Respond to approval

#### Frontend Modules

**1. Terminal Component** (`frontend/src/components/Terminal.tsx`)

- Terminal-like UI with TailwindCSS
- Dark theme, monospace font
- Auto-scroll to latest message
- Message type rendering (user/assistant/tool/approval)

**2. Input Box** (`frontend/src/components/InputBox.tsx`)

- Text input with @ autocomplete
- File/folder picker on @
- Submit on Enter, multi-line support
- Mode indicator

**3. Approval Prompt** (`frontend/src/components/ApprovalPrompt.tsx`)

- Display tool call details
- Y/N buttons with keyboard shortcuts
- Show tool name, input parameters
- Feedback text input on deny

**4. Session Hook** (`frontend/src/hooks/useSession.ts`)

- Manage session state (Zustand)
- Send messages to backend
- Handle message history
- Mode switching

**5. SSE Hook** (`frontend/src/hooks/useSSE.ts`)

- Connect to `/api/events` on mount
- Parse SSE events
- Update session store
- Handle reconnection

**6. File Selector Hook** (`frontend/src/hooks/useFileSelector.ts`)

- Detect @ symbol in input
- Fetch file/folder list from backend
- Show autocomplete dropdown
- Insert selected path

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

#### Phase 2: Provider Integration

1. **Provider abstraction**:

   - Create `backend/src/providers/base.ts` with interface
   - Install provider SDKs:
     ```bash
     bun add @anthropic-ai/sdk openai @google/generative-ai
     ```

2. **Anthropic provider**:

   - Implement in `backend/src/providers/anthropic.ts`
   - Test streaming with basic prompt
   - Handle tool calls in response

3. **OpenAI provider**:
   - Implement in `backend/src/providers/openai.ts`
   - Test streaming
   - Ensure consistent interface with Anthropic

#### Phase 3: Core Tools

1. **Tool registry**:

   - Create `backend/src/tools/base.ts` with Tool interface
   - Create `backend/src/tools/index.ts` registry

2. **File tools**:

   - `read.ts`: Read file contents (async fs.readFile)
   - `write.ts`: Write file (async fs.writeFile)
   - `edit.ts`: Apply diff-based edits
   - Zod schemas for each

3. **Bash tool**:

   - `bash.ts`: Execute shell commands with child_process
   - Capture stdout/stderr
   - Timeout support

4. **Search tools**:
   - `grep.ts`: Use ripgrep or grep command
   - `glob.ts`: File listing with minimatch

#### Phase 4: Session & Approval

1. **Session manager**:

   - Create `backend/src/session/index.ts`
   - Implement create/resume/list sessions
   - Message history persistence to PostgreSQL
   - Mode enforcement (Ask/Plan/Build)

2. **Approval system**:

   - Create `backend/src/approval/index.ts`
   - Intercept tool calls
   - Create approval records
   - Wait for UI response
   - Execute or cancel tool

3. **API routes**:
   - Sessions CRUD endpoints
   - Messages POST endpoint
   - Approvals POST endpoint

#### Phase 5: Streaming & Frontend

1. **SSE implementation**:

   - Create `backend/src/streaming/index.ts`
   - Event bus with typed events
   - `/api/events` SSE endpoint
   - Test with curl/Postman

2. **Frontend session hook**:

   - `frontend/src/hooks/useSession.ts`
   - Zustand store for session state
   - API client functions

3. **Frontend SSE hook**:

   - `frontend/src/hooks/useSSE.ts`
   - EventSource connection
   - Parse events and update store

4. **Terminal UI**:
   - `frontend/src/components/Terminal.tsx`
   - Message rendering with TailwindCSS
   - Streaming indicator
   - Auto-scroll

#### Phase 6: Testing & Polish

1. **Backend tests**:

   - Tool tests (unit): Each tool with mocked context
   - Provider tests (integration): Mock API responses
   - Session tests: CRUD operations
   - Approval flow tests: End-to-end approval scenario
   - Vitest config targeting 90%+ coverage

2. **Frontend tests**:

   - Component tests: Terminal, ApprovalPrompt, InputBox
   - Hook tests: useSession, useSSE
   - Vitest + React Testing Library

3. **GitHub Actions**:

   - `.github/workflows/ci.yml`: Run tests on push/PR
   - `.github/workflows/coverage.yml`: Upload to Codecov
   - PostgreSQL service in CI

4. **Documentation**:
   - README with setup instructions
   - Environment variable docs
   - API documentation

### Minimal Library Recommendations

#### Backend

```json
{
  "dependencies": {
    "hono": "^4.0.0", // HTTP server (4KB, fast)
    "@hono/node-server": "^1.0.0", // Node adapter for Hono
    "drizzle-orm": "^0.30.0", // Type-safe ORM
    "postgres": "^3.4.0", // PostgreSQL client (node-postgres)
    "zod": "^3.22.0", // Schema validation
    "@anthropic-ai/sdk": "^0.24.0",
    "openai": "^4.28.0",
    "@google/generative-ai": "^0.2.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0", // Migrations
    "vitest": "^1.2.0", // Testing
    "@vitest/coverage-v8": "^1.2.0"
  }
}
```

#### Frontend

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0", // State management (2KB)
    "clsx": "^2.1.0" // Class name utility
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.0",
    "@vitejs/plugin-react": "^4.2.0"
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

### Recommendation for AI Coding Agent

**Tauri is recommended** for this use case:

1. **Bundle size**: Critical for distribution and downloads
2. **Performance**: Faster startup improves development workflow
3. **Security**: Rust IPC layer provides better sandboxing for shell commands
4. **Memory**: Lower footprint important when LLMs may run locally
5. **Modern**: Better fit for 2025+ projects

**Implementation note**: For the given timeline, **Start with web-based UI** (React + Vite on localhost). Desktop wrapper can be added later:

```bash
# After web UI works:
cargo install tauri-cli
cargo tauri init
# Configure Tauri to point to existing Vite frontend
cargo tauri dev
```

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
  mode: text("mode").notNull(), // 'ask' | 'plan' | 'build'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => sessions.id)
    .notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageParts = pgTable("message_parts", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => messages.id)
    .notNull(),
  type: text("type").notNull(), // 'text' | 'tool_call' | 'tool_result'
  content: jsonb("content").notNull(),
  order: integer("order").notNull(),
});

export const toolCalls = pgTable("tool_calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => messages.id)
    .notNull(),
  toolName: text("tool_name").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  status: text("status").notNull(), // 'pending' | 'approved' | 'denied' | 'completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  toolCallId: uuid("tool_call_id")
    .references(() => toolCalls.id)
    .notNull(),
  approved: boolean("approved"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Connection**:

```typescript
// backend/src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/goop";
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
