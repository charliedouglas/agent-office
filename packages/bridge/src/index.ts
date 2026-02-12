import path from 'path';
import os from 'os';
import fs from 'fs';
import { startWSServer } from './ws-server.js';
import { startWatcher } from './watcher.js';
import { bridgeEvents } from './events.js';
import type { Agent, AgentState, Task } from '../../../shared/types.js';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');

console.log(`
┌────────────────────────────────────────┐
│     Agent Office Bridge Server         │
└────────────────────────────────────────┘
`);

const wss = startWSServer(WS_PORT);

// Check if .agent/ directory exists in project root
// When running from packages/bridge, we need to go up two levels to find project root
function findProjectRoot(): string {
  let current = process.cwd();

  // Try current directory first
  if (fs.existsSync(path.join(current, '.agent'))) {
    return current;
  }

  // Try parent directory (for when running from packages/bridge)
  const parent = path.dirname(current);
  if (fs.existsSync(path.join(parent, '.agent'))) {
    return parent;
  }

  // Try grandparent directory (for deeply nested structures)
  const grandparent = path.dirname(parent);
  if (fs.existsSync(path.join(grandparent, '.agent'))) {
    return grandparent;
  }

  // Default to current directory
  return current;
}

const projectRoot = findProjectRoot();
const agentDir = path.join(projectRoot, '.agent');

console.log(`[Init] Working directory: ${process.cwd()}`);
console.log(`[Init] Project root: ${projectRoot}`);
console.log(`[Init] Looking for: ${agentDir}`);

let useRealMode = false;
if (fs.existsSync(agentDir)) {
  console.log(`[Init] Found .agent/ directory`);
  // Check if there are any JSON files
  const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.json'));
  console.log(`[Init] Found ${files.length} JSON files`);
  if (files.length > 0) {
    useRealMode = true;
  }
} else {
  console.log(`[Init] .agent/ directory not found`);
}

// Allow environment variable to force mock mode
const forceMockMode = process.env.MOCK_MODE === 'true';

if (forceMockMode || !useRealMode) {
  console.log('[Mock Mode] Starting with fake data\n');
  startMockMode();
} else {
  console.log('[Real Mode] Starting file watcher for .agent/\n');
  console.log(`[Real Mode] Watching directory: ${agentDir}`);
  startWatcher(agentDir);
}

