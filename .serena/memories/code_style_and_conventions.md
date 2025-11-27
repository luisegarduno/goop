# Code Style and Conventions

## General Conventions

### Language & Types
- **TypeScript** throughout the entire codebase
- Strict mode enabled (via tsconfig.json)
- Use type inference where appropriate, explicit types for public APIs
- Prefer interfaces for object shapes, types for unions/intersections

### Naming Conventions
- **Files**: kebab-case for regular files (e.g., `read-file.ts`), PascalCase for components (e.g., `Terminal.tsx`)
- **Variables & Functions**: camelCase (e.g., `sessionId`, `createSession`)
- **Classes & Types**: PascalCase (e.g., `ReadFileTool`, `ToolContext`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `DATABASE_URL`)
- **Interfaces**: PascalCase, no "I" prefix (e.g., `Tool`, not `ITool`)

### Code Organization

#### Backend Patterns
- **Provider Pattern**: Abstract `Provider` interface with concrete implementations (e.g., `AnthropicProvider`)
- **Tool Pattern**: All tools implement `Tool<T>` interface with `name`, `description`, `schema`, and `execute()` method
- **Zod Validation**: All input schemas defined with Zod for runtime validation and type inference
- **Async Generators**: Use for streaming operations (e.g., `async *stream()`)
- **Error Handling**: Throw descriptive errors, catch at boundaries, return error messages as strings for tools

#### Frontend Patterns
- **Component Structure**: Functional components with TypeScript
- **State Management**: Zustand store in `src/stores/` (no prop drilling)
- **Custom Hooks**: Extract reusable logic (e.g., `useSSE` for Server-Sent Events)
- **API Client**: Centralized in `src/api/client.ts` with typed functions

### File Structure Patterns

#### Backend (`packages/backend/src/`)
```
api/          # HTTP routes and SSE endpoints
config/       # Configuration loading and schemas
db/           # Database client, schema, migrations
providers/    # AI provider implementations
session/      # Session manager (conversation orchestration)
streaming/    # SSE event types and formatting
tools/        # Tool implementations
index.ts      # Server entry point
```

#### Frontend (`packages/frontend/src/`)
```
api/          # Backend API client
components/   # React components
hooks/        # Custom React hooks
stores/       # Zustand state stores
styles/       # Global styles and Tailwind
App.tsx       # Root component
main.tsx      # React entry point
```

### Import Conventions
- Use explicit imports/exports (verbatimModuleSyntax enabled)
- Group imports: external libraries, then internal modules
- Use relative paths for local imports

### Comments & Documentation
- Use JSDoc comments for public APIs and complex functions
- Inline comments for non-obvious logic
- Comprehensive README and CLAUDE.md for project documentation

### Security Practices
- **Path Validation**: Always validate file paths stay within working directory
- **Input Validation**: Use Zod schemas for all user/AI input
- **Error Messages**: Don't expose sensitive information in error messages
- **Environment Variables**: Never commit `.env` files (use `.env.example`)

### Async/Await
- Prefer `async/await` over raw promises
- Use `try/catch` for error handling in async functions
- Use async generators (`async *function`) for streaming

### Database
- **Drizzle ORM**: Define schemas in `src/db/schema.ts`
- **Migrations**: Generate with `db:generate`, apply with `db:migrate`
- **Relations**: Use Drizzle relations for joins
- **UUIDs**: All primary keys are UUIDs with `gen_random_uuid()` default
- **Cascade Deletes**: Configure in schema (e.g., deleting session deletes all messages)

### React Conventions
- Use functional components (no class components)
- React 19 features (no legacy patterns)
- TailwindCSS for styling (no CSS modules or styled-components)
- Event handlers named with "handle" prefix (e.g., `handleSubmit`)

### Testing
- Bun's built-in test runner
- Test files co-located with source code or in `__tests__` directories
- Test coverage goal: 90%+ (future enhancement)
