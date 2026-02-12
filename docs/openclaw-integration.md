# OpenClaw Integration Guide

This guide explains how to integrate Agent Office with OpenClaw to automatically populate the office visualization with Claude Code agents.

## Overview

Agent Office can display agents created by OpenClaw or any external tool through two methods:

1. **HTTP REST API** - Register agents via HTTP endpoints (recommended for external tools)
2. **Direct File Management** - Write agent JSON files to `~/.agent/` directory

When agents are created, they automatically appear in the Agent Office visualization with:
- Team-based desk clustering
- Automatic desk position assignment
- Real-time state updates via WebSocket

## Quick Start

### 1. Start the Bridge Server

```bash
cd agent-office
npm run dev
```

This starts:
- WebSocket server on `ws://localhost:3001` (for frontend)
- HTTP API server on `http://localhost:3002` (for OpenClaw)

### 2. Register Agents via HTTP API

OpenClaw or any external tool can register agents by making HTTP requests:

#### Create an Agent

```bash
curl -X POST http://localhost:3002/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CodeReviewer",
    "team": "engineering",
    "task": "Reviewing pull request #123"
  }'
```

**Response:**
```json
{
  "agent": {
    "id": "codereviewer",
    "name": "CodeReviewer",
    "role": "Reviewing pull request #123",
    "team": "engineering",
    "state": "typing",
    "x": 3,
    "y": 3,
    "deskPosition": { "x": 3, "y": 3 }
  }
}
```

#### List All Agents

```bash
curl http://localhost:3002/api/agents
```

#### Update an Agent

```bash
curl -X PATCH http://localhost:3002/api/agents/CodeReviewer \
  -H "Content-Type: application/json" \
  -d '{
    "state": "idle",
    "role": "Completed review"
  }'
```

#### Remove an Agent

```bash
curl -X DELETE http://localhost:3002/api/agents/CodeReviewer
```

## API Reference

### Base URL

```
http://localhost:3002
```

### Endpoints

#### `GET /api/agents`

List all registered agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Agent 1",
      "role": "Task description",
      "team": "engineering",
      "state": "typing",
      "x": 3,
      "y": 3,
      "deskPosition": { "x": 3, "y": 3 }
    }
  ]
}
```

#### `POST /api/agents`

Create a new agent.

**Request Body:**
```json
{
  "name": "Agent Name",      // Required
  "team": "engineering",     // Optional, default: "engineering"
  "task": "Task description" // Optional, default: "Working..."
}
```

**Response:** `201 Created`
```json
{
  "agent": { /* agent object */ }
}
```

#### `GET /api/agents/:name`

Get a specific agent by name.

**Response:** `200 OK`
```json
{
  "agent": { /* agent object */ }
}
```

#### `PATCH /api/agents/:name`

Update an existing agent. All fields are optional.

**Request Body:**
```json
{
  "role": "New task",
  "state": "idle",
  "team": "design"
}
```

**Response:** `200 OK`
```json
{
  "agent": { /* updated agent object */ }
}
```

#### `DELETE /api/agents/:name`

Remove an agent.

**Response:** `204 No Content`

#### `GET /api/health`

Health check endpoint.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "agent-office-bridge"
}
```

## Agent Properties

### Required Fields

- `name` (string) - Agent display name, used as ID when sanitized

### Optional Fields

- `team` (string) - Team name for desk clustering
  - `engineering` - Top-left cluster (default)
  - `design` - Top-right cluster
  - `qa` - Bottom-right cluster
  - `management` - Bottom-left area
  - Other values use center area

- `task` (string) - Current task description, displayed as agent's role

### Auto-Generated Fields

- `id` - Sanitized name (lowercase, spaces replaced with dashes)
- `state` - Agent state: `idle`, `typing`, `walking`, `talking` (default: `typing`)
- `x`, `y` - Current grid position
- `deskPosition` - Assigned desk position based on team
- `role` - Set to task description or "Working..."

## Team-Based Desk Clustering

Agents are automatically assigned desk positions based on their team:

```
┌──────────────────────────────────────┐
│  [Eng] [Eng]          [Des] [Des]   │  ← Engineering & Design
│                                       │
│  [Eng] [Eng]                         │
│                                       │
│                                       │
│                   Office              │
│                   Floor               │
│                                       │
│  [Mgmt]           [QA]  [QA]         │  ← Management & QA
└──────────────────────────────────────┘
```

Agents in the same team cluster together. New agents are placed at the next available position in their team's cluster.

## File Format

Agents are stored as JSON files in `~/.agent/<name>.json`:

```json
{
  "id": "agent-name",
  "name": "Agent Name",
  "role": "Current task description",
  "team": "engineering",
  "state": "typing",
  "x": 3,
  "y": 3,
  "deskPosition": {
    "x": 3,
    "y": 3
  }
}
```

## OpenClaw Integration Examples

### Example 1: Create Agent on Task Start

```bash
# When starting a new agent task in OpenClaw
curl -X POST http://localhost:3002/api/agents \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"${AGENT_NAME}\",
    \"team\": \"engineering\",
    \"task\": \"${TASK_DESCRIPTION}\"
  }"
```

### Example 2: Update Agent State

```bash
# When agent completes a task
curl -X PATCH http://localhost:3002/api/agents/${AGENT_NAME} \
  -H "Content-Type: application/json" \
  -d '{
    "state": "idle",
    "role": "Task completed"
  }'
```

### Example 3: Remove Agent on Task End

```bash
# When agent task finishes
curl -X DELETE http://localhost:3002/api/agents/${AGENT_NAME}
```

## Using with agent-run Wrapper

The `packages/agent-run` wrapper (if available) provides a higher-level interface for launching Claude Code agents that automatically integrate with Agent Office.

## Environment Variables

Configure the bridge server with environment variables:

```bash
# WebSocket port (default: 3001)
export WS_PORT=3001

# HTTP API port (default: 3002)
export API_PORT=3002

# Enable/disable mock mode (default: true)
export MOCK_MODE=false
```

## Troubleshooting

### Agents Not Appearing

1. Check that the bridge server is running
2. Verify the API endpoint is accessible: `curl http://localhost:3002/api/health`
3. Check bridge server logs for errors
4. Verify agent files exist in `~/.agent/`

### CORS Issues

The API includes CORS headers allowing requests from any origin. If you encounter CORS issues, check:
- Browser console for specific error messages
- Network tab to verify requests are reaching the server

### File Watcher Not Detecting Changes

1. Ensure `~/.agent/` directory exists
2. Check file watcher logs in bridge server output
3. Try restarting the bridge server

## Advanced Usage

### Custom Teams

You can create custom team names. Agents with unrecognized team names will be placed in the center area of the office:

```bash
curl -X POST http://localhost:3002/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CustomAgent",
    "team": "security",
    "task": "Security audit"
  }'
```

### Manual Desk Positioning

You can override auto-assigned positions by updating agent coordinates:

```bash
curl -X PATCH http://localhost:3002/api/agents/CustomAgent \
  -H "Content-Type: application/json" \
  -d '{
    "x": 10,
    "y": 10,
    "deskPosition": { "x": 10, "y": 10 }
  }'
```

## Next Steps

- Explore the frontend visualization at `http://localhost:5173`
- Review the `packages/bridge/src/openclaw-hook.ts` module for programmatic integration
- Check out example scripts in `examples/` directory
- Read the main [README.md](../README.md) for project overview
