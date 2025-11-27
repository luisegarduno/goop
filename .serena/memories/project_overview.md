# Project Overview: goop

## Purpose
**goop** is an AI Coding Agent designed to assist with software development tasks. It provides an interactive terminal-like interface where users can have conversations with Claude AI and execute various coding tools (like reading files) within a specified working directory.

## Key Features
- **Interactive Terminal UI**: Terminal-inspired dark theme interface for AI conversations
- **Tool Execution**: AI can execute tools like `read_file` to interact with the local filesystem
- **Session Management**: Persistent conversation sessions stored in PostgreSQL
- **Real-time Streaming**: Server-Sent Events (SSE) for streaming AI responses
- **Working Directory Context**: Each session has a working directory that scopes all file operations
- **Conversation History**: All messages and tool executions are persisted to database

## Architecture Type
Monorepo structure with separate frontend and backend packages, using Bun workspaces.

## Development Status
Phases 1-6 complete:
- Infrastructure setup ✅
- Database schema & configuration ✅
- Backend core (Hono server & API routes) ✅
- Anthropic provider & tool system ✅
- Session manager & streaming integration ✅
- Frontend terminal UI ✅

## Future Enhancements
- Additional AI providers (OpenAI, Google, local models)
- Extended tool set (write_file, edit_file, bash, grep, glob)
- User approval system for dangerous operations
- Mode system (Ask, Plan, Build modes)
- Comprehensive testing suite
