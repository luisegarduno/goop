# goop Frontend

The web-based user interface for the goop AI Coding Agent, featuring a terminal-like chat interface with real-time streaming responses.

## Overview

This frontend package provides a minimal, terminal-inspired UI for interacting with AI coding assistants. Built with React 19 and TypeScript, it emphasizes simplicity, performance, and a developer-friendly aesthetic.

**Key Features:**

- Terminal-style dark UI with monospace fonts
- Real-time streaming of AI responses via Server-Sent Events (SSE)
- Visual indicators for tool execution (file reading, etc.)
- Session persistence across page refreshes
- Type-safe API communication with backend
- Zustand-based state management

## Tech Stack

### Core Dependencies

- **React 19** (^19.2.0) - UI framework with latest features
- **TypeScript** (~5.9.3) - Type safety and enhanced DX
- **Vite** (^7.2.4) - Lightning-fast build tool and dev server
- **Zustand** (^5.0.8) - Lightweight state management (included as dev dependency)

### Styling

- **TailwindCSS 4** (^4.1.17) - Utility-first CSS framework
- **@tailwindcss/vite** (^4.1.17) - Vite plugin for Tailwind integration
- Custom terminal color palette and monospace typography

### Development Tools

- **ESLint** (^9.39.1) - Code linting with React-specific rules
- **@vitejs/plugin-react** (^5.1.1) - React Fast Refresh support
- **@types/react** and **@types/react-dom** - Type definitions

## Project Structure

```
src/
├── api/
│   └── client.ts              # Backend API communication layer
├── components/
│   ├── InputBox.tsx           # Message input component with send button
│   └── Terminal.tsx           # Main chat display with message rendering
├── hooks/
│   └── useSSE.ts              # Server-Sent Events connection hook (legacy)
├── stores/
│   └── session.ts             # Zustand store for session and message state
├── styles/
│   └── index.css              # TailwindCSS configuration and custom styles
├── App.tsx                    # Root application component
└── main.tsx                   # Application entry point
```

### Directory Breakdown

**`src/api/`** - Backend Integration
- `client.ts`: Functions for creating sessions, fetching messages, and managing API communication. Includes type transformations between backend and frontend message formats.

**`src/components/`** - React Components
- `Terminal.tsx`: Renders the message history and streaming responses. Displays user messages, assistant responses, tool usage, and tool results with appropriate styling.
- `InputBox.tsx`: Fixed-position input field with send button. Handles message submission and disables input during streaming.

**`src/hooks/`** - React Hooks
- `useSSE.ts`: (Currently unused) EventSource-based hook for SSE connections. The actual SSE implementation is handled directly in App.tsx using fetch streams.

**`src/stores/`** - State Management
- `session.ts`: Zustand store managing session ID, messages, streaming state, and local storage persistence.

**`src/styles/`** - Styling
- `index.css`: TailwindCSS imports and custom theme configuration using Tailwind 4's `@theme` directive.

## Development Setup

### Prerequisites

- **Bun** >= 1.0 (this monorepo uses Bun as the runtime)
- Backend server running on `http://localhost:3001`

### Installation

From the monorepo root:

```bash
bun install
```

Or from the frontend package directory:

```bash
cd packages/frontend
bun install
```

### Available Scripts

Run these from `packages/frontend`:

- **`bun run dev`** - Start Vite dev server on port 3000 with hot module replacement
- **`bun run build`** - Type-check with `tsc -b` and build production bundle with Vite
- **`bun run preview`** - Preview production build locally
- **`bun run typecheck`** - Run TypeScript type checking without emitting files

### Starting the Frontend

1. Ensure the backend is running on port 3001
2. Start the dev server:

```bash
cd packages/frontend
bun run dev
```

3. Open http://localhost:3000 in your browser

## Component Architecture

### App.tsx

The root component orchestrates the entire application:

- **Session Management**: Creates or restores session from `localStorage` on mount
- **Message Handling**: Processes user input and streams responses from backend
- **SSE Streaming**: Uses Fetch API with `ReadableStream` to parse Server-Sent Events
- **Event Dispatching**: Routes SSE events to appropriate Zustand store actions

**Key Flow:**

1. On mount, attempts to restore previous session ID from `localStorage`
2. If session exists on backend, loads message history
3. If session doesn't exist, creates a new one
4. User sends message → POST to `/api/sessions/:id/messages`
5. Backend responds with SSE stream
6. App.tsx parses events and updates Zustand store in real-time

### Terminal.tsx

Renders the conversation history and current streaming response:

- Maps over `messages` array to display completed messages
- Shows `currentParts` and `currentText` for in-progress streaming
- Distinguishes between user and assistant messages with color coding
- Renders three part types: `text`, `tool_use`, `tool_result`
- Displays animated cursor during streaming

**Message Part Rendering:**

