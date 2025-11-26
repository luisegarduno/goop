# goop

An AI Coding Agent built with modern web technologies. goop provides an intelligent assistant for code analysis, planning, and development tasks through a clean web interface, powered by Claude API and built with Bun, React, and PostgreSQL.

## Project Overview

goop is designed to be a lightweight, extensible AI coding agent that can:

- Answer questions about your codebase (Ask mode)
- Analyze and create implementation plans (Plan mode)
- Assist with development tasks (Build mode)

The project is structured as a Bun workspace monorepo with separate frontend and backend packages, featuring:

- **Real-time AI streaming** via Server-Sent Events (SSE)
- **Tool system** with file reading capabilities (extensible for more tools)
- **Session management** with PostgreSQL persistence
- **Terminal-like web interface** for seamless interaction
- **Anthropic Claude integration** with support for tool calling
- **Type-safe architecture** with Zod validation and Drizzle ORM

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) & Docker Compose
- [Anthropic API key](https://console.anthropic.com/)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/luisegarduno/goop.git
   cd goop
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment variables**<br/>
   Copy `.env.example` to `.env` and add your Anthropic API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your Anthropic API key:

   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   Other variables are pre-configured for local development.

4. **Start PostgreSQL database**

   ```bash
   docker compose up -d
   ```

   Verify the database is running:

   ```bash
   docker ps | grep goop-agent-postgres
   ```

   <br/>

5. **Run database migrations**

   ```bash
   cd packages/backend
   bun run db:generate
   bun run db:migrate
   cd ../..
   ```

   You should see three tables: `sessions`, `messages`, and `message_parts`.

6. **Start development servers**<br/>
   ```bash
   bun run dev
   ```
   This starts both the backend API server (http://localhost:3001) and frontend dev server (http://localhost:3000).

## Usage

Once both servers are running, you can access the terminal interface at **http://localhost:3000**.

### Basic Usage

1. **Start a conversation**: Type a message in the input box at the bottom and press Enter or click "Send"
2. **Watch the streaming response**: Claude's response will appear in real-time as it's generated
3. **Ask Claude to read files**: Try asking "Can you read the README.md file?" or "What's in the spec.md file?"
4. **See tool usage**: When Claude uses the `read_file` tool, you'll see a visual indicator with the tool name
5. **Continue the conversation**: All messages persist in the database, maintaining full conversation context

### Example Interactions

**Ask about files:**

```
You: Can you read the package.json file and tell me what dependencies are installed?
```

**Request code analysis:**

```
You: Please read the src/db/schema.ts file and explain the database schema
```

**Multi-turn conversations:**

```
You: What files are in the packages/backend/src directory?
Assistant: [Uses read_file tool to explore]
You: Great, now can you read the providers/anthropic.ts file?
```

### Features in Action

- **Real-time Streaming**: Watch Claude "type" responses as they're generated, creating a natural conversation flow
- **Tool Visualization**: See when Claude uses tools with clear indicators showing tool name and status
- **Persistent Sessions**: Your conversations survive page refreshes and browser restarts
- **Terminal Aesthetic**: Dark theme with monospace font for a classic terminal experience
- **Type-safe Communication**: All data validated with Zod schemas throughout the stack

### Keyboard Shortcuts

- **Enter**: Send message (when input is focused)
- **Escape**: Focus the input box (coming soon)
- **Ctrl/Cmd + K**: Clear current session (coming soon)

## Project Structure

```
goop/
├── packages/
│   ├── backend/                    # Backend API (Bun + Hono + Drizzle)
│   │   ├── src/
│   │   │   ├── index.ts           # Hono server entry point
│   │   │   ├── api/               # API routes & SSE endpoints
│   │   │   │   └── routes.ts      # REST & streaming endpoints
│   │   │   ├── config/            # Configuration & Zod schemas
│   │   │   │   ├── index.ts       # Environment config loader
│   │   │   │   └── schema.ts      # Zod validation schemas
│   │   │   ├── db/                # Database layer
│   │   │   │   ├── index.ts       # Drizzle client setup
│   │   │   │   ├── schema.ts      # Table definitions & relations
│   │   │   │   ├── migrate.ts     # Migration runner
│   │   │   │   └── migrations/    # Generated SQL migrations
│   │   │   ├── providers/         # AI provider integrations
│   │   │   │   ├── base.ts        # Provider interface
│   │   │   │   └── anthropic.ts   # Anthropic Claude provider
│   │   │   ├── tools/             # Tool system
│   │   │   │   ├── base.ts        # Tool interface
│   │   │   │   ├── index.ts       # Tool registry
│   │   │   │   └── read.ts        # File reading tool
│   │   │   ├── session/           # Session management
│   │   │   │   └── index.ts       # Session orchestration
│   │   │   └── streaming/         # SSE event formatting
│   │   │       └── index.ts       # Event definitions & formatters
│   │   ├── drizzle.config.ts      # Drizzle Kit configuration
│   │   └── package.json
│   │
│   └── frontend/                   # Frontend UI (React + Vite)
│       ├── src/
│       │   ├── main.tsx           # React entry point
│       │   ├── App.tsx            # Root component
│       │   ├── components/        # UI components
│       │   │   ├── Terminal.tsx   # Terminal message display
│       │   │   └── InputBox.tsx   # Message input field
│       │   ├── hooks/             # Custom React hooks
│       │   │   └── useSSE.ts      # SSE connection hook
│       │   ├── stores/            # Zustand state management
│       │   │   └── session.ts     # Session & message store
│       │   ├── api/               # API client
│       │   │   └── client.ts      # Backend communication
│       │   └── styles/            # Global styles
│       │       └── index.css      # Tailwind imports
│       ├── index.html
│       ├── vite.config.ts         # Vite configuration
│       ├── tailwind.config.js     # Tailwind theme config
│       └── package.json
│
├── docker-compose.yml              # PostgreSQL 17 container
├── .env.example                    # Environment template
├── .env                            # Local environment config (git-ignored)
├── package.json                    # Workspace root
├── tsconfig.json                   # Shared TypeScript config
├── bun.lockb                       # Bun lockfile
├── setup.sh                        # Quick setup script
├── CLAUDE.md                       # Claude Code instructions
├── spec.md                         # Full implementation spec
└── README.md
```

## Tech Stack

### Backend

| Package                | Version  | Purpose                       |
| ---------------------- | -------- | ----------------------------- |
| **Bun**                | >= 1.0   | Runtime & package manager     |
| **Hono**               | ^4.0.0   | Lightweight web framework     |
| **Drizzle ORM**        | 0.44.7   | TypeScript-first ORM          |
| **Drizzle Kit**        | 0.31.7   | Schema migrations             |
| **PostgreSQL**         | 17       | Relational database           |
| **postgres**           | ^3.4.0   | PostgreSQL client             |
| **Zod**                | ^3.25.76 | Schema validation             |
| **zod-to-json-schema** | ^3.22.0  | Zod to JSON Schema conversion |
| **@anthropic-ai/sdk**  | ^0.24.0  | Claude API integration        |
| **dotenv**             | ^17.2.3  | Environment config            |

### Frontend

| Package               | Version | Purpose                 |
| --------------------- | ------- | ----------------------- |
| **React**             | ^19.2.0 | UI framework            |
| **Vite**              | ^7.2.4  | Build tool & dev server |
| **TailwindCSS**       | ^4.1.17 | Utility-first CSS       |
| **@tailwindcss/vite** | ^4.1.17 | Vite integration        |
| **Zustand**           | ^5.0.8  | State management        |
| **TypeScript**        | ~5.9.3  | Type safety             |

### DevOps

- **Docker** & Docker Compose - Database containerization
- **ESLint** - Code linting
- **TypeScript** ^5.3.0 - Type checking

## Development Commands

### Monorepo Commands (run from root)

```bash
bun run dev          # Start all dev servers in parallel
bun run build        # Build all packages
bun run test         # Run tests for all packages
bun run typecheck    # Type-check all packages
```

### Backend Commands

```bash
cd packages/backend

# Development
bun run dev          # Start backend with hot reload (watches src/index.ts)
bun run build        # Build for production (outputs to dist/)
bun run start        # Run production build
bun run typecheck    # Type-check without emitting files

# Database
bun run db:generate  # Generate migration files from schema changes
bun run db:migrate   # Apply pending migrations to database

# Testing
bun test             # Run backend tests with Bun test runner
```

### Frontend Commands

```bash
cd packages/frontend

# Development
bun run dev          # Start Vite dev server (http://localhost:3000)
bun run build        # Build for production (tsc + vite build)
bun run preview      # Preview production build locally

# Quality
bun run lint         # Run ESLint
```

### Database Management

```bash
# View database tables
docker exec -it goop-agent-postgres psql -U goop -d db -c "\dt"

# View table schema
docker exec -it goop-agent-postgres psql -U goop -d db -c "\d sessions"

# Connect to PostgreSQL shell
docker exec -it goop-agent-postgres psql -U goop -d db

# View database logs
docker logs goop-agent-postgres

# Stop database
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## Database Schema

The application uses PostgreSQL with three core tables managed by Drizzle ORM:

### `sessions`

Stores conversation sessions with the AI agent.

| Column       | Type      | Description                  |
| ------------ | --------- | ---------------------------- |
| `id`         | uuid      | Primary key (auto-generated) |
| `title`      | text      | Session title/name           |
| `created_at` | timestamp | Creation timestamp (auto)    |
| `updated_at` | timestamp | Last update timestamp (auto) |

### `messages`

Stores individual messages within sessions (user or assistant).

| Column       | Type      | Description                              |
| ------------ | --------- | ---------------------------------------- |
| `id`         | uuid      | Primary key (auto-generated)             |
| `session_id` | uuid      | Foreign key to sessions (cascade delete) |
| `role`       | text      | Message role: 'user' or 'assistant'      |
| `created_at` | timestamp | Creation timestamp (auto)                |

**Relationship:** `sessions` 1:N `messages`

### `message_parts`

Stores individual parts of a message (text, tool use, tool results).

| Column       | Type    | Description                                     |
| ------------ | ------- | ----------------------------------------------- |
| `id`         | uuid    | Primary key (auto-generated)                    |
| `message_id` | uuid    | Foreign key to messages (cascade delete)        |
| `type`       | text    | Part type: 'text', 'tool_use', or 'tool_result' |
| `content`    | jsonb   | Part content (structured as JSON)               |
| `order`      | integer | Part order within message                       |

**Relationship:** `messages` 1:N `message_parts`

The schema uses cascade deletion to maintain referential integrity - deleting a session removes all associated messages and message parts.

## Current Status

### Phase 1: Foundation - COMPLETE ✅

- Monorepo setup with Bun workspaces
- Backend package with Hono web framework
- Frontend package with React + Vite + TailwindCSS
- PostgreSQL database in Docker
- TypeScript configuration across all packages
- Environment variable management with Zod validation

### Phase 2: Database Layer - COMPLETE ✅

- Drizzle ORM integration with PostgreSQL
- Database schema design (sessions, messages, message_parts)
- Migration system with Drizzle Kit
- Zod validation schemas for message types
- Configuration management with type-safe schemas
- Database connection and client setup with relations

### Phase 3: Backend Core - COMPLETE ✅

- Hono HTTP server with middleware (CORS, logging)
- REST API routes for sessions and messages
- Health check endpoint
- Error handling and validation
- Database queries with Drizzle relations
- Type-safe request/response handling

### Phase 4: Provider Integration - COMPLETE ✅

- Abstract provider interface for multiple AI providers
- Anthropic Claude API integration with streaming
- Tool system infrastructure (base interface, registry)
- File reading tool with security constraints
- Zod schema to JSON schema conversion for tool definitions
- Real-time streaming event handling

### Phase 5: Session Management - COMPLETE ✅

- Session manager for conversation orchestration
- Tool execution with context management
- Conversation history loading and management
- Server-Sent Events (SSE) streaming implementation
- Message and message parts persistence
- Real-time event broadcasting (text deltas, tool usage, completion)

### Phase 6: Frontend UI - COMPLETE ✅

- Terminal-like React interface with dark theme
- Real-time message streaming display
- Zustand state management for sessions
- SSE connection handling with custom hooks
- Message input component with streaming state
- Tool usage visualization in terminal
- Responsive terminal UI with proper styling

### Phase 7: Integration & Testing - COMPLETE ✅

- End-to-end integration of all components
- SSE streaming between frontend and backend
- Tool execution flow verification
- Session persistence across page refreshes
- Error handling throughout the stack
- Setup script for quick onboarding
- Complete documentation

## What's Working

The application is fully functional with the following capabilities:

1. **AI Conversations**: Chat with Claude through a terminal-like web interface
2. **Real-time Streaming**: See Claude's responses appear token by token as they're generated
3. **Tool System**: Claude can read files from your local filesystem using the `read_file` tool
4. **Session Persistence**: All conversations are saved to PostgreSQL and survive page refreshes
5. **Type Safety**: Full TypeScript coverage with Zod validation throughout the stack
6. **Developer Experience**: Hot reload for both frontend and backend during development

## Next Steps

While the foundation is complete, future enhancements may include:

- Additional AI providers (OpenAI, Google Gemini, local models)
- More tools (write_file, edit_file, bash, grep, glob)
- Approval system for dangerous operations
- Mode system (Ask/Plan/Build) with different permission levels
- Comprehensive test coverage
- Production deployment configuration

See `spec.md` for the complete roadmap and implementation details.

## Roadmap

### Foundation Complete

1. ✅ **Phase 1: Foundation** - Project setup, monorepo structure, PostgreSQL
2. ✅ **Phase 2: Database Layer** - Schema design, migrations, Drizzle ORM
3. ✅ **Phase 3: Backend Core** - Hono server, REST API, routing
4. ✅ **Phase 4: Provider Integration** - Anthropic Claude, tool system
5. ✅ **Phase 5: Session Management** - Conversation orchestration, SSE streaming
6. ✅ **Phase 6: Frontend UI** - React terminal interface, real-time display
7. ✅ **Phase 7: Integration & Testing** - End-to-end verification, setup automation

### Future Enhancements

8. **Additional Providers** - OpenAI GPT, Google Gemini, local llama.cpp models
9. **Extended Tool Suite** - write_file, edit_file, bash, grep, glob, and more
10. **Approval System** - User confirmation for dangerous operations
11. **Mode System** - Ask/Plan/Build modes with permission boundaries
12. **Testing & CI/CD** - Comprehensive test coverage, automated deployment
13. **Advanced Features** - Context window management, multi-file operations, code analysis

## Architecture

goop follows a clean, event-driven architecture with clear separation of concerns:

### Backend Architecture

- **HTTP Server (Hono)**: Lightweight web framework handling REST API and SSE endpoints
- **API Layer**: REST routes for session management and message handling
- **Session Manager**: Orchestrates conversations, manages context, and coordinates tool execution
- **Provider System**: Abstract interface with concrete implementations (currently Anthropic Claude)
- **Tool Registry**: Pluggable tool system with type-safe execution (currently: read_file)
- **Streaming Layer**: Server-Sent Events (SSE) for real-time token streaming
- **Database Layer (Drizzle ORM)**: Type-safe queries with automatic relation management

### Frontend Architecture

- **React UI**: Terminal-like interface with component-based structure
- **State Management (Zustand)**: Centralized session and message state
- **SSE Client**: Custom hook for handling real-time event streams
- **API Client**: Type-safe backend communication layer
- **Component Library**: Terminal, InputBox, and future modular components

### Data Flow

```
User Input → Frontend (React)
    ↓
API Request → Backend (Hono)
    ↓
Session Manager → Load History + Process Message
    ↓
Provider (Claude) → Stream Response with Tool Calls
    ↓
Tool Execution → File System, etc.
    ↓
Database (PostgreSQL) → Persist Messages & Parts
    ↓
SSE Stream → Frontend (Real-time Display)
```

### Key Design Principles

1. **Type Safety**: TypeScript + Zod validation throughout the entire stack
2. **Modularity**: Each component (providers, tools, etc.) follows interface contracts
3. **Extensibility**: Easy to add new AI providers, tools, and features
4. **Real-time First**: Streaming architecture for responsive user experience
5. **Persistence**: All conversations stored in PostgreSQL with proper relations
6. **Security**: Tool execution with working directory constraints and input validation

The system is designed for extensibility, allowing easy addition of new tools, providers, and features without modifying core infrastructure.
