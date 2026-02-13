# Agent Office

**A pixel art visualization of AI coding agents at work.**

Watch your Claude Code teams collaborate in real-time within a cozy virtual office. Each agent appears as a character at their desk—typing, walking around to chat with teammates, and updating their task boards. Built for developers who want to see what their AI agents are actually doing.

---

## Screenshot

_[Screenshot placeholder: Office view with agents at desks, team zones colored, task board overlay visible]_

---

## What is Agent Office?

Agent Office bridges the invisible world of AI agent teams into a playful, observable workspace. Instead of watching terminal logs scroll by, you see:

- **Agents as pixel art characters** sitting at desks, each with unique appearances
- **Real-time activity**: typing animations, walking between desks, speech bubbles
- **Team zones** with auto-generated colors and labels
- **Live task board** showing each agent's plan (To Do → In Progress → Done)
- **Click-to-message** any agent directly from the UI
- **8-bit sound effects** for typing, footsteps, and notifications (mute toggle included)

Perfect for:
- Observing multi-agent workflows
- Demos and presentations
- Understanding agent collaboration patterns
- Just enjoying the vibes while your agents work

---

## Architecture Overview

Agent Office consists of three main components:

```
┌─────────────────────┐
│   Claude Code       │  Agents write state to .agent/*.json files
│   (via agent-run)   │  OR external tools POST to REST API
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Bridge            │  Node.js server with:
│   (packages/bridge) │  • File watcher (chokidar) for .agent/ dir
│                     │  • WebSocket server (ws://localhost:3001)
│                     │  • REST API (http://localhost:3002)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Frontend          │  Phaser.js + TypeScript app:
│   (packages/frontend)│  • Renders pixel art office scene
│                     │  • Animates agents and UI overlays
│                     │  • Connects via WebSocket for live updates
└─────────────────────┘
```

### How It Works

1. **Agent State**: Agents (via `agent-run` wrapper or direct API calls) write/update their state as JSON files in `.agent/` directory
2. **Bridge Watches**: The bridge server watches `.agent/` for changes using chokidar, parses agent state, and broadcasts events via WebSocket
3. **Frontend Renders**: The Phaser.js frontend connects to the WebSocket and renders/animates the office based on incoming events

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-office.git
cd agent-office

# Install dependencies (uses npm workspaces)
npm install
```

### Running in Mock Mode

Mock mode automatically activates when there's no `.agent/` directory. Great for demos and development:

```bash
# Start bridge + frontend
npm run dev