- **text**: Displays with `whitespace-pre-wrap` to preserve formatting
- **tool_use**: Shows tool name with wrench icon (🔧)
- **tool_result**: Displays truncated result with arrow indicator (→)

### InputBox.tsx

Fixed-position input field at bottom of screen:

- Text input with submit button
- Disables during streaming to prevent concurrent requests
- Clears input after successful submission
- Styled with terminal color scheme

## State Management with Zustand

The `useSessionStore` hook provides centralized state management:

### State Structure

```typescript
interface SessionStore {
  sessionId: string | null;        // Current session UUID
  messages: Message[];              // Completed messages
  isStreaming: boolean;             // Whether AI is currently responding
  currentText: string;              // Accumulating text during stream
  currentParts: MessagePart[];      // Completed parts of current message

  // Actions
  setSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  appendText: (text: string) => void;
  addToolUse: (toolName: string, input: any) => void;
  addToolResult: (result: string) => void;
  finishStreaming: () => void;
  setStreaming: (streaming: boolean) => void;
  clearSession: () => void;
}
```

### Key Actions

**Session Management:**
- `setSessionId`: Sets session ID and persists to `localStorage`
- `clearSession`: Resets all state and removes from `localStorage`

**Message Management:**
- `addMessage`: Appends a completed message to history
- `setMessages`: Replaces entire message array (used during session restore)

**Streaming Management:**
- `appendText`: Accumulates text deltas during streaming
- `addToolUse`: Saves accumulated text as part, adds tool_use part
- `addToolResult`: Adds tool_result part
- `finishStreaming`: Converts current parts/text to complete message, resets streaming state

### LocalStorage Persistence

The session ID is persisted to `localStorage` with key `goop_session_id`. On page load, the app attempts to restore the session and reload messages from the backend.

## API Integration and SSE Streaming

### API Client (`src/api/client.ts`)

**Functions:**

- `createSession()`: POST to `/api/sessions` → returns `{ id: string }`
- `getSession(id)`: GET `/api/sessions/:id` → returns session metadata
- `getMessages(sessionId)`: GET `/api/sessions/:id/messages` → returns message history

**Type Transformations:**

The backend stores message parts as `{ type, content, order }` where `content` is a JSONB field. The client transforms these to frontend-friendly types:

```typescript
// Backend format
{
  type: "text",
  content: { text: "Hello" }
}

// Frontend format
{
  type: "text",
  text: "Hello"
}
```

### SSE Streaming

The actual SSE implementation is in `App.tsx` (`handleSend` function):

1. POST message to `/api/sessions/:id/messages`
2. Backend responds with `Content-Type: text/event-stream`
3. Parse stream using `ReadableStream` reader and `TextDecoder`
4. Buffer incomplete lines, parse complete `data:` lines as JSON
5. Dispatch events to Zustand store:

**Event Types:**

- `message.start`: Initialize streaming state
- `message.delta`: Append text chunk to current message
- `message.done`: Finalize streaming, save message
- `tool.start`: Add tool_use part with tool name and input
- `tool.result`: Add tool_result part with execution result

**Why Not EventSource?**

While `useSSE.ts` demonstrates using `EventSource`, the production implementation uses `fetch` with `ReadableStream` because:

- More control over request configuration
- Same-origin POST request with response stream
- Better error handling and cleanup

## Styling with TailwindCSS 4

### Configuration

TailwindCSS 4 uses a new `@theme` directive for configuration instead of `tailwind.config.js`. The theme is defined in `src/styles/index.css`:

```css
@theme {
  --color-terminal-bg: #1a1a1a;
  --color-terminal-text: #e0e0e0;
  --color-terminal-user: #4fc3f7;
  --color-terminal-assistant: #81c784;
  --color-terminal-tool: #ffb74d;

  --font-family-mono: Monaco, Menlo, Consolas, monospace;
}
```

### Color Palette

