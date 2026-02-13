#!/bin/bash
# spawn-agent.sh - Spawn a Claude Code agent that automatically appears in Agent Office
#
# Usage:
#   spawn-agent.sh --name <name> --team <team> --task <task> -- <claude-code-command> [args...]
#
# Example:
#   spawn-agent.sh --name alice-agent --team engineering --task "Fix bug in parser" -- claude-code -p "Fix the parser bug"

set -euo pipefail

# Configuration
API_URL="${AGENT_OFFICE_API_URL:-http://localhost:3002}"
UPDATE_INTERVAL=5  # seconds between state updates

# Parse arguments
NAME=""
TEAM=""
TASK=""
COMMAND=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      NAME="$2"
      shift 2
      ;;
    --team)
      TEAM="$2"
      shift 2
      ;;
    --task)
      TASK="$2"
      shift 2
      ;;
    --)
      shift
      COMMAND=("$@")
      break
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: spawn-agent.sh --name <name> --team <team> --task <task> -- <command> [args...]"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$NAME" ]]; then
  echo "Error: --name is required"
  exit 1
fi

if [[ -z "$TEAM" ]]; then
  TEAM="default"
fi

if [[ -z "$TASK" ]]; then
  TASK="Running command: ${COMMAND[*]}"
fi

if [[ ${#COMMAND[@]} -eq 0 ]]; then
  echo "Error: No command specified after --"
  echo "Usage: spawn-agent.sh --name <name> --team <team> --task <task> -- <command> [args...]"
  exit 1
fi

echo "[spawn-agent] Starting agent: $NAME"
echo "[spawn-agent] Team: $TEAM"
echo "[spawn-agent] Task: $TASK"
echo "[spawn-agent] Command: ${COMMAND[*]}"

# Register agent with the API
echo "[spawn-agent] Registering agent with API..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"team\":\"$TEAM\",\"task\":\"$TASK\"}" \
  || echo '{"error":"Failed to register"}')

if echo "$REGISTER_RESPONSE" | grep -q '"error"'; then
  echo "[spawn-agent] Warning: Failed to register agent with API"
  echo "[spawn-agent] Response: $REGISTER_RESPONSE"
  echo "[spawn-agent] Continuing anyway..."
else
  echo "[spawn-agent] Agent registered successfully"
fi

# Cleanup function
cleanup() {
  EXIT_CODE=$?
  echo ""
  echo "[spawn-agent] Cleaning up..."

  # Update state to idle
  curl -s -X PATCH "$API_URL/api/agents/$NAME" \
    -H "Content-Type: application/json" \
    -d '{"state":"idle"}' > /dev/null 2>&1 || true

  # Delete agent from API
  curl -s -X DELETE "$API_URL/api/agents/$NAME" > /dev/null 2>&1 || true

  echo "[spawn-agent] Agent $NAME removed from office"

  # Kill background update process if it exists
  if [[ -n "${UPDATE_PID:-}" ]] && kill -0 "$UPDATE_PID" 2>/dev/null; then
    kill "$UPDATE_PID" 2>/dev/null || true
  fi

  exit $EXIT_CODE
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# Update agent state to typing
echo "[spawn-agent] Setting agent state to typing..."
curl -s -X PATCH "$API_URL/api/agents/$NAME" \
  -H "Content-Type: application/json" \
  -d '{"state":"typing"}' > /dev/null || true

# Start background process to periodically update agent state
(
  while true; do
    sleep $UPDATE_INTERVAL
    # Periodically ping the API to show the agent is still alive
    curl -s -X PATCH "$API_URL/api/agents/$NAME" \
      -H "Content-Type: application/json" \
      -d "{\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}" \
      > /dev/null 2>&1 || true
  done
) &
UPDATE_PID=$!

# Run the command
echo "[spawn-agent] Running command..."
echo "---"

"${COMMAND[@]}"

# Command completed - cleanup will happen via trap
