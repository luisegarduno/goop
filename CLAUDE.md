# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**goop** is an AI Coding Agent built as a monorepo with separate frontend and backend packages. The backend uses Hono + Drizzle ORM + PostgreSQL + Anthropic API, while the frontend is built with React + Vite + TailwindCSS + Zustand.

## Development Environment

This project uses **Bun** as the runtime and package manager. All commands should be run with `bun` rather than `npm` or `yarn`.

### Initial Setup

1. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - Other environment variables as needed

2. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

3. Generate and run database migrations (backend only):
   ```bash
   cd packages/backend
   bun run db:generate
   bun run db:migrate
   ```

## Common Commands

### Monorepo-level (run from root)

- `bun run dev` - Start dev servers for all packages
- `bun run build` - Build all packages
- `bun run test` - Run tests for all packages
- `bun run typecheck` - Type-check all packages

### Backend (`packages/backend`)

- `bun run dev` - Start backend dev server with hot reload (watches `src/index.ts`)
- `bun run build` - Build backend to `dist/` directory
- `bun run start` - Run production build
- `bun run db:generate` - Generate Drizzle migration files from schema changes
- `bun run db:migrate` - Apply migrations to database (runs `src/db/migrate.ts`)
- `bun test` - Run backend tests
- `bun run typecheck` - Type-check without emitting files

### Frontend (`packages/frontend`)

- `bun run dev` - Start Vite dev server
- `bun run build` - Build for production (runs `tsc -b && vite build`)
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build locally

## Architecture

### Monorepo Structure

This is a Bun workspace monorepo where each package in `packages/` is independently buildable and runnable. The root `package.json` defines scripts that filter and run commands across all workspace packages.

### Backend (`@goop/backend`)

**Tech Stack:**
- **Hono** - Lightweight web framework
- **Drizzle ORM** - TypeScript ORM for PostgreSQL
- **Postgres** (`postgres` package) - PostgreSQL client
- **Zod** - Schema validation
- **Anthropic SDK** - Claude API integration

**Key Patterns:**
- Entry point: `src/index.ts`
- Database migrations are managed via Drizzle Kit (`drizzle-kit generate`)
- Migration execution: `src/db/migrate.ts`
- Runs on port defined by `HONO_BACKEND_PORT` env var (default: 3001)

### Frontend (`frontend`)

**Tech Stack:**
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS 4** - Styling (includes `@tailwindcss/vite` plugin)
- **Zustand** - State management
- **TypeScript** - Type safety

**Key Patterns:**
- Entry point: `src/main.tsx`
- Root component: `src/App.tsx`
- Uses ESLint with React hooks and React refresh plugins

### Database

- **PostgreSQL 17** runs in Docker via `docker-compose.yml`
- Container name: `goop-agent-postgres`
- Default port: 5432
- Health checks are configured to ensure database readiness
- Connection details are managed via `.env` file

## TypeScript Configuration

The root `tsconfig.json` uses modern TypeScript settings:
- Target: ESNext with bundler module resolution
- JSX: `react-jsx` (React 17+ transform)
- Strict mode enabled
- `verbatimModuleSyntax` for explicit imports/exports
- `noEmit` mode (Bun handles transpilation)

## Testing

Both packages support `bun test` but test infrastructure appears minimal. When adding tests, use Bun's built-in test runner.
