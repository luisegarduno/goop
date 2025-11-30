# Code Style and Conventions

## Language & Types

- **TypeScript** throughout entire codebase with strict mode enabled
- Type inference preferred, explicit types for public APIs
- Interfaces for object shapes, types for unions/intersections

## Naming Conventions

- **Files**: kebab-case (`read-file.ts`), PascalCase for components (`Terminal.tsx`)
- **Variables & Functions**: camelCase (`sessionId`, `createSession`)
- **Classes & Types**: PascalCase (`ReadFileTool`, `ToolContext`)
- **Constants**: UPPER_SNAKE_CASE (`DATABASE_URL`)
- **Interfaces**: PascalCase, no "I" prefix (`Tool`, not `ITool`)

## Key Architectural Patterns

### 1. Environment Loading
All packages load `.env` from monorepo root:
```typescript
config({ path: "../../.env" });
```

### 2. Provider System
- Abstract `Provider` interface in `src/providers/base.ts`
- Async generator yields `StreamEvent` (text deltas, tool_use, completion)
- Per-session provider/model stored in database
- Anthropic: Static model list
- OpenAI: Dynamic model fetching from API

### 3. Tool System
- Tools implement `Tool<T>` with Zod schema, name, description, execute()
- Receive `ToolContext` with `workingDir` from session
- Security: Path validation prevents directory traversal
- Register in `src/tools/index.ts`
- Current tools: read_file, write_file, edit_file, grep, glob

### 4. Session Manager Flow
1. User message → session manager loads history from DB
2. Provider streams response with tool calls
3. Tools executed automatically, results fed back to provider
4. All message parts persisted to DB
5. Session timestamps updated

### 5. Zod Validation
- All input schemas defined with Zod for runtime validation
- Automatic type inference from Zod schemas
- JSON Schema conversion for AI tool definitions via `zod-to-json-schema`

### 6. Database Migrations
```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration: bun run db:generate
# 3. Review SQL in src/db/migrations/
# 4. Apply: bun run db:migrate
```

### 7. Frontend State Management
- Zustand store in `src/stores/session.ts` (no prop drilling)
- Persists to localStorage for page refresh
- SSE hook (`useSSE.ts`) updates store with streaming deltas

### 8. Server-Sent Events (SSE)
- Event types: message.start, message.delta, tool.start, tool.result, message.done
- Formatted in `src/streaming/index.ts`
- Frontend connects via EventSource API
- Content-Type: `text/event-stream`

## Security Practices

- **Path Validation**: All file tools validate paths stay within working directory
- **Input Validation**: Zod schemas for all user/AI input
- **Error Messages**: Don't expose sensitive information
- **Environment Variables**: Never commit `.env` (use `.env.example`)
- **API Keys**: Validated but NOT stored in database

## Code Organization

### Backend Structure
```
src/
├── api/routes.ts          # REST & SSE endpoints
├── config/                # Zod-validated config
├── db/                    # Schema, migrations, client
├── providers/             # AI provider implementations
├── session/index.ts       # Conversation orchestration
├── streaming/index.ts     # SSE event formatting
├── tools/                 # Tool implementations
└── index.ts               # Hono server entry
```

### Frontend Structure
```
src/
├── api/client.ts          # Backend API calls
├── components/            # React components
├── hooks/useSSE.ts        # EventSource hook
├── stores/session.ts      # Zustand store
└── App.tsx                # Root component
```

## Async/Await

- Prefer `async/await` over raw promises
- Use `try/catch` for error handling
- Use async generators (`async *function`) for streaming

## React Conventions

- Functional components only (no classes)
- React 19 features
- TailwindCSS for styling
- Event handlers: "handle" prefix (`handleSubmit`)

## Database Conventions

- Drizzle ORM schemas in `src/db/schema.ts`
- UUIDs for all primary keys with `gen_random_uuid()` default
- Cascade deletes configured in schema
- Relations defined for efficient joins
