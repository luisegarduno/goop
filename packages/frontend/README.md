# goop Frontend

Web UI for the goop AI Coding Agent. Terminal-style interface with real-time streaming responses from Claude or GPT.

## Overview

React 19 frontend with a developer-focused terminal aesthetic. Connects to the Hono backend for AI-powered file operations and conversation management.

**Key Features:**

- Terminal-style UI with SSE streaming
- Multi-session management with independent working directories
- Multi-provider support (Anthropic Claude, OpenAI GPT)
- Real-time tool execution visualization (read, write, edit, grep, glob)
- Session persistence with localStorage + PostgreSQL
- Zustand state management
- TailwindCSS 4 styling

## Tech Stack

- **React 19** (^19.2.0) - UI framework
- **TypeScript** (~5.9.3) - Type safety
- **Vite** (^7.2.4) - Build tool & dev server
- **Zustand** (^5.0.8) - State management
- **TailwindCSS 4** (^4.1.17) - Styling with Vite plugin
- **ESLint** (^9.39.1) - Linting

## Project Structure

```
src/
├── api/
│   └── client.ts           # Backend API calls
├── components/
│   ├── Terminal.tsx        # Message display with auto-scroll
│   ├── InputBox.tsx        # User input with auto-focus
│   ├── SessionSwitcher.tsx # Session dropdown menu
│   ├── SetupModal.tsx      # Session creation modal
│   └── SettingsModal.tsx   # Settings update modal
├── hooks/
│   └── useSSE.ts           # EventSource SSE hook
├── stores/
│   └── session.ts          # Zustand store
├── styles/
│   └── index.css           # Tailwind theme config
├── App.tsx                 # Root component with SSE streaming
└── main.tsx                # Entry point
```

## Development Setup

### Prerequisites

- **Bun** >= 1.0
- Backend running on `http://localhost:3001`

### Commands

Run from `packages/frontend`:

```bash
bun run dev       # Start dev server (port 3000)
bun run build     # Type-check and build
bun run preview   # Preview production build
bun run typecheck # TypeScript check only
```

### Quick Start

1. Ensure backend is running
2. Start dev server:
   ```bash
   cd packages/frontend
   bun run dev
   ```
3. Open http://localhost:3000
4. Configure session via setup modal (title, working directory, provider, model, API key)
5. Start chatting

> Session data persists in localStorage + PostgreSQL. Use Settings button to update provider/model mid-conversation.

## Components

### App.tsx

Root component orchestrating the application:

- **Session Lifecycle**: Restores session from localStorage on mount, shows SetupModal if none exists
- **SSE Streaming**: Handles fetch-based SSE stream parsing for `/api/sessions/:id/messages` endpoint
- **Event Routing**: Dispatches SSE events (`message.start`, `message.delta`, `message.done`, `tool.start`, `tool.result`) to Zustand store
- **UI Layout**: Renders Terminal, InputBox, SessionSwitcher, and modals

### SetupModal.tsx

Session creation modal:

- Prompts for session title, working directory, provider, model, and API key
- Dynamically fetches provider list and model options
- Validates API key before session creation
- Shows masked `.env` API key for reference (input NOT pre-populated)

### SettingsModal.tsx

Settings update modal:

- Update provider, model, working directory, and API key mid-conversation
- Re-validates API keys on save
- Changing providers clears message history (compatibility)

### SessionSwitcher.tsx

Session navigation dropdown:

- Lists all sessions with title, working directory, and timestamp
- Highlights active session
- Keyboard navigation (arrows, Enter, Escape)
- Loads session messages on switch

### Terminal.tsx

Message display component:

- Renders completed messages and streaming parts
- Color-coded roles (user: cyan, assistant: green)
- Renders `text`, `tool_use`, `tool_result` parts
- Auto-scrolls to bottom during streaming

### InputBox.tsx

User input component:

- Fixed-position input with send button
- Disables during streaming
- Auto-focuses when streaming completes

## State Management

Zustand store in `src/stores/session.ts`:

**State:**
- `sessionId`, `workingDirectory`, `provider`, `model` - Session config (persisted to localStorage)
- `messages` - Completed message history
- `isStreaming`, `currentText`, `currentParts` - Streaming state

