# goop

A minimal AI coding agent with web UI, built with Bun, React, TailwindCSS, and PostgreSQL.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) & Docker Compose
- Anthropic API key

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

Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `ANTHROPIC_API_KEY` - Your Anthropic API key
- Other variables are pre-configured for local development

4. **Start PostgreSQL database**

```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
cd packages/backend
bun run db:generate
bun run db:migrate
cd ../..
```

6. **Start development servers**

```bash
bun run dev
```

This starts both the backend API server and frontend dev server.

## Project Structure

```
goop/
├── packages/
│   ├── backend/          # Bun + Hono API server + Drizzle ORM
│   └── frontend/         # React + Vite UI + TailwindCSS
├── docker-compose.yml    # PostgreSQL database
└── .env                  # Environment configuration
```

## Development Commands

### Root Commands (Monorepo)

```bash
bun dev          # Start all dev servers
bun build        # Build all packages
bun test         # Run all tests
bun typecheck    # Type-check all packages
```

### Backend Commands

```bash
cd packages/backend
bun dev          # Start backend with hot reload
bun build        # Build for production
bun db:generate  # Generate migration files
bun db:migrate   # Apply migrations
bun test         # Run backend tests
```

### Frontend Commands

```bash
cd packages/frontend
bun dev          # Start Vite dev server
bun build        # Build for production
bun lint         # Run ESLint
bun preview      # Preview production build
```

## Tech Stack

**Backend:**

- Hono - Lightweight web framework
- Drizzle ORM - TypeScript ORM
- PostgreSQL - Database
- Anthropic SDK - Claude API integration

**Frontend:**

- React 19 - UI framework
- Vite - Build tool
- TailwindCSS 4 - Styling
- Zustand - State management
