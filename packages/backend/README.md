# @goop/backend

The backend API server for the goop AI Coding Agent, built with Bun, Hono, and PostgreSQL.

## Overview

This package provides a REST API with Server-Sent Events (SSE) streaming for real-time AI conversations. It integrates with the Anthropic Claude API, manages conversation state in PostgreSQL, and provides a pluggable tool system for extending AI capabilities.

**Key Features:**

- RESTful API with Hono web framework
- Real-time streaming via Server-Sent Events (SSE)
- Anthropic Claude integration with tool use support
- Conversation persistence with PostgreSQL + Drizzle ORM
- Extensible provider system for multiple AI backends
- Type-safe tool system with Zod validation
- Session-based conversation management

## Tech Stack

### Core Dependencies

- **[Bun](https://bun.sh)** - Runtime and package manager
- **[Hono](https://hono.dev/)** (^4.0.0) - Lightweight web framework
- **[Drizzle ORM](https://orm.drizzle.team/)** (0.44.7) - Type-safe database ORM
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** (0.31.7) - Database migration toolkit
- **[Postgres](https://www.npmjs.com/package/postgres)** (^3.4.0) - PostgreSQL client for Node.js
- **[Zod](https://zod.dev/)** (^3.25.76) - Schema validation and type inference
- **[Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk)** (^0.24.0) - Official Claude API client
- **[zod-to-json-schema](https://www.npmjs.com/package/zod-to-json-schema)** (^3.22.0) - Convert Zod schemas to JSON Schema
- **[dotenv](https://www.npmjs.com/package/dotenv)** (^17.2.3) - Environment variable loading

## Project Structure

```
packages/backend/
├── src/
│   ├── index.ts              # Application entry point (Hono server setup)
│   ├── config/               # Configuration management
│   │   ├── index.ts          # Config loader with Zod validation
│   │   └── schema.ts         # Zod schemas for message types
│   ├── db/                   # Database layer
│   │   ├── index.ts          # Drizzle client initialization
│   │   ├── schema.ts         # Database schema (sessions, messages, message_parts)
│   │   ├── migrate.ts        # Migration runner script
│   │   └── migrations/       # Generated SQL migration files
│   ├── api/                  # HTTP routes
│   │   └── routes.ts         # REST endpoints and SSE streaming
│   ├── providers/            # AI provider integrations
│   │   ├── base.ts           # Provider interface definition
│   │   └── anthropic.ts      # Anthropic Claude provider implementation
│   ├── tools/                # Tool system
│   │   ├── base.ts           # Tool interface definition
│   │   ├── index.ts          # Tool registry
│   │   └── read.ts           # Read file tool implementation
│   ├── session/              # Session management
│   │   └── index.ts          # SessionManager (orchestrates AI + tools)
│   └── streaming/            # SSE utilities
│       └── index.ts          # SSE event types and formatting
├── drizzle.config.ts         # Drizzle Kit configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) with Docker Compose (for PostgreSQL)
- Anthropic API key

### Installation

1. **Install dependencies:**
   ```bash
   cd packages/backend
   bun install
   ```

2. **Set up environment variables:**

   Create a `.env` file in the project root (not in `packages/backend`):
   ```bash
   # Database
   DATABASE_URL=postgresql://goop:pass123@localhost:5432/db
   POSTGRES_DB=db
   POSTGRES_USER=goop
   POSTGRES_PASSWORD=pass123

   # Anthropic API
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here

   # Server
   HONO_BACKEND_PORT=3001
   NODE_ENV=development
   ```

3. **Start PostgreSQL:**
   ```bash
   # From project root
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   bun run db:migrate
   ```

5. **Start development server:**
   ```bash
   bun run dev
   ```

   The server will start on `http://localhost:3001` with hot reload enabled.

### Available Scripts

```bash
# Development
bun run dev          # Start server with hot reload (watches src/index.ts)

# Database
bun run db:generate  # Generate migration files from schema changes
bun run db:migrate   # Apply migrations to database
bun run db:studio    # Open Drizzle Studio (database GUI)

# Build & Production
bun run build        # Build for production
bun run start        # Run production build

# Quality
bun test             # Run tests
bun run typecheck    # Type-check without emitting files
```

## API Endpoints

### Sessions

#### Create Session
```http
POST /api/sessions
Content-Type: application/json

Response:
{
  "id": "uuid",
  "title": "New Conversation",
  "createdAt": "2025-11-25T...",
  "updatedAt": "2025-11-25T..."
}
```

#### Get Session
```http
GET /api/sessions/:id

Response:
{
  "id": "uuid",
  "title": "New Conversation",
  "createdAt": "2025-11-25T...",
  "updatedAt": "2025-11-25T..."
}
```

#### List Sessions
```http
GET /api/sessions

Response:
[
  {
    "id": "uuid",
    "title": "New Conversation",
    "createdAt": "2025-11-25T...",
    "updatedAt": "2025-11-25T..."
  }
]
```

### Messages

#### Get Session Messages
```http
GET /api/sessions/:id/messages

Response:
[
  {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "user",
    "createdAt": "2025-11-25T...",
    "parts": [
      {
        "id": "uuid",
        "messageId": "uuid",
        "type": "text",
        "content": { "text": "Hello!" },
        "order": 0
      }
    ]
  }
]
```

#### Send Message (SSE Streaming)
```http
POST /api/sessions/:id/messages
Content-Type: application/json

{
  "content": "Can you read the README.md file?",
  "workingDir": "/path/to/project"
}

Response:
Content-Type: text/event-stream

event: message.start
data: {"type":"message.start","messageId":"uuid"}

event: message.delta
data: {"type":"message.delta","text":"Sure, I'll "}

event: tool.start
data: {"type":"tool.start","toolName":"read_file","toolId":"toolu_123","input":{"path":"README.md"}}

event: tool.result
data: {"type":"tool.result","toolId":"toolu_123","result":"# goop..."}

event: message.delta
data: {"type":"message.delta","text":"Here's the content..."}

event: message.done
data: {"type":"message.done","messageId":"uuid"}
```

#### SSE Events Connection
```http
GET /api/sessions/:id/events

Response:
Content-Type: text/event-stream

event: connected
data: {"sessionId":"uuid"}

:ping
```

### Health Check

```http
GET /health

Response:
{
  "status": "ok"
}
```

## Architecture

### Providers

Providers are AI backend integrations that implement the `Provider` interface. They handle communication with AI APIs and normalize responses.

**Provider Interface:**
```typescript
interface Provider {
  name: string;
  stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent>;
}
```

**Current Providers:**
- **AnthropicProvider** (`src/providers/anthropic.ts`) - Claude 3.5 Haiku with streaming and tool use support

**Stream Events:**
- `{ type: "text", text: string }` - Text chunk from AI
- `{ type: "tool_use", toolUse: { id, name, input } }` - AI wants to use a tool
- `{ type: "done" }` - Stream complete

### Tools

Tools are capabilities that the AI can invoke during conversations. Each tool has a name, description, input schema, and execution logic.

**Tool Interface:**
```typescript
interface Tool<TInput = any> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<string>;
}
```

**Current Tools:**
- **ReadFileTool** (`src/tools/read.ts`) - Reads file contents with path security checks

**Tool Context:**
```typescript
interface ToolContext {
  workingDir: string;  // Base directory for file operations
}
```

### Session Manager

The `SessionManager` orchestrates the conversation flow between the AI provider, tools, and database.

**Responsibilities:**
- Store user messages in database
- Load conversation history
- Stream AI responses via provider
- Execute tools when requested by AI
- Store assistant messages and tool results
- Update session timestamps

**Flow:**
1. User sends message → stored in database
2. Load conversation history from database
3. Stream request to AI provider with tools
4. On text chunks → yield SSE events and store in database
5. On tool use → execute tool, store result, continue conversation
6. Update session timestamp when complete

### SSE Streaming

Server-Sent Events enable real-time streaming of AI responses to the frontend.

**Event Types:**
```typescript
type SSEEvent =
  | { type: "message.start"; messageId: string }
  | { type: "message.delta"; text: string }
  | { type: "tool.start"; toolName: string; toolId: string; input: any }
  | { type: "tool.result"; toolId: string; result: string }
  | { type: "message.done"; messageId: string };
```

**Format:**
```
event: message.delta
data: {"type":"message.delta","text":"Hello"}

```

## Configuration

Configuration is managed via environment variables and validated with Zod.

**Config Schema:**
```typescript
{
  database: {
    url: string  // PostgreSQL connection string
  },
  anthropic: {
    apiKey: string  // Anthropic API key
  },
  server: {
    port: number         // HTTP server port (default: 3001)
    env: "development" | "production" | "test"
  }
}
```

**Loading:**
```typescript
import { loadConfig } from "./config";

const config = loadConfig();  // Throws if validation fails
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `ANTHROPIC_API_KEY` - Anthropic API key (required)
- `HONO_BACKEND_PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (default: development)

## Database

### Schema

The database uses three tables with UUID primary keys and cascade delete relationships:

#### sessions
- `id` (uuid, primary key)
- `title` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### messages
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key → sessions.id, cascade delete)
- `role` (text) - 'user' | 'assistant'
- `created_at` (timestamp)

#### message_parts
- `id` (uuid, primary key)
- `message_id` (uuid, foreign key → messages.id, cascade delete)
- `type` (text) - 'text' | 'tool_use' | 'tool_result'
- `content` (jsonb) - Flexible JSON content
- `order` (integer) - Order of parts within message

### Migrations

**Generate migration from schema changes:**
```bash
bun run db:generate
```

This creates a new SQL migration file in `src/db/migrations/`.

**Apply migrations:**
```bash
bun run db:migrate
```

**Database GUI:**
```bash
bun run db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio`.

### Relations

Drizzle ORM provides type-safe relations for querying:

```typescript
// Query session with all messages and parts
const session = await db.query.sessions.findFirst({
  where: eq(sessions.id, sessionId),
  with: {
    messages: {
      with: {
        parts: true
      }
    }
  }
});
```

## Extending the Backend

### Adding a New Tool

1. **Create tool file** in `src/tools/`:

```typescript
// src/tools/write.ts
import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { writeFile } from "fs/promises";

export const WriteFileInputSchema = z.object({
  path: z.string().describe("File path to write"),
  content: z.string().describe("Content to write"),
});

export class WriteFileTool implements Tool<z.infer<typeof WriteFileInputSchema>> {
  name = "write_file";
  description = "Write content to a file";
  schema = WriteFileInputSchema;

  async execute(input: z.infer<typeof WriteFileInputSchema>, context: ToolContext) {
    // Implementation...
    await writeFile(/* ... */);
    return "File written successfully";
  }
}
```

2. **Register tool** in `src/tools/index.ts`:

```typescript
import { WriteFileTool } from "./write";

export const tools: Tool[] = [
  new ReadFileTool(),
  new WriteFileTool(),  // Add here
];
```

3. **Test the tool:**
```bash
bun run dev
# Ask AI to use the tool: "Write 'Hello' to test.txt"
```

### Adding a New Provider

1. **Create provider file** in `src/providers/`:

```typescript
// src/providers/openai.ts
import OpenAI from "openai";
import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";

export class OpenAIProvider implements Provider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    // Implementation...
  }
}
```

2. **Add config** in `src/config/index.ts`:

```typescript
const configSchema = z.object({
  // ... existing fields
  openai: z.object({
    apiKey: z.string().optional(),
  }),
});
```

3. **Update SessionManager** to support provider selection:

```typescript
constructor(providerName: string) {
  if (providerName === "openai") {
    this.provider = new OpenAIProvider(config.openai.apiKey);
  } else {
    this.provider = new AnthropicProvider();
  }
}
```

## Testing

### Unit Tests

Create tests in `src/**/*.test.ts`:

```typescript
// src/tools/read.test.ts
import { describe, test, expect } from "bun:test";
import { ReadFileTool } from "./read";

describe("ReadFileTool", () => {
  test("reads file content", async () => {
    const tool = new ReadFileTool();
    const result = await tool.execute(
      { path: "package.json" },
      { workingDir: process.cwd() }
    );
    expect(result).toContain("@goop/backend");
  });
});
```

Run tests:
```bash
bun test
```

### Integration Testing

Test end-to-end flows with curl:

```bash
# Create session
SESSION=$(curl -X POST http://localhost:3001/api/sessions | jq -r '.id')

# Send message
curl -X POST http://localhost:3001/api/sessions/$SESSION/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!","workingDir":"'"$(pwd)"'"}'

# Get messages
curl http://localhost:3001/api/sessions/$SESSION/messages
```

## Troubleshooting

### Database Connection Issues

**Problem:** `Error: Connection failed`

**Solution:**
1. Check PostgreSQL is running: `docker-compose ps`
2. Verify DATABASE_URL in `.env`
3. Test connection: `psql $DATABASE_URL`

### Migration Errors

**Problem:** `Migration failed: relation already exists`

**Solution:**
1. Check migration history: `psql $DATABASE_URL -c "SELECT * FROM drizzle_migrations"`
2. Delete duplicate migration files
3. Re-run: `bun run db:migrate`

### Anthropic API Errors

**Problem:** `401 Unauthorized`

**Solution:**
1. Verify `ANTHROPIC_API_KEY` in `.env`
2. Check API key is valid at https://console.anthropic.com
3. Restart dev server after updating `.env`

### Hot Reload Not Working

**Problem:** Code changes don't trigger restart

**Solution:**
1. Use `bun run dev` (not `bun src/index.ts`)
2. Check `package.json` dev script: `"dev": "bun --watch src/index.ts"`
3. Restart manually if needed

## Performance Considerations

### Current (Phase 1)
- No optimization needed for MVP
- Focus on correctness and functionality

### Future Optimizations
- **Context window management** - Prune old messages when approaching token limits
- **Database indexing** - Add indexes on `session_id`, `created_at`
- **Tool result caching** - Cache repeated file reads
- **Connection pooling** - Configure PostgreSQL connection pool
- **Streaming batching** - Batch small text deltas to reduce SSE overhead

## Next Steps

This backend implements **Phase 1: Foundation** from the specification. Future phases will add:

- **Phase 2:** Additional providers (OpenAI, Google Gemini, llama.cpp)
- **Phase 3:** More tools (write_file, edit_file, bash, grep, glob)
- **Phase 4:** Approval system for dangerous operations
- **Phase 5:** Mode enforcement (Ask/Plan/Build)
- **Phase 6:** Comprehensive testing (90%+ coverage)

See the [implementation plan](/thoughts/shared/plans/2025-11-24-goop-foundation.md) for details.

## License

MIT