**Key Actions:**
- `loadSession` - Load session with ID, config, and messages
- `setSessionId`, `setWorkingDirectory`, `setProvider`, `setModel` - Update config (persists to localStorage)
- `clearSession` - Reset state and clear localStorage
- `appendText` - Accumulate text deltas during streaming
- `addToolUse`, `addToolResult` - Add message parts
- `startNewMessage` - Reset streaming state for new assistant message
- `finishStreaming` - Convert streaming parts to complete message

**LocalStorage Keys:**
- `goop_session_id` - Session UUID
- `goop_working_directory` - File operations base path
- `goop_provider` - AI provider (anthropic, openai)
- `goop_model` - Model name

## API & SSE Streaming

### API Client (`src/api/client.ts`)

Functions for backend communication:

- `createSession(workingDirectory, title, provider, model, apiKey?)` - Create new session
- `updateSession(sessionId, updates)` - Update session settings
- `getSession(id)` - Fetch session metadata
- `getAllSessions()` - List all sessions (sorted by updatedAt DESC)
- `getMessages(sessionId)` - Load message history

Provider endpoints (accessed via fetch in modals):
- `GET /api/providers` - List providers
- `GET /api/providers/:name/models` - Get model list
- `GET /api/providers/:name/api-key` - Get masked API key from `.env`
- `POST /api/providers/validate` - Validate API key

### SSE Streaming

Implemented in `App.tsx` using fetch + `ReadableStream`:

1. POST to `/api/sessions/:id/messages` with user message
2. Backend responds with `text/event-stream`
3. Parse stream line-by-line, decode `data:` JSON payloads
4. Dispatch events to Zustand:
   - `message.start` - Initialize streaming
   - `message.delta` - Append text chunk
   - `message.done` - Finalize message
   - `tool.start` - Add tool_use part
   - `tool.result` - Add tool_result part

> Uses fetch instead of `EventSource` for better POST request control and error handling.

## Styling

TailwindCSS 4 with `@theme` directive in `src/styles/index.css`:

```css
@theme {
  --color-terminal-bg: #1a1a1a;        /* Dark background */
  --color-terminal-text: #e0e0e0;      /* Light text */
  --color-terminal-user: #4fc3f7;      /* Cyan (user) */
  --color-terminal-assistant: #81c784; /* Green (assistant) */
  --color-terminal-tool: #ffb74d;      /* Amber (tools) */
  --font-family-mono: Monaco, Menlo, Consolas, monospace;
}
```

Integrated via `@tailwindcss/vite` plugin in `vite.config.ts`.

## Extending the UI

### Add Component

1. Create in `src/components/`, import `useSessionStore`
2. Import and render in `App.tsx`

### Add Message Part Type

1. Update `MessagePart` interface in `src/stores/session.ts`
2. Add rendering logic in `Terminal.tsx`
3. Add action to Zustand store
4. Handle new SSE event in `App.tsx`

### Customize Colors

Edit `@theme` in `src/styles/index.css`:

```css
@theme {
  --color-terminal-bg: #0d1117;
  --color-terminal-user: #58a6ff;
}
```

### Add Utilities

Use `@layer utilities` in `src/styles/index.css`:

```css
@layer utilities {
  .scrollbar-hide { scrollbar-width: none; }
}
```

## Build

```bash
bun run build   # TypeScript check + Vite build → dist/
bun run preview # Preview production build
```

**Production Environment:**

For custom backend URLs, set `VITE_API_BASE` in `.env.production`:

```env
VITE_API_BASE=https://api.yourapp.com/api
```

Then update `src/api/client.ts` to use `import.meta.env.VITE_API_BASE`.

## TypeScript

Run type checking:

```bash
bun run typecheck  # tsc --noEmit
```

**Configuration:** Uses TypeScript project references (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)

**Types:** Defined inline in `src/stores/session.ts` and `src/api/client.ts`. For shared types, consider a `packages/shared/` package.

## Troubleshooting

**Blank screen:**
- Check browser console and network tab
- Verify backend on port 3001

**Streaming issues:**
- Verify `text/event-stream` content type
- Check backend SSE implementation

**Session not persisting:**
- Check `localStorage` for `goop_session_id`
- Verify backend session exists

**Styles broken:**
- Verify `@tailwindcss/vite` plugin in `vite.config.ts`
- Restart dev server

## References

- [Root README](../../README.md) - Monorepo overview
- [CLAUDE.md](../../CLAUDE.md) - Full architecture and development guidelines
- [Backend README](../backend/README.md) - Backend documentation

## License

Apache License 2.0
