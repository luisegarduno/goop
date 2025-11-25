#!/bin/bash
# Test script for Phase 5: Session Manager & Streaming Integration
# This script verifies the manual testing criteria from the plan

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_BASE="${API_BASE:-http://localhost:3001/api}"
WORKING_DIR="${WORKING_DIR:-$(pwd)}"

echo -e "${YELLOW}=== Phase 5 Manual Verification Test Script ===${NC}\n"

# Function to print test status
print_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Test 1: Create a session
print_test "Creating a new session..."
SESSION_RESPONSE=$(curl -s -X POST "$API_BASE/sessions")
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$')

if [ -z "$SESSION_ID" ]; then
  print_error "Failed to create session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

print_success "Session created: $SESSION_ID"
echo ""

# Test 2: Send a simple message and capture SSE stream
print_test "Sending a simple message and capturing SSE events..."
echo -e "${YELLOW}Message:${NC} \"Hello! Can you help me?\""

# Create a temporary file for SSE output
SSE_OUTPUT=$(mktemp)

# Send message via SSE endpoint (capture first 5 seconds of output)
timeout 10s curl -s -X POST "$API_BASE/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Hello! Can you help me?\",\"workingDir\":\"$WORKING_DIR\"}" \
  > "$SSE_OUTPUT" 2>&1 || true

# Check if we received SSE events
if grep -q "event: message.start" "$SSE_OUTPUT"; then
  print_success "Received message.start event"
else
  print_error "Did not receive message.start event"
  echo "Output: $(cat "$SSE_OUTPUT")"
fi

if grep -q "event: message.delta" "$SSE_OUTPUT"; then
  print_success "Received message.delta events (streaming text)"

  # Extract and display a sample of the streamed text
  echo -e "${YELLOW}Sample streamed text:${NC}"
  grep "event: message.delta" "$SSE_OUTPUT" | head -n 3 | sed 's/^/  /'
else
  print_error "Did not receive message.delta events"
fi

if grep -q "event: message.done" "$SSE_OUTPUT"; then
  print_success "Received message.done event"
else
  print_error "Did not receive message.done event"
fi

echo ""
rm "$SSE_OUTPUT"

# Test 3: Send a message that triggers tool use
print_test "Sending a message that triggers tool use..."
echo -e "${YELLOW}Message:${NC} \"Can you read the package.json file?\""

SSE_OUTPUT=$(mktemp)

timeout 15s curl -s -X POST "$API_BASE/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Can you read the package.json file?\",\"workingDir\":\"$WORKING_DIR\"}" \
  > "$SSE_OUTPUT" 2>&1 || true

if grep -q "event: tool.start" "$SSE_OUTPUT"; then
  print_success "Received tool.start event"

  # Show which tool was called
  TOOL_NAME=$(grep "event: tool.start" "$SSE_OUTPUT" -A 1 | grep "toolName" | grep -o '"toolName":"[^"]*' | grep -o '[^"]*$' || echo "unknown")
  echo -e "${YELLOW}Tool called:${NC} $TOOL_NAME"
else
  print_error "Did not receive tool.start event"
fi

if grep -q "event: tool.result" "$SSE_OUTPUT"; then
  print_success "Received tool.result event"
else
  print_error "Did not receive tool.result event"
fi

echo ""
rm "$SSE_OUTPUT"

# Test 4: Verify messages are stored in database
print_test "Verifying messages stored in database..."

MESSAGES_RESPONSE=$(curl -s "$API_BASE/sessions/$SESSION_ID/messages")
MESSAGE_COUNT=$(echo "$MESSAGES_RESPONSE" | grep -o '"id":' | wc -l)

if [ "$MESSAGE_COUNT" -gt 0 ]; then
  print_success "Found $MESSAGE_COUNT messages in database"

  # Check if messages have parts
  PARTS_COUNT=$(echo "$MESSAGES_RESPONSE" | grep -o '"parts":' | wc -l)
  if [ "$PARTS_COUNT" -gt 0 ]; then
    print_success "Messages have message parts stored"
  else
    print_error "Messages do not have parts"
  fi
else
  print_error "No messages found in database"
fi

echo ""

# Test 5: Verify conversation history loads correctly
print_test "Verifying conversation history loads correctly..."

# Send another message to test history context
SSE_OUTPUT=$(mktemp)

timeout 10s curl -s -X POST "$API_BASE/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"What did I just ask you?\",\"workingDir\":\"$WORKING_DIR\"}" \
  > "$SSE_OUTPUT" 2>&1 || true

# If the assistant responds appropriately, it means history is being loaded
if grep -q "event: message.delta" "$SSE_OUTPUT"; then
  print_success "Assistant responded to follow-up question (history likely working)"
else
  print_error "No response to follow-up question"
fi

echo ""
rm "$SSE_OUTPUT"

# Test 6: Verify session timestamp updates
print_test "Verifying session timestamp updates..."

SESSION_BEFORE=$(curl -s "$API_BASE/sessions/$SESSION_ID")
UPDATED_AT_BEFORE=$(echo "$SESSION_BEFORE" | grep -o '"updatedAt":"[^"]*' | grep -o '[^"]*$')

# Wait a moment
sleep 2

# Send another message
timeout 10s curl -s -X POST "$API_BASE/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Thanks!\",\"workingDir\":\"$WORKING_DIR\"}" \
  > /dev/null 2>&1 || true

# Check updated timestamp
SESSION_AFTER=$(curl -s "$API_BASE/sessions/$SESSION_ID")
UPDATED_AT_AFTER=$(echo "$SESSION_AFTER" | grep -o '"updatedAt":"[^"]*' | grep -o '[^"]*$')

if [ "$UPDATED_AT_BEFORE" != "$UPDATED_AT_AFTER" ]; then
  print_success "Session timestamp updated after message"
  echo -e "${YELLOW}Before:${NC} $UPDATED_AT_BEFORE"
  echo -e "${YELLOW}After:${NC}  $UPDATED_AT_AFTER"
else
  print_error "Session timestamp did not update"
fi

echo ""

# Summary
echo -e "${GREEN}=== Test Summary ===${NC}"
echo -e "Session ID: ${YELLOW}$SESSION_ID${NC}"
echo -e ""
echo -e "All manual verification tests completed!"
echo -e "Review the output above to verify:"
echo -e "  - SSE streaming works (message.start, message.delta, message.done)"
echo -e "  - Tool execution triggers events (tool.start, tool.result)"
echo -e "  - Messages are stored in database with parts"
echo -e "  - Conversation history loads correctly"
echo -e "  - Session timestamps update after messages"
echo -e ""
echo -e "${YELLOW}Note:${NC} Make sure the backend server is running before executing this script:"
echo -e "  cd packages/backend && bun run dev"
