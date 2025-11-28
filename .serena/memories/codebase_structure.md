# Codebase Structure

## Monorepo Layout

```
goop/
├── .claude/                 # Claude Code configuration
├── .git/                    # Git repository
├── .serena/                 # Serena MCP indexing data
├── node_modules/            # Dependencies (managed by Bun)
├── packages/                # Workspace packages
│   ├── backend/            # Backend server package
│   └── frontend/           # Frontend UI package
├── thoughts/                # Development notes and planning
├── .env                     # Environment variables (not committed)
├── .env.example             # Environment variable template
├── .gitignore               # Git ignore rules
├── bun.lockb                # Bun lockfile
├── CLAUDE.md                # Claude Code instructions
├── docker-compose.yml       # PostgreSQL container configuration
├── index.ts                 # Placeholder/utility entry point
├── Info.md                  # Additional project information
├── LICENSE                  # License file
├── package.json             # Monorepo root package config
├── README.md                # User-facing documentation
├── setup.sh                 # Quick setup script
├── spec.md                  # Project specifications
└── tsconfig.json            # Root TypeScript configuration
```

## Backend Package (`packages/backend/`)

```
packages/backend/
├── dist/                    # Build output (gitignored)
├── drizzle/                 # Drizzle Kit cache (gitignored)
├── node_modules/            # Package-specific dependencies
├── src/                     # Source code
│   ├── api/
│   │   └── routes.ts        # REST API and SSE endpoints
│   ├── config/
│   │   ├── index.ts         # Config loader with Zod validation
│   │   └── schema.ts        # Zod schemas for message types
│   ├── db/
│   │   ├── index.ts         # Drizzle client initialization
│   │   ├── schema.ts        # Database schema with relations
│   │   ├── migrate.ts       # Migration runner script
│   │   └── migrations/      # Generated SQL migrations
│   ├── providers/
│   │   ├── base.ts          # Abstract Provider interface
│   │   ├── index.ts         # Provider registry and utilities
│   │   ├── anthropic.ts     # Anthropic Claude provider
│   │   └── openai.ts        # OpenAI GPT provider
│   ├── session/
│   │   └── index.ts         # Session manager (conversation orchestrator)
│   ├── streaming/
│   │   └── index.ts         # SSE event types and formatting
│   ├── tools/
│   │   ├── base.ts          # Tool interface definition
│   │   ├── index.ts         # Tool registry and execution
│   │   ├── read.ts          # Read file tool implementation
│   │   ├── write.ts         # Write file tool implementation
│   │   ├── edit.ts          # Edit file tool implementation
│   │   ├── grep.ts          # Grep tool implementation (regex search)
│   │   └── glob.ts          # Glob tool implementation (file pattern matching)
│   ├── utils/
│   │   ├── security.ts      # Security utilities for path validation
│   │   └── validation.ts    # API key validation utilities
│   └── index.ts             # Hono server entry point
├── drizzle.config.ts        # Drizzle Kit configuration
├── package.json             # Backend package config
└── tsconfig.json            # Backend TypeScript config
```

## Frontend Package (`packages/frontend/`)

```
packages/frontend/
├── dist/                    # Build output (gitignored)
├── node_modules/            # Package-specific dependencies
├── public/                  # Static assets
├── src/                     # Source code
│   ├── api/
│   │   └── client.ts        # Backend API communication
│   ├── assets/              # Images, fonts, etc.
│   ├── components/
│   │   ├── InputBox.tsx        # Message input component with auto-focus
│   │   ├── SessionSwitcher.tsx # Dropdown for switching between sessions
│   │   ├── SetupModal.tsx      # Session setup modal (title, workingDir, provider, model)
│   │   ├── SettingsModal.tsx   # Settings modal for updating session configuration
│   │   └── Terminal.tsx        # Main message display component with auto-scroll
│   ├── hooks/
│   │   └── useSSE.ts        # Server-Sent Events hook
│   ├── stores/
│   │   └── session.ts       # Zustand state store
│   ├── styles/
│   │   └── index.css        # Tailwind imports and base styles
│   ├── App.tsx              # Root component
│   └── main.tsx             # React entry point
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json             # Frontend package config
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # Frontend TypeScript config
├── tsconfig.app.json        # App-specific TS config
├── tsconfig.node.json       # Vite config TS config
└── vite.config.ts           # Vite build configuration
```

## Database Schema (PostgreSQL)

Three main tables with cascade delete relationships:

1. **sessions**: Chat sessions with working directory and provider settings
   - Columns: id (UUID), title, working_directory, provider, model, created_at, updated_at
   - Migrations: 0001 added working_directory, 0002 added provider and model columns

2. **messages**: Messages within sessions
   - Columns: id (UUID), session_id (FK), role, created_at
   - Relation: Many messages per session

3. **message_parts**: Parts of messages (text, tool_use, tool_result)
   - Columns: id (UUID), message_id (FK), type, content (JSONB), order
   - Relation: Many parts per message

## Key Directories

### Root Level
- `.claude/`: Claude Code configuration and slash commands
- `packages/`: All workspace packages (backend, frontend)
- `thoughts/`: Development planning and design documents

### Backend
- `src/api/`: HTTP routes and Server-Sent Events streaming
- `src/config/`: Environment and configuration management
- `src/db/`: Database client, schema, and migrations
- `src/providers/`: AI provider implementations (Anthropic and OpenAI, with provider registry)
- `src/session/`: Session manager orchestrating conversations
- `src/streaming/`: SSE event definitions
- `src/tools/`: Tool implementations (read_file, write_file, edit_file, grep, glob)

### Frontend
- `src/api/`: Backend communication layer
- `src/components/`: React components (Terminal, InputBox, SetupModal, SettingsModal, SessionSwitcher)
- `src/hooks/`: Custom React hooks (useSSE for streaming)
- `src/stores/`: Zustand state management
- `src/styles/`: Global CSS and Tailwind configuration

## Entry Points

- **Backend Server**: `packages/backend/src/index.ts` (Hono app)
- **Frontend App**: `packages/frontend/src/main.tsx` (React root)
- **Database Migrations**: `packages/backend/src/db/migrate.ts`
- **Root Scripts**: `package.json` (filters to workspace packages)

## Configuration Files

- **Root**: `tsconfig.json`, `package.json`, `.env`, `docker-compose.yml`
- **Backend**: `drizzle.config.ts`, `package.json`, `tsconfig.json`
- **Frontend**: `vite.config.ts`, `tailwind.config.js`, `eslint.config.js`, `package.json`, `tsconfig.json`