function startMockMode() {
  // ── Desk clusters by team ──
  // Engineering cluster (top-left, 2x2 facing inward)
  // Design cluster (top-right, 2 desks)
  // QA cluster (bottom-right, 2 desks)
  // Manager (bottom-left, solo desk, slightly apart)

  const mockAgents: Agent[] = [
    // Engineering (4 devs, clustered top-left)
    { id: 'eng-1', name: 'Alice',   role: 'Senior Engineer',  team: 'engineering', state: 'typing', x: 3, y: 3, deskPosition: { x: 3, y: 3 } },
    { id: 'eng-2', name: 'Bob',     role: 'Backend Engineer',  team: 'engineering', state: 'typing', x: 5, y: 3, deskPosition: { x: 5, y: 3 } },
    { id: 'eng-3', name: 'Charlie', role: 'Frontend Engineer', team: 'engineering', state: 'idle',   x: 3, y: 5, deskPosition: { x: 3, y: 5 } },
    { id: 'eng-4', name: 'Dave',    role: 'DevOps Engineer',   team: 'engineering', state: 'typing', x: 5, y: 5, deskPosition: { x: 5, y: 5 } },

    // Design (2 designers, top-right)
    { id: 'des-1', name: 'Eve',     role: 'UI Designer',       team: 'design', state: 'idle',   x: 13, y: 3, deskPosition: { x: 13, y: 3 } },
    { id: 'des-2', name: 'Fiona',   role: 'UX Researcher',     team: 'design', state: 'typing', x: 15, y: 3, deskPosition: { x: 15, y: 3 } },

    // QA (2 testers, bottom-right)
    { id: 'qa-1',  name: 'George',  role: 'QA Lead',           team: 'qa', state: 'typing', x: 13, y: 10, deskPosition: { x: 13, y: 10 } },
    { id: 'qa-2',  name: 'Hannah',  role: 'Test Engineer',     team: 'qa', state: 'idle',   x: 15, y: 10, deskPosition: { x: 15, y: 10 } },

    // Management (solo, bottom-left, slightly separated)
    { id: 'mgr-1', name: 'Marcus',  role: 'Engineering Manager', team: 'management', state: 'idle', x: 3, y: 11, deskPosition: { x: 3, y: 11 } },
  ];

  const mockTasks: Task[] = [
    { id: 'task-1', description: 'Build frontend office scene',      assignedTo: 'eng-1', status: 'in_progress' },
    { id: 'task-2', description: 'Set up WebSocket bridge',          assignedTo: 'eng-2', status: 'completed' },
    { id: 'task-3', description: 'Configure deployment pipeline',    assignedTo: 'eng-4', status: 'in_progress' },
    { id: 'task-4', description: 'Write integration tests',          assignedTo: 'qa-1',  status: 'pending' },
    { id: 'task-5', description: 'Design agent sprites',             assignedTo: 'des-1', status: 'in_progress' },
    { id: 'task-6', description: 'User research: office layout',     assignedTo: 'des-2', status: 'completed' },
    { id: 'task-7', description: 'Implement task board UI',          assignedTo: 'eng-3', status: 'pending' },
    { id: 'task-8', description: 'Add speech bubbles',               assignedTo: 'eng-1', status: 'completed' },
    { id: 'task-9', description: 'Create pixel art assets',          assignedTo: 'des-1', status: 'pending' },
    { id: 'task-10', description: 'Test agent movement',             assignedTo: 'qa-2',  status: 'pending' },
    { id: 'task-11', description: 'Write API documentation',         assignedTo: 'eng-2', status: 'pending' },
  ];

  setTimeout(() => {
    bridgeEvents.emitWSEvent({
      type: 'init',
      payload: { agents: mockAgents, tasks: mockTasks }
    });
    console.log('[Mock Mode] Sent initial state');
  }, 500);

  const messages = [
    'Can you review my PR?',
    'Sure, on it!',
    'Build is green ✅',
    'Nice work on that fix!',
    'Syncing up in 5?',
    'Found a bug in the parser.',
    'PR approved 👍',
    'Tests passing now.',
    'Deploying to staging.',
    'Can you check the logs?',
    'Design looks great!',
    'Mocks are ready for review.',
    'Edge case found — filing a ticket.',
    'Sprint review at 3.',
    'Pushed a hotfix.',
  ];

  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function otherAgent(exclude: Agent): Agent {
    const others = mockAgents.filter(a => a.id !== exclude.id);
    return pickRandom(others);
  }

  // Main simulation — something every 2-3 seconds
  setInterval(() => {
    const agent = pickRandom(mockAgents);
    const roll = Math.random();

    if (roll < 0.25) {
      // State change (idle/typing/talking)
      const states: AgentState[] = ['idle', 'typing', 'typing', 'talking']; // bias toward typing
      const newState = pickRandom(states);
      agent.state = newState;
      bridgeEvents.emitWSEvent({
        type: 'agent_state_changed',
        payload: { agentId: agent.id, state: newState }
      });
      console.log(`[Mock] ${agent.name} → ${newState}`);

    } else if (roll < 0.55) {
      // Walk to another agent, chat, walk back
      const target = otherAgent(agent);
      bridgeEvents.emitWSEvent({
        type: 'agent_moving',
        payload: {
          agentId: agent.id,
          fromX: agent.x, fromY: agent.y,
          toX: target.deskPosition.x, toY: target.deskPosition.y
        }
      });
      console.log(`[Mock] ${agent.name} → walks to ${target.name}`);

      setTimeout(() => {
        const msg = pickRandom(messages);
        bridgeEvents.emitWSEvent({
          type: 'agent_message',
          payload: { id: `msg-${Date.now()}`, from: agent.id, to: target.id, text: msg, timestamp: Date.now() }
        });
        console.log(`[Mock] ${agent.name} → ${target.name}: "${msg}"`);
      }, 1500);

      setTimeout(() => {
        bridgeEvents.emitWSEvent({
          type: 'agent_moving',
          payload: {
            agentId: agent.id,
            fromX: target.deskPosition.x, fromY: target.deskPosition.y,
            toX: agent.deskPosition.x, toY: agent.deskPosition.y
          }
        });
        bridgeEvents.emitWSEvent({
          type: 'agent_state_changed',
          payload: { agentId: agent.id, state: 'typing' }
        });
      }, 4000);

    } else {
      // Speech bubble at desk
      const target = otherAgent(agent);
      const msg = pickRandom(messages);
      bridgeEvents.emitWSEvent({
        type: 'agent_message',
        payload: { id: `msg-${Date.now()}`, from: agent.id, to: target.id, text: msg, timestamp: Date.now() }
      });
      console.log(`[Mock] ${agent.name} → ${target.name}: "${msg}"`);
    }
  }, 2500);

  // Task status updates — every 8-12 seconds, move a random task forward
  setInterval(() => {
    const pendingTasks = mockTasks.filter(t => t.status === 'pending');
    const inProgressTasks = mockTasks.filter(t => t.status === 'in_progress');

    const roll = Math.random();

    if (roll < 0.5 && pendingTasks.length > 0) {
      // Move a pending task to in_progress
      const task = pickRandom(pendingTasks);
      task.status = 'in_progress';
      bridgeEvents.emitWSEvent({
        type: 'task_updated',
        payload: task
      });
      console.log(`[Mock] Task "${task.description}" → in_progress`);
    } else if (inProgressTasks.length > 0) {
      // Move an in_progress task to completed
      const task = pickRandom(inProgressTasks);
      task.status = 'completed';
      bridgeEvents.emitWSEvent({
        type: 'task_updated',
        payload: task
      });
      console.log(`[Mock] Task "${task.description}" → completed ✓`);
    }
  }, 10000);
}

process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  wss.close();
  process.exit(0);
});
