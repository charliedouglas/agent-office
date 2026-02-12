# 🏢 Agent Office

A pixel art visualisation of AI coding agents at work. Watch your Claude Code teams collaborate in a cozy virtual office — complete with desks, speech bubbles, sound effects, and a live task board.

Built with **Phaser.js** + **TypeScript** + **WebSockets**.

## ✨ Features

- **Live Agent Visualisation** — agents sit at desks, type, walk to each other, and chat
- **Team Zones** — auto-coloured clusters with labels, computed from agent positions
- **Speech Bubbles** — see what agents are saying to each other
- **Click-to-Message** — click any agent to send them a message
- **Task Board** — kanban overlay showing each agent's plan (To Do → In Progress → Done)
- **8-bit Sound Effects** — typing, footsteps, notification chimes, ambient hum (with mute toggle)
- **Cross-Agent Collaboration** — agents walk to each other when editing the same file
- **REST API** — register/update agents from external tools like OpenClaw
- **Mock Mode** — demo with fake agents when no real agents are running

## 🏗 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Claude Code     │     │     Bridge        │     │    Frontend       │
│  (agent-run)     │────▶│  (Node.js + WS)   │────▶│  (Phaser.js)     │
│                  │     │                   │     │                   │
│ Writes .agent/   │     │ Watches .agent/   │     │ Renders office    │
│ state files      │     │ Emits WS events   │     │ Animates agents   │
└─────────────────┘     │ REST API :3002    │     └──────────────────┘
                        └──────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run everything (bridge + frontend)
npm run dev

# Frontend: http://localhost:5173
# Bridge WS: ws://localhost:3001
# REST API:  http://localhost:3002
```

Opens in mock mode with 9 demo agents across 4 teams.

## 🤖 Real Mode (with Claude Code)

```bash
# Use the agent-run wrapper to spawn a Claude Code session
npx agent-run --name ember-otter --team frontend --task "Build new feature" \
  -- claude --dangerously-skip-permissions -p "Your prompt here"
```

The wrapper tells Claude Code to maintain a `.agent/ember-otter.json` plan file. The bridge watches these files and streams events to the frontend.

## 📡 REST API

Register agents from any tool:

```bash
# Create an agent
curl -X POST http://localhost:3002/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "team": "backend", "task": "Fix API bug"}'

# List agents
curl http://localhost:3002/api/agents

# Update agent
curl -X PATCH http://localhost:3002/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"state": "typing"}'

# Remove agent
curl -X DELETE http://localhost:3002/api/agents/my-agent
```

## 📁 Project Structure

```
agent-office/
├── packages/
│   ├── frontend/          # Phaser.js + Vite
│   │   └── src/
│   │       ├── scenes/    # OfficeScene (main), UIScene
│   │       ├── entities/  # Agent, Desk, TaskBoard
│   │       ├── ui/        # ChatInput
│   │       ├── audio/     # SoundManager (Web Audio API)
│   │       └── network/   # WebSocket client
│   ├── bridge/            # Node.js WebSocket + REST server
│   │   └── src/
│   │       ├── index.ts   # Main server (WS + mock mode)
│   │       ├── watcher.ts # .agent/ file watcher
│   │       ├── api.ts     # REST API (port 3002)
│   │       └── collaboration.ts  # Cross-agent detection
│   └── agent-run/         # CLI wrapper for Claude Code
│       └── src/
│           ├── index.ts   # CLI entry point
│           └── state.ts   # .agent/ JSON state manager
├── shared/
│   └── types.ts           # Shared TypeScript types
└── .agent/                # Runtime agent state files (gitignored)
```

## 🎨 Visual Style

Warm beige office with pixel art aesthetic. Programmatic agent sprites with team-coloured shirts, unique skin/hair tones, and ties for managers. LimeZu Modern Office asset pack available for future furniture upgrades.

## 🛠 Built With

- [Phaser 3](https://phaser.io/) — 2D game framework
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Vite](https://vitejs.dev/) — frontend bundler
- [chokidar](https://github.com/paulmillr/chokidar) — file watching
- [ws](https://github.com/websockets/ws) — WebSocket server
- Web Audio API — procedural 8-bit sounds

## 📜 License

MIT
