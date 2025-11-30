# Suggested Commands

**Note**: All commands use **Bun** (not npm or yarn)

## Initial Setup

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with: DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY, HONO_BACKEND_PORT, NODE_ENV

# 4. Run migrations
cd packages/backend && bun run db:migrate
```

## Development

### Start Servers

```bash
# Backend (terminal 1)
cd packages/backend && bun run dev

# Frontend (terminal 2)
cd packages/frontend && bun run dev

# Or start both from root
bun run dev
```

### Type Checking

```bash
# All packages
bun run typecheck

# Specific package
cd packages/backend && bun run typecheck
cd packages/frontend && bun run typecheck
```

### Building

```bash
# All packages
bun run build

# Specific package
cd packages/backend && bun run build
cd packages/frontend && bun run build
```

## Database

```bash
cd packages/backend

# Generate migration after schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## Testing

```bash
# All tests
bun run test

# Package-specific
cd packages/backend && bun test
cd packages/frontend && bun test
```

## Docker

```bash
# Start PostgreSQL
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs -f

# Reset database (CAUTION: deletes all data)
docker-compose down -v
docker-compose up -d
cd packages/backend && bun run db:migrate
```

## Troubleshooting

```bash
# Check database connection
psql $DATABASE_URL -c "\dt"

# Check port usage
lsof -i :3001  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL

# Check database status
docker-compose ps
```

## Production

```bash
# Build for production
bun run build

# Start backend
cd packages/backend && bun run start

# Preview frontend
cd packages/frontend && bun run preview
```
