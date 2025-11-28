# Tech Stack

## Runtime & Package Manager
- **Bun**: JavaScript/TypeScript runtime and package manager (all commands use `bun`, not npm/yarn)

## Backend (`@goop/backend`)
- **Hono** (^4.0.0): Lightweight web framework with built-in CORS and logging
- **Drizzle ORM** (0.44.7): TypeScript-first ORM for PostgreSQL with relations
- **Drizzle Kit** (0.31.7): Database migration toolkit
- **Postgres** (^3.4.0): PostgreSQL client for Node.js
- **Zod** (^3.25.76): Schema validation and type inference
- **zod-to-json-schema** (^3.22.0): Convert Zod schemas to JSON Schema for AI tools
- **Dotenv** (^17.2.3): Environment variable loading
- **Anthropic SDK** (^0.24.0): Claude API integration with streaming support
- **OpenAI SDK** (^6.9.1): GPT API integration with streaming support
- **fast-glob** (^3.3.3): Fast file system globbing for grep and glob tools

## Frontend (`frontend`)
- **React 19**: UI framework
- **Vite** (^7.2.4): Build tool and dev server
- **TailwindCSS 4**: Utility-first CSS framework (includes @tailwindcss/vite plugin)
- **Zustand** (^5.0.8): Lightweight state management
- **TypeScript** (~5.9.3): Static typing

## Database
- **PostgreSQL 17**: Relational database (runs in Docker via docker-compose)
- Container name: `goop-agent-postgres`
- Default port: 5432

## TypeScript Configuration
- Target: ESNext with bundler module resolution
- JSX: `react-jsx` (React 17+ transform)
- Strict mode enabled
- `verbatimModuleSyntax` for explicit imports/exports
- `noEmit` mode (Bun handles transpilation)

## AI Providers
- **Anthropic Claude**: Multiple models including Haiku, Sonnet, and Opus variants (static model list)
- **OpenAI GPT**: Dynamic model list fetched from OpenAI API
- Provider and model selection is per-session and stored in database
- API keys validated during session creation and settings updates (not stored in DB)
