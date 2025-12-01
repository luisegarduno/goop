# @goop/backend

Backend API server for the goop AI Coding Agent. Provides REST API with Server-Sent Events (SSE) streaming, multi-provider AI integration (Claude & GPT), conversation persistence with PostgreSQL, and a type-safe tool system for file operations.

**Key Features:**

- Multi-provider support (Anthropic Claude, OpenAI GPT)
- Real-time SSE streaming for AI responses
- PostgreSQL + Drizzle ORM for type-safe persistence
- Secure file tools (read, write, edit, grep, glob)
- Session-based working directories
- Zod schema validation throughout

## Tech Stack

| Package                | Purpose                      |
| ---------------------- | ---------------------------- |
| **Bun**                | Runtime & package manager    |
| **Hono**               | Web framework with CORS      |
| **Drizzle ORM**        | Type-safe PostgreSQL ORM     |
| **Drizzle Kit**        | Schema migrations            |
| **postgres**           | PostgreSQL client            |
| **Zod**                | Schema validation            |
| **zod-to-json-schema** | Zod → JSON Schema conversion |
| **@anthropic-ai/sdk**  | Claude API integration       |
| **openai**             | OpenAI GPT integration       |
| **fast-glob**          | File pattern matching        |
| **dotenv**             | Environment config           |

## File Structure

```
src/
├── api/routes.ts          # REST & SSE endpoints
├── config/
│   ├── index.ts           # Zod-validated config loader
│   └── schema.ts          # Message type schemas
├── db/
│   ├── schema.ts          # 3 tables: sessions, messages, message_parts
│   ├── migrate.ts         # Migration runner
│   └── migrations/        # Generated SQL files
├── providers/
│   ├── base.ts            # Provider interface
│   ├── index.ts           # Provider registry
│   ├── anthropic.ts       # Claude integration
│   └── openai.ts          # GPT integration
├── session/index.ts       # Conversation orchestration
├── streaming/index.ts     # SSE event formatting
├── tools/
│   ├── base.ts            # Tool interface
│   ├── index.ts           # Tool registry
│   └── {read,write,edit,grep,glob}.ts
├── utils/
│   ├── security.ts        # Path validation
│   └── validation.ts      # API key validation
└── index.ts               # Hono server entry
```

## Quick Start

**Prerequisites:** Bun >= 1.0, Docker, Anthropic API key

1. **Install dependencies** (from monorepo root):

   ```bash
   bun install
   ```

2. **Configure `.env`** in project root:

   ```env
   DATABASE_URL=postgresql://goop:pass123@localhost:5432/db
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...  # Optional
   HONO_BACKEND_PORT=3001
   NODE_ENV=development
   ```

3. **Start PostgreSQL**:

   ```bash
   docker-compose up -d
   ```

4. **Run migrations** (from `packages/backend`):

   ```bash
   cd packages/backend
   bun run db:migrate
   ```

5. **Start server**:
   ```bash
   bun run dev  # http://localhost:3001
   ```

## Common Commands

```bash
bun run dev          # Dev server with hot reload
bun run db:generate  # Generate migrations from schema
bun run db:migrate   # Apply migrations
bun run db:studio    # Database GUI
bun run build        # Production build
bun test             # Run tests
bun run typecheck    # Type check
```

## API Endpoints

**Base URL:** `http://localhost:3001`

### Core Endpoints

| Method | Endpoint                       | Description                                            |
| ------ | ------------------------------ | ------------------------------------------------------ |
| GET    | `/health`                      | Health check                                           |
| GET    | `/api/providers`               | List available AI providers                            |
| GET    | `/api/providers/:name/models`  | Get model list for provider                            |
| GET    | `/api/providers/:name/api-key` | Get masked API key from .env                           |
| POST   | `/api/providers/validate`      | Validate API key for provider                          |
| POST   | `/api/sessions`                | Create session with title, workingDir, provider, model |
| GET    | `/api/sessions`                | List all sessions (ordered by updatedAt)               |
| GET    | `/api/sessions/:id`            | Get session details                                    |
| PATCH  | `/api/sessions/:id`            | Update session settings (provider, model, workingDir)  |
| DELETE | `/api/sessions/:id`            | Delete session (cascades to messages)                  |
| GET    | `/api/sessions/:id/messages`   | Get message history with parts                         |
| POST   | `/api/sessions/:id/messages`   | Send message & stream response (SSE)                   |

### SSE Streaming Events

**POST** `/api/sessions/:id/messages` returns `text/event-stream` with:

- `message.start` - New message begins (messageId)
- `message.delta` - Text chunk from AI (text)
- `tool.start` - AI invokes tool (toolName, toolId, input)
- `tool.result` - Tool execution result (toolId, result)
- `message.done` - Message complete (messageId)

**Note:** `workingDirectory` is fetched from session. Tool execution triggers new `message.start` event before AI continues.

## Architecture

### Providers

AI backend integrations implementing `Provider` interface with async generator streaming:

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

