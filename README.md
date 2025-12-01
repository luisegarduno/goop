# GOOP

An AI coding agent with a terminal-style web interface. Chat with Claude or GPT to read, write, and modify files in your project through a clean, persistent UI with real-time streaming responses.

<table>
   <tr>
      <td width="50%">
         <img width="100%" alt="goop_SessionSetup" src="https://github.com/user-attachments/assets/e3b3005b-7839-4a7a-a2c7-bba40334bcd5" />
      </td>
      <td width="50%">
         <img width="100%" alt="goop_SessionList" src="https://github.com/user-attachments/assets/4300df11-9cde-4f42-9a6e-d8ca7b73f781" />
      </td>
   </tr>
   <tr>
      <td width="50%">
         <img width="100%" alt="goop_SessionSettings_1" src="https://github.com/user-attachments/assets/6f3a7d20-659c-4336-9a76-72f4f000c635" />
      </td>
      <td width="50%">
         <img width="100%" alt="goop_SessionSettings_2" src="https://github.com/user-attachments/assets/7384c529-c009-4018-82b3-ec16d7d38d85" />
      </td>
   </tr>
</table>

## Features

- **Multiple AI Providers** - Switch between Anthropic Claude and OpenAI GPT models
- **Comprehensive File Tools** - Read, write, edit files, search with grep, and find files with glob patterns
- **Real-time Streaming** - See AI responses stream in via Server-Sent Events
- **Session Management** - Create multiple persistent chat sessions with independent working directories
- **Terminal-Style UI** - Clean, developer-friendly interface with keyboard navigation
- **Type-Safe Architecture** - Built with TypeScript, Zod validation, and Drizzle ORM
- **Secure by Default** - Path validation prevents file access outside working directories

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) & Docker Compose
- Anthropic API key (required)
- OpenAI API key (optional, for GPT models)

## Quick Start

1. Clone and setup

   ```bash
   git clone https://github.com/luisegarduno/goop.git
   cd goop
   chmod +x setup.sh
   ./setup.sh
   ```

2. Add API keys to `.env`

   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...  # Optional
   ```

3. Run monorepo

   ```bash
   bun run dev
   ```

   This will start both the backend and frontend servers.

   The backend will start on `http://localhost:3001` and the frontend will start on `http://localhost:3000`.

   The frontend will open automatically in your browser.

4. Start chatting

   - On first load, you'll see a setup modal - enter a session title and working directory
   - Choose your AI provider (Claude or GPT) and model
   - Start asking the AI to read, modify, or search files in your working directory
   - Create multiple sessions for different projects or tasks

## Common Commands

**Root (all packages):**

```bash
bun run dev        # Start all dev servers
bun run build      # Build all packages
bun run typecheck  # Type-check all packages
```

**Backend (`packages/backend`):**

```bash
bun run dev         # Start dev server with hot reload
bun run db:generate # Generate migrations from schema changes
bun run db:migrate  # Apply migrations to database
bun test            # Run tests
```

**Frontend (`packages/frontend`):**

```bash
bun run dev    # Start Vite dev server
bun run build  # Build for production
bun run lint   # Run ESLint
```

## Project Structure

This is a Bun workspace monorepo with two main packages:

```
goop/
├── packages/
│   ├── backend/           # Hono server + Drizzle ORM + PostgreSQL
│   │   └── src/
│   │       ├── api/       # REST & SSE endpoints
│   │       ├── db/        # Database schema & migrations
│   │       ├── providers/ # AI provider integrations (Claude, GPT)
│   │       ├── tools/     # File operation tools (read, write, edit, grep, glob)
│   │       ├── session/   # Session & conversation orchestration
│   │       └── streaming/ # Server-Sent Events formatting
│   │
│   └── frontend/          # React 19 + Vite + TailwindCSS
│       └── src/
│           ├── components/ # Terminal UI, modals, session switcher
│           ├── stores/     # Zustand state management
│           ├── hooks/      # SSE connection hook
│           └── api/        # Backend API client
│
├── docker-compose.yml     # PostgreSQL 17 container
├── .env.example           # Environment template
└── setup.sh               # Quick setup script
```

> See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Tech Stack

### Backend

| Package                | Purpose                       |
| ---------------------- | ----------------------------- |
| **Bun**                | Runtime & package manager     |
| **Hono**               | Lightweight web framework     |
| **Drizzle ORM**        | TypeScript-first ORM          |
| **Drizzle Kit**        | Schema migrations             |
| **PostgreSQL**         | Relational database           |
| **postgres**           | PostgreSQL client             |
| **Zod**                | Schema validation             |
| **zod-to-json-schema** | Zod to JSON Schema conversion |
| **@anthropic-ai/sdk**  | Claude API integration        |
| **openai**             | OpenAI GPT integration        |
| **fast-glob**          | Fast file pattern matching    |
| **dotenv**             | Environment config            |

### Frontend

| Package               | Purpose                 |
| --------------------- | ----------------------- |
| **React**             | UI framework            |
| **Vite**              | Build tool & dev server |
| **TailwindCSS**       | Utility-first CSS       |
| **@tailwindcss/vite** | Vite integration        |
| **Zustand**           | State management        |
| **TypeScript**        | Type safety             |

### DevOps

- **Docker** & Docker Compose - Database containerization
- **ESLint** - Code linting
- **TypeScript** ^5.9.3 - Type checking

## Built with AI Assistance

This project was developed using [Claude Code](https://claude.ai/code) with custom slash commands for planning and implementation. The project includes custom commands in [`.claude/commands/`](.claude/commands/) that demonstrate AI-assisted development workflows:

- `/create_plan` - Generate implementation plans from specifications
- `/implement_plan` - Execute plans with verification
- `/research_codebase` - Document and analyze code structure

See [spec.md](spec.md) for the original project specification.

## Development Status

**Current Status:** Core functionality complete (Phases 1-6)

**Completed:**

- Infrastructure & monorepo setup
- Database schema with PostgreSQL + Drizzle ORM
- Backend API with Hono server & SSE streaming
- Anthropic Claude & OpenAI GPT provider integrations
- Session manager with conversation orchestration
- Terminal-style React UI with real-time streaming
- File operation tools: read, write, edit, grep, glob

**Planned Enhancements:**

- User approval system for dangerous operations (write, edit, bash)
- Additional tools: bash command execution
- Additional providers: Google Gemini, local llama.cpp models
- Mode system: Ask (read-only), Plan (analysis), Build (full access)
- Comprehensive testing & CI/CD
- Session export/import and search functionality

## License

Apache License 2.0
