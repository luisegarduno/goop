# Phase 5 Manual Verification Test Script

This document explains how to use the test script for Phase 5 manual verification.

## Prerequisites

1. **PostgreSQL must be running:**
   ```bash
   docker-compose up -d
   ```

2. **Environment variables must be set:**
   - Copy `.env.example` to `.env` in project root
   - Set `ANTHROPIC_API_KEY` to your actual API key

3. **Database migrations must be applied:**
   ```bash
   cd packages/backend
   bun run db:migrate
   ```

4. **Backend server must be running:**
   ```bash
   cd packages/backend
   bun run dev
   ```

## Running the Test Script

In a separate terminal, run:

```bash
cd packages/backend
./test-phase5.sh
```

## What the Script Tests

The script verifies all manual verification criteria from Phase 5:

1. **SSE Streaming**
   - Sends a simple message
   - Verifies `message.start`, `message.delta`, and `message.done` events are received
   - Displays sample streamed text

2. **Tool Execution**
   - Sends a message that triggers the `read_file` tool
   - Verifies `tool.start` and `tool.result` events are received
   - Shows which tool was called

3. **Database Persistence**
   - Checks that messages are stored in the database
   - Verifies message parts are stored correctly

4. **Conversation History**
   - Sends a follow-up question to test context retention
   - Verifies the assistant can reference previous messages

5. **Session Timestamps**
   - Checks that the session's `updatedAt` timestamp changes after messages

## Expected Output

The script will output colored status messages:
- 🟡 **[TEST]** - Starting a test
- 🟢 **[✓]** - Test passed
- 🔴 **[✗]** - Test failed

At the end, you'll see a summary with the session ID and verification status.

## Troubleshooting

### "Connection refused" errors
- Make sure the backend server is running on port 3001
- Check if `HONO_BACKEND_PORT` in `.env` matches the expected port

### "Failed to create session" error
- Verify PostgreSQL is running: `docker-compose ps`
- Check database connection in `.env`
- Ensure migrations have been run

### Tool execution not triggering
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check that the `read_file` tool is registered in `src/tools/index.ts`
- Look at backend server logs for errors

### Timeout errors
- The Anthropic API may be slow; this is normal
- The script uses 10-15 second timeouts which should be sufficient
- If timeouts persist, check your API key and network connection

## Manual Testing Checklist

After running the automated script, manually verify:

- [ ] Can send message via SSE endpoint (automated ✓)
- [ ] Receives streaming text events (automated ✓)
- [ ] Tool execution triggers tool.start and tool.result events (automated ✓)
- [ ] Message stored in database with all parts (automated ✓)
- [ ] Conversation history loads correctly (automated ✓)
- [ ] Session timestamp updates after message (automated ✓)

All manual verification steps can be automated with this script!

## Advanced Testing

You can customize the script by setting environment variables:

```bash
# Use a different API endpoint
API_BASE=http://localhost:8080/api ./test-phase5.sh

# Use a different working directory for file operations
WORKING_DIR=/path/to/project ./test-phase5.sh
```

## Next Steps

After verifying Phase 5:
- Proceed to Phase 6 (Frontend - Terminal UI)
- Or continue to Phase 7 (Integration & End-to-End Testing)