# Frontend:  http://localhost:5173
# Bridge WS: ws://localhost:3001
# REST API:  http://localhost:3002
```

You'll see 9 demo agents across 4 teams with randomized activities.

### Running in Real Mode

Real mode activates when `.agent/` directory exists and contains agent state files.

#### Option 1: Using agent-run CLI wrapper

The `agent-run` wrapper launches Claude Code sessions that maintain `.agent/*.json` state files:

```bash
# Start a Claude Code agent that writes state to .agent/ember-otter.json
npx agent-run \
  --name ember-otter \
  --team frontend \
  --task "Build new user dashboard" \
  -- claude --dangerously-skip-permissions -p "Build a user dashboard"
```

The bridge will automatically detect the new agent file and stream updates to the frontend.

#### Option 2: Using REST API

Register agents programmatically from any tool (like OpenClaw):

```bash
# Create an agent
curl -X POST http://localhost:3002/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "team": "backend",
    "task": "Fix authentication bug",
    "state": "typing",
    "currentFile": "auth.ts"
  }'

# The bridge will create .agent/my-agent.json and notify the frontend
```

---

## Real Mode Details

### .agent/ Directory Structure

The bridge watches `.agent/*.json` files with this schema:

```json
{
  "name": "ember-otter",
  "team": "frontend",
  "task": "Build user dashboard",
  "state": "typing",
  "currentFile": "Dashboard.tsx",
  "plan": {
    "todo": ["Create component structure", "Add API integration"],
    "inProgress": ["Style with Tailwind"],
    "done": ["Set up routing"]
  }
}
```

### Supported States

- `typing`: Agent is editing code (shows typing animation)
- `idle`: Agent is at their desk, not actively working
- `walking`: Agent is moving between desks
- `thinking`: Agent is processing (shows thought bubble animation)

### Cross-Agent Collaboration

When multiple agents edit the same file, the bridge detects this and triggers a "walking to collaborate" animation—one agent walks to the other's desk.

---

## Mock Mode Details

Mock mode activates automatically when:
- No `.agent/` directory exists, OR
- `.agent/` directory is empty

The bridge generates 9 fake agents across 4 teams with randomized:
- Names (from a curated list of animal + adjective combos)
- States (typing, idle, thinking)
- Files (common filenames like `api.ts`, `index.tsx`)
- Plan items (procedurally generated tasks)

Activities change every 2-5 seconds to simulate real work.

---

## REST API Endpoints

Base URL: `http://localhost:3002`

### Create Agent

```http
POST /api/agents
Content-Type: application/json

{
  "name": "agent-name",
  "team": "team-name",
  "task": "Task description",
  "state": "typing",           // optional, default: "idle"
  "currentFile": "file.ts"     // optional
}
```

**Response**: `201 Created` with agent JSON

---

### List All Agents

```http
GET /api/agents
```

**Response**: `200 OK` with array of agent objects

---

### Get Single Agent

```http
GET /api/agents/:name
```

**Response**: `200 OK` with agent object, or `404 Not Found`

---

### Update Agent

```http
PATCH /api/agents/:name
Content-Type: application/json

{
  "state": "walking",
  "currentFile": "new-file.ts",
  "plan": {
    "todo": ["New task"],
    "inProgress": ["Current work"],
    "done": ["Finished item"]
  }
}
```

**Response**: `200 OK` with updated agent object

---

### Delete Agent

```http
DELETE /api/agents/:name
```

**Response**: `204 No Content`

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | [Phaser.js 3](https://phaser.io/) | 2D game engine for rendering the office scene |
| Frontend | [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| Frontend | [Vite](https://vitejs.dev/) | Fast dev server and bundler |
| Bridge | [Node.js](https://nodejs.org/) | Server runtime |
| Bridge | [ws](https://github.com/websockets/ws) | WebSocket server |
| Bridge | [chokidar](https://github.com/paulmillr/chokidar) | File system watcher |
| Bridge | [Express](https://expressjs.com/) | REST API framework |
| Audio | Web Audio API | Procedural 8-bit sound generation |
| Assets | Pixel art (32×32) | Custom programmatic sprites + LimeZu Modern Office tileset |

---

## Project Structure

```
agent-office/
├── packages/
│   ├── frontend/              # Phaser.js visualization
│   │   ├── src/
│   │   │   ├── main.ts        # Entry point
│   │   │   ├── scenes/
│   │   │   │   ├── OfficeScene.ts    # Main office render
│   │   │   │   └── UIScene.ts        # Task board overlay
│   │   │   ├── entities/
│   │   │   │   ├── Agent.ts          # Agent character sprite
│   │   │   │   ├── Desk.ts           # Desk tiles
│   │   │   │   └── TaskBoard.ts      # Kanban board
│   │   │   ├── systems/
│   │   │   │   ├── Movement.ts       # A* pathfinding
│   │   │   │   └── Messages.ts       # Speech bubbles
│   │   │   ├── audio/
│   │   │   │   └── SoundManager.ts   # Web Audio synth
│   │   │   ├── ui/
│   │   │   │   └── ChatInput.ts      # Click-to-message UI
│   │   │   └── network/
│   │   │       └── Socket.ts         # WebSocket client
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── bridge/                # Node.js server
│   │   ├── src/
│   │   │   ├── index.ts       # Main server entry
│   │   │   ├── watcher.ts     # .agent/ file watcher
│   │   │   ├── parser.ts      # JSON state parser
│   │   │   ├── events.ts      # Event types
│   │   │   ├── ws-server.ts   # WebSocket server
│   │   │   ├── api.ts         # REST API endpoints
│   │   │   ├── collaboration.ts  # Cross-agent detection
│   │   │   └── mock.ts        # Mock mode generator
│   │   └── package.json
│   └── agent-run/             # CLI wrapper for Claude Code
│       ├── src/
│       │   ├── index.ts       # CLI entry point
│       │   └── state.ts       # .agent/ JSON writer
│       └── package.json
├── shared/
│   └── types.ts               # Shared TypeScript interfaces
├── .agent/                    # Runtime agent state (gitignored)
├── package.json               # Root workspace config
├── CLAUDE.md                  # Project context for AI
└── README.md
```

---

## Development

### Running Individual Packages

```bash
# Run bridge only
npm run dev:bridge

# Run frontend only (requires bridge to be running)
npm run dev:frontend

# Run agent-run CLI
npm run dev -w packages/agent-run
```

### Building for Production

```bash
# Build all packages
npm run build

# Build individual packages
npm run build -w packages/frontend
npm run build -w packages/bridge
```

---

## Visual Style

The office uses a warm beige color palette with pixel art aesthetics. Agent sprites are programmatically generated with:
- Team-colored shirts (auto-generated from team name)
- Randomized skin tones and hair colors for diversity
- Ties for "manager" roles (if specified)

The LimeZu Modern Office asset pack is available for future furniture and decoration upgrades.

---

## Contributing

Contributions are welcome! Some ideas:
- Additional agent animations (celebrating, confused, etc.)
- More sound effects and ambient music
- Integration with other AI agent frameworks
- Custom office layouts or themes
- Performance optimizations for large teams

---

## License

MIT

---

## Credits

Built with love for the AI agent community. Special thanks to the Phaser.js team and the creators of the LimeZu Modern Office asset pack.