- `AnthropicProvider` - Claude models (static model list)
- `OpenAIProvider` - GPT models (dynamic model fetching)

**Registry:** `src/providers/index.ts` exports `AVAILABLE_PROVIDERS`, `createProvider()`, `getProviderInfo()`

**Stream Events:** `text` (delta), `tool_use` (AI invocation), `done` (complete)

### Tools

Executable capabilities AI can invoke. Each tool has Zod schema, name, description, execute method:

```typescript
interface Tool<TInput = any> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<string>;
}
```

**Current Tools:**

- `read_file` - Read file contents with path validation
- `write_file` - Create/overwrite files with auto mkdir
- `edit_file` - String replacement (replaces all occurrences)
- `grep` - Regex pattern search with glob filtering & context lines
- `glob` - Find files/directories matching patterns (ignores node_modules, .git)

**Context:** `{ workingDir: string }` - session's base directory for operations

**Security:** All file tools validate paths stay within `workingDir`

### Session Manager

Orchestrates conversation flow: user message → AI response → tool execution → database persistence.

**Flow:**

1. Store user message in DB
2. Load conversation history (text + tool_use blocks)
3. Fetch session's workingDir for tool context
4. Stream AI response via provider
5. On text: yield SSE events, store in DB
6. On tool_use: execute tool, store result, emit `message.start`, continue
7. Update session timestamp

**Key Features:**

- Per-session provider/model configuration
- Working directory retrieved from session (not request body)
- Tool execution triggers new `message.start` event
- Complete content blocks in history (text + tool_use combined)

## Configuration

Zod-validated config from environment variables in root `.env`:

```typescript
{
  database: { url: string },  // Required
  anthropic: { apiKey?: string },  // Optional
  openai: { apiKey?: string },  // Optional
  server: { port: number, env: "development" | "production" | "test" }
}
```

**Environment Variables:**

- `DATABASE_URL` - PostgreSQL connection (required)
- `ANTHROPIC_API_KEY` - Claude API key (optional, can be per-session)
- `OPENAI_API_KEY` - GPT API key (optional, can be per-session)
- `HONO_BACKEND_PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (default: development)

## Database Schema

**PostgreSQL 17** with 3 tables, UUID PKs, cascade deletes:

**sessions**

- `id`, `title`, `working_directory`, `provider`, `model`, `created_at`, `updated_at`

**messages**

- `id`, `session_id` (FK), `role` (user|assistant), `created_at`

**message_parts**

- `id`, `message_id` (FK), `type` (text|tool_use|tool_result), `content` (jsonb), `order`

**Migrations:**

```bash
bun run db:generate  # Generate from schema changes
bun run db:migrate   # Apply to database
bun run db:studio    # Open Drizzle Studio GUI
```

**Relations:** Drizzle ORM provides type-safe queries with `with: { messages: { with: { parts: true } } }`

## Extending

### Adding a Tool

1. Create `src/tools/{name}.ts` with Zod schema and `Tool` implementation:

   ```typescript
   export const MyToolInputSchema = z.object({
     param: z.string().describe("Parameter description"),
   });

   export class MyTool implements Tool<z.infer<typeof MyToolInputSchema>> {
     name = "my_tool";
     description = "What this tool does";
     schema = MyToolInputSchema;

     async execute(
       input: z.infer<typeof MyToolInputSchema>,
       context: ToolContext
     ) {
       // Validate paths with context.workingDir
       return "Result string";
     }
   }
   ```

2. Register in `src/tools/index.ts`:

   ```typescript
   export const tools: Tool[] = [..., new MyTool()];
   ```

3. Tools auto-available to all providers

### Adding a Provider

1. Create `src/providers/{name}.ts` implementing `Provider` interface
2. Add API key to config schema in `src/config/index.ts`
3. Register in `src/providers/index.ts` → `AVAILABLE_PROVIDERS` array
4. Add to `createProvider()` factory function

See `src/providers/anthropic.ts` and `src/providers/openai.ts` for examples

## Testing

**Unit Tests:** Create `src/**/*.test.ts` with Bun test runner:

```typescript
import { describe, test, expect } from "bun:test";
```

**Run:** `bun test`

**Integration:** Use `curl` to test end-to-end flows (create session → send message → get messages)

## Troubleshooting

| Issue                          | Solution                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ |
| Database connection failed     | Check `docker-compose ps`, verify `DATABASE_URL`, test with `psql`       |
| Migration errors               | Check `drizzle_migrations` table, remove duplicates, re-run `db:migrate` |
| 401 Unauthorized / Invalid key | Verify API keys in `.env`, check provider console, restart server        |
| Hot reload not working         | Use `bun run dev` (not direct `bun src/index.ts`)                        |
| Tool execution errors          | Verify `workingDir` is accessible, check backend logs                    |

**API Key Validation:** Use `POST /api/providers/validate` to test keys

**Provider Consoles:**

- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com

---

**See [CLAUDE.md](../../CLAUDE.md) for detailed architecture, patterns, and project status.**
