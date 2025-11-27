# GOOP Agent

A minimal AI coding agent with web UI, built with Bun, TypeScript, React, and PostgreSQL.

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

- 🤖 Multiple AI provider support (Anthropic Claude, OpenAI GPT)
- 🎛️ Model selection per session with runtime switching
- 🔑 API key validation before session creation
- 📁 File reading tool with path validation
- 💬 Real-time streaming responses via Server-Sent Events
- 🗄️ PostgreSQL conversation persistence with sessions
- 🎨 Terminal-like web UI with session management
- 🔄 Session switching between multiple conversations
- ⚙️ Mid-conversation settings updates
- 🗂️ Working directory configuration per session

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
│       │   │   ├── InputBox.tsx   # Message input field
│       │   │   ├── SetupModal.tsx # Session setup modal
│       │   │   └── SessionSwitcher.tsx # Session navigation dropdown
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
- **TypeScript** ^5.9.3 - Type checking

## Coding Agents

Within this project, ClaudeCode has been used to generate the code for the backend and frontend.
Custom commands & agents have been used to help with the development of the project.

Primarily, the commands I used were [create_plan.md](.claude/commands/create_plan.md), [implement_plan.md](.claude/commands/implement_plan.md), [research_codebase.md](.claude/commands/research_codebase.md).

- [create_plan.md](.claude/commands/create_plan.md) was used to create the implementation plan. I used [spec.md](spec.md) to guide the creation of the plan.
- [implement_plan.md](.claude/commands/implement_plan.md) was used to implement the plan.
- [research_codebase.md](.claude/commands/research_codebase.md) was used to research the codebase.

## Roadmap

- [x] Phase 1: Foundation (current)
- [ ] Phase 2: Additional providers (OpenAI, Google)
- [ ] Phase 3: More tools (write, edit, bash, grep, glob)
- [ ] Phase 4: Approval system
- [ ] Phase 5: Mode system (Ask/Plan/Build)
- [ ] Phase 6: Testing & CI/CD

## License

Apache License 2.0
