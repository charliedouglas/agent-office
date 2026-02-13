#!/bin/bash
# demo.sh - Demo script that spawns fake agents to demonstrate Agent Office
#
# This script:
# 1. Spawns 3 fake agents via the REST API with different teams
# 2. Simulates them working (updating state, changing currentFile, completing plan items)
# 3. After 30 seconds, removes them
#
# Usage:
#   ./tools/demo.sh

set -euo pipefail

API_URL="${AGENT_OFFICE_API_URL:-http://localhost:3002}"
DEMO_DURATION=30  # seconds

echo "========================================"
echo "  Agent Office Demo"
echo "========================================"
echo ""
echo "This demo will:"
echo "  1. Create 3 simulated agents"
echo "  2. Simulate their work for ${DEMO_DURATION}s"
echo "  3. Clean up and remove agents"
echo ""
echo "Starting in 2 seconds..."
sleep 2

# Agent configurations
AGENTS=(
  "demo-alice|engineering|Implementing new feature"
  "demo-bob|design|Designing UI components"
  "demo-charlie|qa|Writing integration tests"
)

FILES=(
  "src/OfficeScene.ts"
  "src/Agent.ts"
  "src/TaskBoard.ts"
  "assets/sprites.png"
  "tests/integration.spec.ts"
  "docs/architecture.md"
)

STATES=("typing" "idle" "talking")

# Create agents
echo "[Demo] Creating agents..."
for agent_config in "${AGENTS[@]}"; do
  IFS='|' read -r name team task <<< "$agent_config"

  echo "  Creating: $name ($team)"

  PLAN='[
    {"text":"Review requirements","status":"completed"},
    {"text":"Implement core functionality","status":"in_progress"},
    {"text":"Write tests","status":"pending"},
    {"text":"Update documentation","status":"pending"}
  ]'

  curl -s -X POST "$API_URL/api/agents" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\":\"$name\",
      \"team\":\"$team\",
      \"task\":\"$task\",
      \"state\":\"typing\",
      \"plan\":$PLAN
    }" > /dev/null || echo "    Warning: Failed to create $name"
done

echo ""
echo "[Demo] Agents created! Simulating work for ${DEMO_DURATION}s..."
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo "[Demo] Cleaning up agents..."
  for agent_config in "${AGENTS[@]}"; do
    IFS='|' read -r name team task <<< "$agent_config"
    echo "  Removing: $name"
    curl -s -X DELETE "$API_URL/api/agents/$name" > /dev/null 2>&1 || true
  done
  echo ""
  echo "[Demo] Demo completed!"
}

trap cleanup EXIT INT TERM

# Simulation loop
START_TIME=$(date +%s)
ITERATION=0

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [[ $ELAPSED -ge $DEMO_DURATION ]]; then
    break
  fi

  # Pick a random agent to update
  AGENT_CONFIG="${AGENTS[$((RANDOM % ${#AGENTS[@]}))]}"
  IFS='|' read -r name team task <<< "$AGENT_CONFIG"

  # Random action
  ACTION=$((RANDOM % 4))

  case $ACTION in
    0)
      # Change state
      NEW_STATE="${STATES[$((RANDOM % ${#STATES[@]}))]}"
      echo "[Demo] $name -> state: $NEW_STATE"
      curl -s -X PATCH "$API_URL/api/agents/$name" \
        -H "Content-Type: application/json" \
        -d "{\"state\":\"$NEW_STATE\"}" > /dev/null || true
      ;;
    1)
      # Change current file
      NEW_FILE="${FILES[$((RANDOM % ${#FILES[@]}))]}"
      echo "[Demo] $name -> working on: $NEW_FILE"
      curl -s -X PATCH "$API_URL/api/agents/$name" \
        -H "Content-Type: application/json" \
        -d "{\"currentFile\":\"$NEW_FILE\"}" > /dev/null || true
      ;;
    2)
      # Update a plan item
      PLAN_UPDATES=(
        '[{"text":"Review requirements","status":"completed"},{"text":"Implement core functionality","status":"in_progress"},{"text":"Write tests","status":"pending"},{"text":"Update documentation","status":"pending"}]'
        '[{"text":"Review requirements","status":"completed"},{"text":"Implement core functionality","status":"completed"},{"text":"Write tests","status":"in_progress"},{"text":"Update documentation","status":"pending"}]'
        '[{"text":"Review requirements","status":"completed"},{"text":"Implement core functionality","status":"completed"},{"text":"Write tests","status":"completed"},{"text":"Update documentation","status":"in_progress"}]'
      )
      NEW_PLAN="${PLAN_UPDATES[$((RANDOM % ${#PLAN_UPDATES[@]}))]}"
      echo "[Demo] $name -> updating plan progress"
      curl -s -X PATCH "$API_URL/api/agents/$name" \
        -H "Content-Type: application/json" \
        -d "{\"plan\":$NEW_PLAN}" > /dev/null || true
      ;;
    3)
      # Just update timestamp (heartbeat)
      curl -s -X PATCH "$API_URL/api/agents/$name" \
        -H "Content-Type: application/json" \
        -d "{\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}" \
        > /dev/null || true
      ;;
  esac

  # Sleep for a bit
  sleep $((1 + RANDOM % 3))

  ITERATION=$((ITERATION + 1))
done

# Cleanup happens via trap