- **terminal-bg** (#1a1a1a): Dark background
- **terminal-text** (#e0e0e0): Light gray text
- **terminal-user** (#4fc3f7): Cyan for user messages
- **terminal-assistant** (#81c784): Green for assistant messages
- **terminal-tool** (#ffb74d): Amber for tool-related output

### Typography

The entire UI uses a monospace font stack (Monaco, Menlo, Consolas) applied to the `<body>` element via the `font-mono` utility.

### Vite Integration

TailwindCSS 4 is integrated via the `@tailwindcss/vite` plugin in `vite.config.ts`:

```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

## How to Extend the UI

### Adding a New Component

1. Create component in `src/components/`:

```tsx
// src/components/Toolbar.tsx
import { useSessionStore } from "../stores/session";

export function Toolbar() {
  const { clearSession } = useSessionStore();

  return (
    <div className="bg-gray-800 p-2 border-b border-gray-700">
      <button onClick={clearSession}>New Session</button>
    </div>
  );
}
```

2. Import and use in `App.tsx`:

```tsx
import { Toolbar } from "./components/Toolbar";

function App() {
  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      {/* ... rest of app */}
    </div>
  );
}
```

### Adding New Message Part Types

1. Update `MessagePart` interface in `src/stores/session.ts`:

```typescript
interface MessagePart {
  type: "text" | "tool_use" | "tool_result" | "image";
  text?: string;
  name?: string;
  result?: string;
  imageUrl?: string;  // New field
}
```

2. Add rendering logic in `Terminal.tsx`:

```tsx
{part.type === "image" && (
  <img src={part.imageUrl} alt="Generated content" />
)}
```

3. Add action to store:

```typescript
addImage: (url: string) =>
  set((state) => ({
    currentParts: [...state.currentParts, { type: "image", imageUrl: url }],
  }))
```

4. Handle new event type in `App.tsx` SSE parser:

```typescript
else if (data.type === 'image.generated') {
  addImage(data.url);
}
```

### Customizing Colors

Edit `src/styles/index.css`:

```css
@theme {
  --color-terminal-bg: #0d1117;        /* GitHub dark */
  --color-terminal-user: #58a6ff;      /* GitHub blue */
  --color-terminal-assistant: #3fb950; /* GitHub green */
}
```

### Adding Global Utilities

Add to `@layer utilities` in `src/styles/index.css`:

```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

## Build and Deployment

### Production Build

```bash
bun run build
```

This runs two steps:
1. `tsc -b` - TypeScript build to check types
2. `vite build` - Bundle application to `dist/` directory

**Output:**

- `dist/index.html` - Entry HTML file
- `dist/assets/` - JavaScript, CSS, and other assets with content hashes

### Preview Production Build

```bash
bun run preview
```

Starts a local server serving the `dist/` directory.

### Environment Variables

The frontend hardcodes the backend URL to `http://localhost:3001`. For production deployment:

1. Update `src/api/client.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";
```

2. Create `.env.production`:

```
VITE_API_BASE=https://api.yourapp.com/api
```

3. Vite will automatically use this during build.

### Deployment Options

**Static Hosting:**

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages):

```bash
bun run build
# Upload dist/ directory
```

**Docker:**

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Serve with Backend:**

Configure the Hono backend to serve static files:

```typescript
// packages/backend/src/index.ts
import { serveStatic } from 'hono/bun'

app.use('/*', serveStatic({ root: './public' }))
```

Copy frontend build to backend's `public/` directory.

## Type Safety

### TypeScript Configuration

The frontend uses TypeScript project references:

- `tsconfig.json` - Root config with references
- `tsconfig.app.json` - Application source code
- `tsconfig.node.json` - Vite config files

### Type Checking

```bash
bun run typecheck
```

This runs `tsc --noEmit` to check types without generating JavaScript files.

### Message Type Definitions

Types are defined inline in `src/stores/session.ts` and `src/api/client.ts`. For shared types between frontend and backend, consider:

1. Create `packages/shared/` package
2. Export types:

```typescript
// packages/shared/types.ts
export interface MessagePart {
  type: "text" | "tool_use" | "tool_result";
  // ...
}
```

3. Import in both packages:

```typescript
import type { MessagePart } from "@goop/shared";
```

## Troubleshooting

**Issue: Blank screen on load**
- Check browser console for errors
- Verify backend is running on port 3001
- Check network tab for failed API requests

**Issue: Messages not streaming**
- Verify `/api/sessions/:id/messages` returns `text/event-stream`
- Check backend SSE implementation
- Inspect network tab for stream data

**Issue: Session not persisting**
- Check browser `localStorage` for `goop_session_id`
- Verify `getSession` API call succeeds
- Check browser console for restoration errors

**Issue: Styles not applying**
- Verify TailwindCSS plugin in `vite.config.ts`
- Check `src/styles/index.css` is imported in `main.tsx`
- Rebuild dev server: `bun run dev`

## Future Enhancements

- **Message History Virtualization**: Render only visible messages for long conversations
- **Markdown Rendering**: Parse and display markdown in assistant responses
- **Code Syntax Highlighting**: Highlight code blocks in messages
- **File Upload**: Allow users to upload files for processing
- **Session Management UI**: List and switch between multiple sessions
- **Dark/Light Mode Toggle**: Support light theme
- **Keyboard Shortcuts**: Cmd+K for quick actions, arrow keys for history
- **Mobile Responsiveness**: Optimize for mobile devices

## Related Documentation

- [Root README](../../README.md) - Monorepo overview
- [Backend README](../backend/README.md) - Backend package documentation
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [Implementation Plan](../../thoughts/shared/plans/2025-11-24-goop-foundation.md) - Phase 1 plan

## License

MIT
