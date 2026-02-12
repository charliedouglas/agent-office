# Agent Office 🏢

A pixel art visualisation of Claude Code Agent Teams at work.

Watch your AI agents as little pixel people — sitting at desks, typing away, walking over to each other's desks to communicate, and collaborating on a shared task board. Click on any agent to send them a message directly.

## Architecture

```
Claude Code Agent Teams
    ↓ (file system)
.claude/teams/<id>/
    ↓ (file watcher)
Node.js Bridge (WebSocket server)
    ↓ (events: spawn, message, task, status)
Phaser.js Frontend (pixel art office)
```

## Stack

- **Frontend:** Phaser.js (2D game engine) for the pixel art office scene
- **Bridge:** Node.js + chokidar (file watcher) + ws (WebSocket server)
- **Art:** 32x32 pixel sprites, tilemaps designed in Tiled
- **Build:** Vite for frontend bundling

## Getting Started

```bash
npm install
npm run dev        # Start bridge + frontend dev server
npm run bridge     # Start bridge only
npm run frontend   # Start frontend only
```

## How It Works

1. **Bridge** watches `.claude/teams/` for agent team activity
2. Parses team state (agents, messages, tasks) and emits WebSocket events
3. **Frontend** renders a pixel art office that reacts to events in real-time
4. Click an agent character to open a text input and message them directly

## License

MIT
