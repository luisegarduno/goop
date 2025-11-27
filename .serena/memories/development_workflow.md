# Development Workflow

This document describes the typical development workflows for the goop project.

## First Time Setup

### 1. Clone and Install
```bash
# Clone repository
git clone <repository-url>
cd goop

# Install dependencies with Bun
bun install
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required variables:
# - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goop
# - ANTHROPIC_API_KEY=sk-ant-...
# - NODE_ENV=development
# - HONO_BACKEND_PORT=3001
```

### 3. Start Database
```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Verify it's running
docker-compose ps
```

### 4. Run Migrations
```bash
cd packages/backend
bun run db:migrate
```

### 5. Verify Setup
```bash
# Test backend
cd packages/backend
bun run dev
# Visit http://localhost:3001/health

# In another terminal, test frontend
cd packages/frontend
bun run dev
# Visit http://localhost:3000
```

## Daily Development Workflow

### Starting Work

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Start database**
   ```bash
   docker-compose up -d
   ```

3. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd packages/backend
   bun run dev

   # Terminal 2: Frontend
   cd packages/frontend
   bun run dev
   ```

### Making Changes

#### Backend Development

1. **Identify what to change**
   - API routes: `src/api/routes.ts`
   - Database schema: `src/db/schema.ts`
   - Tools: `src/tools/`
   - Providers: `src/providers/`
   - Session logic: `src/session/index.ts`

2. **Make changes**
   - Hot reload is enabled (via `--watch` flag)
   - Save files and server restarts automatically

3. **Test changes**
   - Use curl or Postman for API testing
   - Check backend logs in terminal
   - Verify database changes with `bun run db:studio`

4. **Type check**
   ```bash
   bun run typecheck
   ```

#### Frontend Development

1. **Identify what to change**
   - Components: `src/components/`
   - State: `src/stores/session.ts`
   - API client: `src/api/client.ts`
   - Hooks: `src/hooks/`
   - Styles: `src/styles/index.css`

2. **Make changes**
   - Vite provides hot module replacement (HMR)
   - Changes appear instantly in browser

3. **Test changes**
   - Interact with UI in browser
   - Check browser console for errors
   - Verify SSE connection in Network tab

4. **Type check and lint**
   ```bash
   bun run typecheck
   bun run lint
   ```

#### Database Schema Changes

1. **Modify schema**
   ```bash
   # Edit packages/backend/src/db/schema.ts
   ```

2. **Generate migration**
   ```bash
   cd packages/backend
   bun run db:generate
   ```

3. **Review migration**
   ```bash
   # Check generated SQL in src/db/migrations/
   cat src/db/migrations/<latest-migration>.sql
   ```

4. **Apply migration**
   ```bash
   bun run db:migrate
   ```

5. **Verify changes**
   ```bash
   # Open Drizzle Studio
   bun run db:studio
   # Or use psql
   psql $DATABASE_URL -c "\d sessions"
   ```

### Adding New Features

#### Adding a New Tool

1. **Create tool file**
   ```bash
   # Example: packages/backend/src/tools/write.ts
   ```

2. **Implement Tool interface**
   ```typescript
   export const WriteFileInputSchema = z.object({
     path: z.string(),
     content: z.string(),
   });

   export class WriteFileTool implements Tool<WriteFileInput> {
     name = "write_file";
     description = "Write content to a file";
     schema = WriteFileInputSchema;

     async execute(input: WriteFileInput, context: ToolContext): Promise<string> {
       // Implementation
     }
   }
   ```

3. **Register tool**
   ```typescript
   // In packages/backend/src/tools/index.ts
   export const tools: Tool[] = [
     new ReadFileTool(),
     new WriteFileTool(), // Add new tool
   ];
   ```

4. **Test tool**
   - Restart backend server
   - Ask AI to use the tool in frontend
   - Verify tool execution in logs

#### Adding a New API Endpoint

1. **Add route in `packages/backend/src/api/routes.ts`**
   ```typescript
   app.get("/api/new-endpoint", async (c) => {
     // Implementation
     return c.json({ data: "response" });
   });
   ```

2. **Add client function in `packages/frontend/src/api/client.ts`**
   ```typescript
   export async function getNewData() {
     const res = await fetch(`${API_BASE}/new-endpoint`);
     return res.json();
   }
   ```

3. **Use in frontend**
   - Call from component or hook
   - Update Zustand store if needed

#### Adding a New React Component

1. **Create component file**
   ```bash
   # Example: packages/frontend/src/components/NewComponent.tsx
   ```

2. **Implement component**
   ```typescript
   export function NewComponent() {
     return <div>Component content</div>;
   }
   ```

3. **Import and use**
   ```typescript
   // In App.tsx or another component
   import { NewComponent } from "./components/NewComponent";
   ```

### Committing Changes

1. **Check status**
   ```bash
   git status
   ```

2. **Run quality checks**
   ```bash
   bun run typecheck
   bun run build
   bun run test
   ```

3. **Stage and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Use conventional commit prefixes:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `refactor:` - Code refactoring
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `chore:` - Build/tooling changes

4. **Push**
   ```bash
   git push origin main
   ```

## Troubleshooting Workflow

### Backend Issues

1. **Check logs**
   - Terminal running `bun run dev`
   - Look for error messages

2. **Verify environment**
   ```bash
   cat .env
   # Ensure all required vars are set
   ```

3. **Check database**
   ```bash
   docker-compose ps  # Is it running?
   psql $DATABASE_URL -c "SELECT 1"  # Can we connect?
   ```

4. **Restart backend**
   ```bash
   # Ctrl+C to stop
   bun run dev  # Start again
   ```

### Frontend Issues

1. **Check browser console**
   - Open DevTools (F12)
   - Look for errors in Console tab

2. **Check Network tab**
   - Verify API calls succeed
   - Check SSE connection status

3. **Clear cache**
   - Hard refresh: Ctrl+Shift+R
   - Clear localStorage if needed

4. **Restart frontend**
   ```bash
   # Ctrl+C to stop
   bun run dev  # Start again
   ```

### Database Issues

1. **Restart PostgreSQL**
   ```bash
   docker-compose restart
   ```

2. **Reset database** (CAUTION: loses all data)
   ```bash
   docker-compose down -v
   docker-compose up -d
   cd packages/backend && bun run db:migrate
   ```

3. **Check migrations**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"
   ```

## Useful Development Tools

### Drizzle Studio (Database GUI)
```bash
cd packages/backend
bun run db:studio
# Opens at http://localhost:4983
```

### PostgreSQL CLI
```bash
# Connect to database
psql $DATABASE_URL

# Common commands in psql:
\dt              # List tables
\d sessions      # Describe sessions table
SELECT * FROM sessions;  # Query data
\q               # Quit
```

### Monitoring Logs
```bash
# Backend logs
cd packages/backend && bun run dev

# Database logs
docker-compose logs -f goop-agent-postgres

# Follow multiple logs
# Use multiple terminals or tools like tmux/screen
```

### Port Management
```bash
# Find process on port
lsof -i :3001

# Kill process
kill -9 <PID>
```

## Best Practices

1. **Always type check before committing**
2. **Test changes manually in both backend and frontend**
3. **Review generated migrations before applying**
4. **Keep the database running during development**
5. **Use meaningful commit messages**
6. **Don't commit `.env` files**
7. **Restart servers after major changes**
8. **Check browser console and backend logs regularly**
