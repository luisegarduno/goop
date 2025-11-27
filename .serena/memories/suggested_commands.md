# Suggested Commands

This file contains the most important commands for developing the goop project.

## Prerequisites

All commands use **Bun** as the runtime and package manager. Do NOT use npm or yarn.

## Initial Setup

### 1. Install Dependencies
```bash
# From project root
bun install
```

### 2. Environment Configuration
```bash
# Copy example env file and configure
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL (PostgreSQL connection string)
# - ANTHROPIC_API_KEY (your Anthropic API key)
# - NODE_ENV (development/production/test)
# - HONO_BACKEND_PORT (default: 3001)
```

### 3. Start PostgreSQL Database
```bash
# Start database in Docker
docker-compose up -d

# Verify database is running
docker-compose ps
```

### 4. Run Database Migrations
```bash
cd packages/backend
bun run db:migrate
```

## Development Commands

### Start Development Servers

#### Start Backend Server
```bash
# From packages/backend directory
cd packages/backend
bun run dev
# Backend runs on http://localhost:3001
# Health check: http://localhost:3001/health
```

#### Start Frontend Server
```bash
# From packages/frontend directory (in a separate terminal)
cd packages/frontend
bun run dev
# Frontend runs on http://localhost:3000
```

#### Start Both (from root)
```bash
# From project root
bun run dev
# Note: This runs both backend and frontend in parallel
```

### Type Checking

```bash
# Check all packages
bun run typecheck

# Check backend only
cd packages/backend && bun run typecheck

# Check frontend only
cd packages/frontend && bun run typecheck
```

### Building

```bash
# Build all packages
bun run build

# Build backend only
cd packages/backend && bun run build

# Build frontend only
cd packages/frontend && bun run build
```

### Testing

```bash
# Run all tests
bun run test

# Run backend tests
cd packages/backend && bun test

# Run frontend tests
cd packages/frontend && bun test
```

## Database Commands

All database commands should be run from `packages/backend` directory:

```bash
cd packages/backend

# Generate migration files after schema changes
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## Production Commands

```bash
# Build for production (from root)
bun run build

# Start backend in production mode
cd packages/backend
bun run start

# Preview frontend production build
cd packages/frontend
bun run preview
```

## Docker Commands

```bash
# Start PostgreSQL database
docker-compose up -d

# Stop database
docker-compose down

# View database logs
docker-compose logs -f

# Restart database
docker-compose restart

# Remove database and volumes (CAUTION: deletes all data)
docker-compose down -v
```

## Troubleshooting Commands

### Check Database Connection
```bash
# Connect to PostgreSQL with psql
psql $DATABASE_URL

# List tables
psql $DATABASE_URL -c "\dt"

# Check migrations
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"
```

### Check Port Usage
```bash
# Check if port 3001 is in use (backend)
lsof -i :3001

# Check if port 3000 is in use (frontend)
lsof -i :3000

# Check if port 5432 is in use (PostgreSQL)
lsof -i :5432
```

### View Logs
```bash
# Backend logs (when running dev server)
cd packages/backend && bun run dev

# Database logs
docker-compose logs -f goop-agent-postgres
```

## Git Commands

Standard git workflow:

```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: your message here"

# Push
git push origin main
```

## Quick Setup Script

If `setup.sh` exists:
```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Install all dependencies
- Start PostgreSQL
- Create `.env` if it doesn't exist
- Run database migrations
