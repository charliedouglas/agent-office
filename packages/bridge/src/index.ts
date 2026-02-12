import path from 'path';
import os from 'os';
import fs from 'fs';
import { startWSServer } from './ws-server.js';
import { startWatcher } from './watcher.js';
import { startAPIServer } from './api.js';
import { bridgeEvents } from './events.js';
import { detectCollaborations } from './collaboration.js';
import type { Agent, AgentState, Task } from '../../../shared/types.js';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');
const API_PORT = parseInt(process.env.API_PORT || '3002');

console.log(`
┌────────────────────────────────────────┐
│     Agent Office Bridge Server         │
└────────────────────────────────────────┘
`);

const wss = startWSServer(WS_PORT);
const apiServer = startAPIServer(API_PORT);

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
    {
      id: 'eng-1', name: 'Alice', role: 'Senior Engineer', team: 'engineering',
      state: 'typing', x: 3, y: 3, deskPosition: { x: 3, y: 3 },
      currentFile: 'src/OfficeScene.ts',
      plan: [
        { text: 'Review component architecture', status: 'completed' },
        { text: 'Build frontend office scene', status: 'in_progress' },
        { text: 'Add sprite animations', status: 'pending' }
      ]
    },
    {
      id: 'eng-2', name: 'Bob', role: 'Backend Engineer', team: 'engineering',
      state: 'typing', x: 5, y: 3, deskPosition: { x: 5, y: 3 },
      currentFile: 'src/ws-server.ts',
      plan: [
        { text: 'Set up WebSocket bridge', status: 'completed' },
        { text: 'Implement event system', status: 'completed' },
        { text: 'Write API documentation', status: 'pending' }
      ]
    },
    {
      id: 'eng-3', name: 'Charlie', role: 'Frontend Engineer', team: 'engineering',
      state: 'idle', x: 3, y: 5, deskPosition: { x: 3, y: 5 },
      currentFile: 'src/TaskBoard.ts',
      plan: [
        { text: 'Implement task board UI', status: 'pending' },
        { text: 'Add speech bubbles', status: 'pending' }
      ]
    },
    {
      id: 'eng-4', name: 'Dave', role: 'DevOps Engineer', team: 'engineering',
      state: 'typing', x: 5, y: 5, deskPosition: { x: 5, y: 5 },
      currentFile: 'deploy/config.yml',
      plan: [
        { text: 'Review deployment pipeline', status: 'completed' },
        { text: 'Configure deployment pipeline', status: 'in_progress' },
        { text: 'Set up monitoring', status: 'pending' }
      ]
    },

    // Design (2 designers, top-right)
    {
      id: 'des-1', name: 'Eve', role: 'UI Designer', team: 'design',
      state: 'idle', x: 13, y: 3, deskPosition: { x: 13, y: 3 },
      currentFile: 'assets/sprites.png',
      plan: [
        { text: 'Sketch agent sprites', status: 'completed' },
        { text: 'Design agent sprites', status: 'in_progress' },
        { text: 'Create pixel art assets', status: 'pending' }
      ]
    },
    {
      id: 'des-2', name: 'Fiona', role: 'UX Researcher', team: 'design',
      state: 'typing', x: 15, y: 3, deskPosition: { x: 15, y: 3 },
      currentFile: 'docs/research.md',
      plan: [
        { text: 'User research: office layout', status: 'completed' },
        { text: 'Analyze user feedback', status: 'pending' }
      ]
    },

    // QA (2 testers, bottom-right)
    {
      id: 'qa-1', name: 'George', role: 'QA Lead', team: 'qa',
      state: 'typing', x: 13, y: 10, deskPosition: { x: 13, y: 10 },
      currentFile: 'tests/integration.spec.ts',
      plan: [
        { text: 'Write test plan', status: 'completed' },
        { text: 'Write integration tests', status: 'pending' },
        { text: 'Test agent movement', status: 'pending' }
      ]
    },
    {
      id: 'qa-2', name: 'Hannah', role: 'Test Engineer', team: 'qa',
      state: 'idle', x: 15, y: 10, deskPosition: { x: 15, y: 10 },
      currentFile: 'tests/unit.spec.ts',
      plan: [
        { text: 'Set up test environment', status: 'completed' },
        { text: 'Run smoke tests', status: 'in_progress' }
      ]
    },

    // Management (solo, bottom-left, slightly separated)
    {
      id: 'mgr-1', name: 'Marcus', role: 'Engineering Manager', team: 'management',
      state: 'idle', x: 3, y: 11, deskPosition: { x: 3, y: 11 },
      plan: [
        { text: 'Review sprint goals', status: 'completed' },
        { text: 'Plan next iteration', status: 'pending' }
      ]
    },
  ];

  // Generate tasks from all agents' plan items
  function generateTasksFromPlans() {
    const tasks: any[] = [];
    mockAgents.forEach(agent => {
      if (agent.plan) {
        agent.plan.forEach((planItem, index) => {
          tasks.push({
            id: `${agent.id}-plan-${index}`,
            description: planItem.text,
            assignedTo: agent.name,
            status: planItem.status,
            agentId: agent.id,
            agentName: agent.name,
            team: agent.team
          });
        });
      }
    });
    return tasks;
  }

  const mockTasks = generateTasksFromPlans();

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

  // Task status updates — every 8-12 seconds, move a random plan item forward
  setInterval(() => {
    // Find an agent with plan items to update
    const agentsWithPlans = mockAgents.filter(a => a.plan && a.plan.length > 0);
    if (agentsWithPlans.length === 0) return;

    const agent = pickRandom(agentsWithPlans);
    const plan = agent.plan!;

    const roll = Math.random();

    // Find pending or in_progress items
    const pendingItems = plan.filter(p => p.status === 'pending');
    const inProgressItems = plan.filter(p => p.status === 'in_progress');

    if (roll < 0.5 && pendingItems.length > 0) {
      // Move a pending item to in_progress
      const planItem = pickRandom(pendingItems);
      planItem.status = 'in_progress';
      const planIndex = plan.indexOf(planItem);

      const taskPayload = {
        id: `${agent.id}-plan-${planIndex}`,
        description: planItem.text,
        assignedTo: agent.name,
        status: planItem.status,
        agentId: agent.id,
        agentName: agent.name,
        team: agent.team
      };

      bridgeEvents.emitWSEvent({
        type: 'task_updated',
        payload: taskPayload
      });
      console.log(`[Mock] ${agent.name}: "${planItem.text}" → in_progress`);
    } else if (inProgressItems.length > 0) {
      // Move an in_progress item to completed
      const planItem = pickRandom(inProgressItems);
      planItem.status = 'completed';
      const planIndex = plan.indexOf(planItem);

      const taskPayload = {
        id: `${agent.id}-plan-${planIndex}`,
        description: planItem.text,
        assignedTo: agent.name,
        status: planItem.status,
        agentId: agent.id,
        agentName: agent.name,
        team: agent.team
      };

      bridgeEvents.emitWSEvent({
        type: 'task_updated',
        payload: taskPayload
      });
      console.log(`[Mock] ${agent.name}: "${planItem.text}" → completed ✓`);
    }
  }, 10000);

  // Collaboration simulation — every 15 seconds, randomly assign files to trigger collaborations
  const mockFiles = [
    'src/OfficeScene.ts',
    'src/TaskBoard.ts',
    'src/ws-server.ts',
    'src/Agent.ts',
    'tests/integration.spec.ts',
    'deploy/config.yml',
    'assets/sprites.png',
    'docs/research.md'
  ];

  setInterval(() => {
    const engineeringAgents = mockAgents.filter(a => a.team === 'engineering');
    const roll = Math.random();

    if (roll < 0.4 && engineeringAgents.length >= 2) {
      // Make two engineers work on the same file
      const agent1 = pickRandom(engineeringAgents);
      const others = engineeringAgents.filter(a => a.id !== agent1.id);
      const agent2 = pickRandom(others);
      const file = pickRandom(mockFiles);

      agent1.currentFile = file;
      agent2.currentFile = file;

      console.log(`[Mock] ${agent1.name} & ${agent2.name} now working on ${file}`);
      detectCollaborations(mockAgents);

    } else {
      // Agents work on different files (end collaboration)
      const agent = pickRandom(engineeringAgents);
      const newFile = pickRandom(mockFiles);
      agent.currentFile = newFile;

      console.log(`[Mock] ${agent.name} switched to ${newFile}`);
      detectCollaborations(mockAgents);
    }
  }, 15000);
}

process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  wss.close();
  apiServer.close();
  process.exit(0);
});
