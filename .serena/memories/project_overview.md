# Project Overview: goop

## Purpose

**goop** is an AI Coding Agent that provides an interactive terminal-like interface for AI-assisted software development. Users can have conversations with AI (Claude or GPT) that can execute file operations and code analysis tools within a specified working directory.

## Architecture

Monorepo structure using Bun workspaces:
- **Backend**: Hono + Drizzle ORM + PostgreSQL + AI Provider APIs
- **Frontend**: React 19 + Vite + TailwindCSS 4 + Zustand

## Development Status

**Phases 1-6 Complete** (Core functionality ready):
1. Infrastructure setup (monorepo, PostgreSQL, TypeScript)
2. Database schema (sessions, messages, message_parts)
3. Backend core (Hono server, REST & SSE endpoints)
4. Anthropic provider & tool system
5. Session manager & streaming integration
6. Frontend terminal UI

**Phases 7-8 Partially Complete**:
- OpenAI GPT provider integration ✅
- Provider selection UI (SetupModal, SettingsModal) ✅
- Extended tool set (write_file, edit_file, grep, glob) ✅

## Key Features

- **Multi-Provider Support**: Anthropic Claude and OpenAI GPT with per-session selection
- **Real-Time Streaming**: Server-Sent Events for streaming AI responses
- **Comprehensive Tool Set**: 
  - `read_file` - Read file contents
  - `write_file` - Create/overwrite files
  - `edit_file` - Replace exact string matches
  - `grep` - Search with regex patterns and glob filters
  - `glob` - Find files matching patterns
- **Session Management**: Multiple persistent conversations with working directory context
- **Terminal UI**: Dark theme, color-coded roles, auto-scroll, keyboard navigation
- **Settings Management**: Update provider, model, and working directory mid-conversation

## Session Flow

1. User sends message → `POST /api/sessions/:id/messages`
2. Session manager loads conversation history from database
3. Provider streams response (text deltas + tool calls)
4. Tools execute automatically with results fed back to provider
5. All message parts persisted to database
6. SSE events stream to frontend: `message.start`, `message.delta`, `tool.start`, `tool.result`, `message.done`

## Database Schema

PostgreSQL 17 with three tables:
1. **sessions** - id, title, working_directory, provider, model, timestamps
2. **messages** - id, session_id (FK), role, created_at
3. **message_parts** - id, message_id (FK), type, content (jsonb), order

Cascade deletes configured: session → messages → message_parts

## Future Enhancements

- Additional providers (Google Gemini, local llama.cpp)
- Bash tool for shell commands
- User approval system for dangerous operations
- Mode system (Ask/Plan/Build modes)
- Comprehensive testing suite (90%+ coverage goal)
