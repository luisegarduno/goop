# goop

An AI Coding Agent built as a monorepo with Bun, React, and PostgreSQL. Provides an intelligent terminal interface for code analysis and development tasks, powered by Anthropic Claude and OpenAI GPT.

## Project Overview

**goop** is a lightweight, extensible AI coding agent featuring:

- **Multi-provider AI support** - Anthropic Claude and OpenAI GPT with model selection
- **Real-time streaming** - Server-Sent Events (SSE) for token-by-token responses
- **Comprehensive tool system** - File operations (read, write, edit), code search (grep, glob)
- **Terminal-style interface** - Dark theme with real-time message display
- **Session management** - PostgreSQL persistence with session switching
- **Type-safe architecture** - TypeScript + Zod validation + Drizzle ORM throughout

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) & Docker Compose
- [Anthropic API key](https://console.anthropic.com/) (required for Claude models)
- [OpenAI API key](https://platform.openai.com/api-keys) (optional, for GPT models)

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

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:

   ```env
   ANTHROPIC_API_KEY=sk-ant-...    # Required for Claude
   OPENAI_API_KEY=sk-...           # Optional for GPT
   DATABASE_URL=postgresql://...   # Pre-configured
   HONO_BACKEND_PORT=3001          # Pre-configured
   ```

4. **Start PostgreSQL and run migrations**

   ```bash
   docker compose up -d
   cd packages/backend
   bun run db:migrate
   cd ../..
   ```

5. **Start development servers**

   ```bash
   bun run dev
   ```

   Backend: http://localhost:3001
   Frontend: http://localhost:3000

## Usage

Access the terminal interface at **http://localhost:3000**.

### Session Setup

On first load, configure your session:

1. **Session Title** - Name your conversation (e.g., "React Refactoring")
2. **Working Directory** - Root path for file operations (security boundary)
3. **AI Provider** - Choose Anthropic Claude or OpenAI GPT
4. **Model** - Select specific model (e.g., claude-sonnet-4-0, gpt-4)
5. **API Key** - Validate key (optional if in `.env`)

### Basic Usage

- **Send messages** - Type in input box, press Enter
- **Watch streaming** - Responses appear token-by-token in real-time
- **AI tools** - Automatic file operations (read, write, edit, grep, glob)
- **Tool indicators** - Visual feedback when tools execute
- **Session switching** - Use "Sessions" dropdown to navigate between conversations
- **Update settings** - Change provider/model/working directory via Settings button
- **Keyboard shortcuts** - Arrow keys, Enter, Escape for navigation

### Example Interactions

```
You: Can you read the package.json file?
AI: [Uses read_file tool]

You: Find all TODO comments in TypeScript files
AI: [Uses grep tool]

You: Create a new config.json with default settings
AI: [Uses write_file tool]

You: In README.md, replace "Version 1.0" with "Version 2.0"
AI: [Uses edit_file tool]

You: What TypeScript files are in the tools directory?
AI: [Uses glob tool]
You: Search for TODO comments in those files
AI: [Uses grep tool]
You: Fix the TODO in read.ts by adding error handling
AI: [Uses read_file, then edit_file]
```

## Project Structure

```
goop/
├── packages/
│   ├── backend/                 # Bun + Hono + Drizzle
│   │   ├── src/
│   │   │   ├── api/routes.ts    # REST & SSE endpoints
│   │   │   ├── config/          # Zod-validated config
│   │   │   ├── db/              # Drizzle schema & migrations
│   │   │   ├── providers/       # Anthropic & OpenAI
│   │   │   ├── tools/           # read, write, edit, grep, glob
│   │   │   ├── session/         # Conversation orchestration
│   │   │   ├── streaming/       # SSE events
│   │   │   └── index.ts         # Server entry
│   │   └── drizzle.config.ts
│   │
│   └── frontend/                # React + Vite + TailwindCSS
│       ├── src/
│       │   ├── components/      # Terminal, InputBox, Modals
│       │   ├── hooks/useSSE.ts  # SSE connection
│       │   ├── stores/          # Zustand state
│       │   ├── api/client.ts    # Backend API
│       │   └── App.tsx
│       └── vite.config.ts
│
├── docker-compose.yml           # PostgreSQL 17
├── .env                         # Environment config
├── package.json                 # Workspace root
└── CLAUDE.md                    # Claude Code instructions
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
| **openai**             | ^6.9.1   | GPT API integration           |
| **fast-glob**          | ^3.3.3   | File pattern matching         |
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
- **TypeScript** ^5.9.3 - Type checking

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

PostgreSQL 17 with three tables (Drizzle ORM):

1. **sessions** - id, title, working_directory, provider, model, timestamps
2. **messages** - id, session_id (FK), role (user|assistant), created_at
3. **message_parts** - id, message_id (FK), type (text|tool_use|tool_result), content (jsonb), order

Cascade deletes maintain referential integrity (session → messages → parts).

## Project Status

**Core Functionality: Complete** (Phases 1-6)

- Monorepo with Bun workspaces
- Hono backend + Drizzle ORM + PostgreSQL
- React 19 frontend + Vite + TailwindCSS 4
- Multi-provider AI (Anthropic Claude + OpenAI GPT)
- Comprehensive tool system (read, write, edit, grep, glob)
- Real-time SSE streaming
- Session management with UI switcher
- Terminal-style interface with dark theme
- Type-safe architecture (TypeScript + Zod)

## Future Enhancements

- Additional providers (Google Gemini, local models)
- Approval system for dangerous operations
- Additional tools (bash, file deletion, directory ops)
- Mode system (Ask/Plan/Build)
- Session deletion and renaming
- Comprehensive test coverage
- Production deployment guides

## Architecture

Event-driven architecture with clear separation of concerns:

**Backend:**
- HTTP Server (Hono) - REST API + SSE streaming
- Session Manager - Conversation orchestration
- Provider System - Abstract interface (Anthropic, OpenAI)
- Tool Registry - Pluggable tools with type-safe execution
- Database (Drizzle ORM) - Type-safe PostgreSQL queries

**Frontend:**
- React UI - Terminal-style components
- Zustand - Session state + localStorage persistence
- SSE Client - Real-time event streaming
- API Client - Type-safe backend communication

**Data Flow:**
```
User → React → API → Session Manager → Provider (AI)
                                         ↓
                     Database ← Tool Execution
                        ↓
                   SSE → React (real-time display)
```

**Design Principles:**
- Type safety (TypeScript + Zod)
- Modularity (interface-based)
- Extensibility (easy to add providers/tools)
- Security (working directory constraints)
