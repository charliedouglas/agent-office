# CLAUDE.md — Agent Office

## Project Overview
A pixel art visualisation of Claude Code Agent Teams. Renders an interactive office scene where each AI agent is a character at a desk. Agents walk to each other's desks to communicate. Users can click agents to message them.

## Tech Stack
- **Frontend:** Phaser.js 3 + TypeScript, bundled with Vite
- **Bridge:** Node.js + TypeScript, chokidar for file watching, ws for WebSocket
- **Art:** 32x32 pixel sprites (placeholder/free assets initially)
- **Monorepo structure:** `packages/bridge` and `packages/frontend`

## Project Structure
```
agent-office/
├── packages/
│   ├── bridge/           # Node.js file watcher + WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── watcher.ts        # File system watcher for .claude/teams/
│   │   │   ├── parser.ts         # Parse agent team state from files
│   │   │   ├── events.ts         # Event types and emitter
│   │   │   └── ws-server.ts      # WebSocket server
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/         # Phaser.js pixel art office
│       ├── src/
│       │   ├── main.ts           # Entry point, Phaser config
│       │   ├── scenes/
│       │   │   ├── OfficeScene.ts # Main office scene
│       │   │   └── UIScene.ts    # HUD overlay (task board, chat)
│       │   ├── entities/
│       │   │   ├── Agent.ts      # Agent character sprite + animations
│       │   │   ├── Desk.ts       # Desk tile object
│       │   │   └── TaskBoard.ts  # Wall-mounted task board
│       │   ├── systems/
│       │   │   ├── Movement.ts   # A* pathfinding on grid
│       │   │   └── Messages.ts   # Speech bubbles + message queue
│       │   ├── network/
│       │   │   └── Socket.ts     # WebSocket client
│       │   └── assets/           # Sprites, tilemaps, audio
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── shared/
│   └── types.ts          # Shared event/message types
├── package.json          # Root workspace config
├── README.md
└── CLAUDE.md
```

## Key Design Decisions
- Phaser.js for rendering (mature 2D game engine, good sprite/animation support)
- Grid-based movement with A* pathfinding for agent walking
- WebSocket for real-time bridge→frontend communication
- File watching on .claude/teams/ directory for agent team state
- 32x32 sprites for good balance of detail and pixel art aesthetic
- Monorepo with npm workspaces

## Conventions
- TypeScript throughout
- ES modules
- Functional where possible, classes for Phaser entities
- Event-driven architecture between bridge and frontend

## Running
- `npm run dev` — starts both bridge and frontend
- Bridge runs on ws://localhost:3001
- Frontend dev server on http://localhost:5173
