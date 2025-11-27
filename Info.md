# goop

An AI Coding Agent built with modern web technologies. goop provides an intelligent assistant for code analysis, planning, and development tasks through a clean web interface, powered by Claude API and built with Bun, React, and PostgreSQL.

## Project Overview

goop is designed to be a lightweight, extensible AI coding agent that can:

- Answer questions about your codebase (Ask mode)
- Analyze and create implementation plans (Plan mode)
- Assist with development tasks (Build mode)

The project is structured as a Bun workspace monorepo with separate frontend and backend packages, featuring:

- **Real-time AI streaming** via Server-Sent Events (SSE)
- **Comprehensive tool system** with file operations, code search, and pattern matching
- **Session management** with PostgreSQL persistence
- **Terminal-like web interface** for seamless interaction
- **Multi-provider AI support** with Anthropic Claude and OpenAI GPT integration
- **Type-safe architecture** with Zod validation and Drizzle ORM

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

3. **Configure environment variables**<br/>
   Copy `.env.example` to `.env` and add your API key(s):

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set at least one API key:

   ```env
   ANTHROPIC_API_KEY=sk-ant-...    # Required for Claude models
   OPENAI_API_KEY=sk-...           # Optional, for GPT models
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

### Initial Setup

When you first open the application, you'll be greeted with a **Session Setup Modal** where you can configure:

1. **Session Title**: Give your conversation a meaningful name (e.g., "React Refactoring", "API Design")
2. **Working Directory**: Set the root directory where the AI can read files (defaults to your project directory)
3. **AI Provider**: Choose between Anthropic Claude or OpenAI GPT
4. **Model**: Select a specific model from the chosen provider (e.g., claude-sonnet-4-0, gpt-4)
5. **API Key**: Validate your API key (optional if already configured in `.env`)

The working directory determines which files the AI can access when using file operation tools (read, write, edit) and search tools (grep, glob). All operations are restricted to this directory to help maintain security boundaries.

### Basic Usage

1. **Start a conversation**: After setting up your session, type a message in the input box at the bottom and press Enter or click "Send"
2. **Watch the streaming response**: AI responses will appear in real-time as they're generated
3. **Use AI tools**: The AI can read files, write files, make edits, search code with grep, and find files with glob patterns
4. **See tool usage**: When the AI uses tools (read_file, write_file, edit_file, grep, glob), you'll see visual indicators with the tool name and status
5. **Continue the conversation**: All messages persist in the database, maintaining full conversation context

### Session Management

- **Switch Sessions**: Click the "Sessions" button in the top-right corner to view all your sessions. Select any session to switch to it instantly
- **Create New Session**: Click the "New Session" button to start a fresh conversation with a new configuration
- **Update Settings**: Click the "Settings" button to change provider, model, working directory, or validate a different API key (conversation history is preserved unless changing providers)
- **Navigate Sessions**: Use keyboard shortcuts (Arrow keys, Enter, Escape) to quickly navigate the session switcher dropdown
- **Session Information**: Each session in the dropdown displays its title, working directory, and last update time (Today, Yesterday, or date)

### Example Interactions

**Read and analyze files:**

```
You: Can you read the package.json file and tell me what dependencies are installed?
Assistant: [Uses read_file tool]
```

**Search for patterns in code:**

```
You: Find all TODO comments in TypeScript files
Assistant: [Uses grep tool with pattern "TODO" and glob "**/*.ts"]
```

**Find files by pattern:**

```
You: List all TypeScript files in the src directory
Assistant: [Uses glob tool with pattern "src/**/*.ts"]
```

**Create new files:**

```
You: Create a new file called config.json with some default settings
Assistant: [Uses write_file tool]
```

**Edit existing files:**

```
You: In the README.md file, replace "Version 1.0" with "Version 2.0"
Assistant: [Uses edit_file tool with old_string and new_string]
```

**Multi-turn conversations:**

```
You: What TypeScript files are in the tools directory?
Assistant: [Uses glob tool to find files]
You: Great, now search for any TODO comments in those files
Assistant: [Uses grep tool to search]
You: Can you fix the TODO in read.ts by adding proper error handling?
Assistant: [Uses read_file, then edit_file to make changes]
```

### Features in Action

- **Real-time Streaming**: Watch the AI "type" responses as they're generated, creating a natural conversation flow
- **Tool Visualization**: See when the AI uses tools with clear indicators showing tool name and status
- **Session Management**: Switch between conversations instantly or start new sessions on demand
- **Keyboard Navigation**: Full accessibility with arrow keys for session navigation
- **Persistent Sessions**: Your conversations survive page refreshes and browser restarts
- **Terminal Aesthetic**: Dark theme with monospace font for a classic terminal experience
- **Type-safe Communication**: All data validated with Zod schemas throughout the stack

### Keyboard Shortcuts

- **Enter**: Send message (when input is focused)
- **Arrow Down/Up**: Navigate session switcher dropdown (when open)
- **Enter/Space**: Select session in dropdown
- **Escape**: Close session switcher dropdown
- **Home/End**: Jump to first/last session in dropdown

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
│   │   │   │   ├── read.ts        # Read file tool
│   │   │   │   ├── write.ts       # Write file tool
│   │   │   │   ├── edit.ts        # Edit file tool
│   │   │   │   ├── grep.ts        # Search with regex tool
│   │   │   │   └── glob.ts        # Find files by pattern tool
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
│       │   │   ├── InputBox.tsx   # Message input field
│       │   │   ├── SetupModal.tsx # Session setup modal
│       │   │   └── SessionSwitcher.tsx # Session switching dropdown
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

| Column              | Type      | Description                                        |
| ------------------- | --------- | -------------------------------------------------- |
| `id`                | uuid      | Primary key (auto-generated)                       |
| `title`             | text      | Session title/name                                 |
| `working_directory` | text      | Root directory for file operations (security boundary) |
| `provider`          | text      | AI provider name ('anthropic' or 'openai')         |
| `model`             | text      | Model identifier (e.g., 'claude-sonnet-4-0', 'gpt-4') |
| `created_at`        | timestamp | Creation timestamp (auto)                          |
| `updated_at`        | timestamp | Last update timestamp (auto)                       |

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
- OpenAI GPT API integration with streaming
- Tool system infrastructure (base interface, registry)
- Comprehensive tool suite (read, write, edit, grep, glob)
- Security constraints for all file operations
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
- Session setup modal with provider/model/API key selection
- Settings modal for updating session configuration
- Session switcher dropdown with keyboard navigation
- New session creation button

### Phase 7: Multi-Provider Support - COMPLETE ✅

- End-to-end integration of all components
- SSE streaming between frontend and backend
- OpenAI GPT provider integration with full streaming support
- Provider and model selection in UI (SetupModal and SettingsModal)
- Session persistence across page refreshes
- Error handling throughout the stack
- Setup script for quick onboarding
- Complete documentation
- Session switching and management UI
- Keyboard accessibility for all interactive elements
- Date formatting (Today/Yesterday/relative dates)

### Phase 8: Extended Tool Set - COMPLETE ✅

- `write_file` tool - Create or overwrite files with content
- `edit_file` tool - Apply exact string replacements in files
- `grep` tool - Search files with regex patterns and context lines
- `glob` tool - Find files matching glob patterns
- Security constraints enforced for all tools (working directory validation)
- Fast-glob integration for efficient file pattern matching
- Comprehensive error handling for all file operations

## What's Working

The application is fully functional with the following capabilities:

1. **AI Conversations**: Chat with Claude or GPT through a terminal-like web interface
2. **Multi-Provider Support**: Choose between Anthropic Claude and OpenAI GPT with model selection
3. **Real-time Streaming**: See AI responses appear token by token as they're generated
4. **Comprehensive Tool System**: AI can interact with your filesystem using multiple tools:
   - `read_file` - Read file contents
   - `write_file` - Create or overwrite files
   - `edit_file` - Apply exact string replacements
   - `grep` - Search code with regex patterns and context lines
   - `glob` - Find files matching glob patterns
5. **Working Directory Security**: Each session has a configured working directory that constrains all file operations
6. **Session Setup Modal**: Configure session title, working directory, provider, model, and API key through an intuitive interface
7. **Settings Management**: Update provider, model, or working directory mid-conversation via Settings modal
8. **Session Management UI**: Switch between existing sessions via dropdown, create new sessions with a single click
9. **Session Persistence**: All conversations are saved to PostgreSQL and survive page refreshes
10. **Keyboard Navigation**: Full keyboard support for session switcher (Arrow keys, Enter, Escape, Home, End)
11. **API Key Validation**: Validate API keys before session creation with helpful error messages
12. **Type Safety**: Full TypeScript coverage with Zod validation throughout the stack
13. **Developer Experience**: Hot reload for both frontend and backend during development

## Next Steps

While the core functionality is complete, future enhancements may include:

- Additional AI providers (Google Gemini, local llama.cpp models)
- Additional tools (bash command execution, file deletion, directory operations)
- Approval system for dangerous operations (write, edit, bash)
- Mode system (Ask/Plan/Build) with different permission levels
- Session deletion and renaming capabilities
- Search/filter for sessions in the switcher
- Comprehensive test coverage
- Production deployment configuration
- Context window management for long conversations
- Multi-file diff/patch operations

See `spec.md` for the complete roadmap and implementation details.

## Roadmap

### Foundation Complete

1. ✅ **Phase 1: Foundation** - Project setup, monorepo structure, PostgreSQL
2. ✅ **Phase 2: Database Layer** - Schema design, migrations, Drizzle ORM
3. ✅ **Phase 3: Backend Core** - Hono server, REST API, routing
4. ✅ **Phase 4: Provider Integration** - Anthropic Claude, OpenAI GPT, tool system
5. ✅ **Phase 5: Session Management** - Conversation orchestration, SSE streaming
6. ✅ **Phase 6: Frontend UI** - React terminal interface, provider/model selection
7. ✅ **Phase 7: Multi-Provider Support** - OpenAI integration, provider/model selection UI
8. ✅ **Phase 8: Extended Tool Set** - write_file, edit_file, grep, glob tools

### Future Enhancements

9. **Approval System** - User confirmation for dangerous operations (write, edit, bash)
10. **Additional Providers** - Google Gemini, local llama.cpp models
11. **More Tools** - bash command execution, file deletion, directory operations
12. **Mode System** - Ask/Plan/Build modes with permission boundaries
13. **Testing & CI/CD** - Comprehensive test coverage, automated deployment
14. **Advanced Features** - Context window management, multi-file operations, code analysis

## Architecture

goop follows a clean, event-driven architecture with clear separation of concerns:

### Backend Architecture

- **HTTP Server (Hono)**: Lightweight web framework handling REST API and SSE endpoints
- **API Layer**: REST routes for session management, provider configuration, and message handling
- **Session Manager**: Orchestrates conversations, manages context, and coordinates tool execution
- **Provider System**: Abstract interface with concrete implementations (Anthropic Claude, OpenAI GPT)
- **Tool Registry**: Pluggable tool system with type-safe execution (read_file, write_file, edit_file, grep, glob)
- **Streaming Layer**: Server-Sent Events (SSE) for real-time token streaming
- **Database Layer (Drizzle ORM)**: Type-safe queries with automatic relation management

### Frontend Architecture

- **React UI**: Terminal-like interface with component-based structure
- **State Management (Zustand)**: Centralized session and message state with localStorage persistence
- **SSE Client**: Custom hook for handling real-time event streams
- **API Client**: Type-safe backend communication layer
- **Component Library**: Terminal, InputBox, SetupModal, SettingsModal, SessionSwitcher with keyboard navigation support

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
