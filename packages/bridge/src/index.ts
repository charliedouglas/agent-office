import path from 'path';
import os from 'os';
import { startWSServer } from './ws-server.js';
import { startWatcher } from './watcher.js';
import { bridgeEvents } from './events.js';
import type { Agent, AgentState } from '../../../shared/types.js';

const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // Default to true
const WS_PORT = parseInt(process.env.WS_PORT || '3001');

console.log(`
TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q     Agent Office Bridge Server        Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
`);

// Start WebSocket server
const wss = startWSServer(WS_PORT);

if (MOCK_MODE) {
  console.log('[Mock Mode] Starting with fake data\n');
  startMockMode();
} else {
  // Start file watcher
  const teamsDir = path.join(os.homedir(), '.claude', 'teams');
  console.log('[Real Mode] Starting file watcher\n');
  startWatcher(teamsDir);
}

// Mock mode: Generate fake events for testing
function startMockMode() {
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Alice',
      role: 'Frontend Developer',
      state: 'typing',
      x: 2,
      y: 2,
      deskPosition: { x: 2, y: 2 }
    },
    {
      id: 'agent-2',
      name: 'Bob',
      role: 'Backend Developer',
      state: 'idle',
      x: 6,
      y: 2,
      deskPosition: { x: 6, y: 2 }
    },
    {
      id: 'agent-3',
      name: 'Charlie',
      role: 'DevOps Engineer',
      state: 'typing',
      x: 10,
      y: 2,
      deskPosition: { x: 10, y: 2 }
    },
    {
      id: 'agent-4',
      name: 'Diana',
      role: 'QA Engineer',
      state: 'idle',
      x: 14,
      y: 2,
      deskPosition: { x: 14, y: 2 }
    }
  ];

  const mockTasks = [
    {
      id: 'task-1',
      description: 'Build frontend office scene',
      assignedTo: 'agent-1',
      status: 'in_progress' as const
    },
    {
      id: 'task-2',
      description: 'Set up WebSocket bridge',
      assignedTo: 'agent-2',
      status: 'completed' as const
    },
    {
      id: 'task-3',
      description: 'Configure deployment pipeline',
      assignedTo: 'agent-3',
      status: 'pending' as const
    },
    {
      id: 'task-4',
      description: 'Write integration tests',
      assignedTo: 'agent-4',
      status: 'pending' as const
    }
  ];

  // Send initial state
  setTimeout(() => {
    bridgeEvents.emitWSEvent({
      type: 'init',
      payload: {
        agents: mockAgents,
        tasks: mockTasks
      }
    });
    console.log('[Mock Mode] Sent initial state');
  }, 1000);

  // Periodically send random events
  setInterval(() => {
    const randomAgent = mockAgents[Math.floor(Math.random() * mockAgents.length)];
    const states: AgentState[] = ['idle', 'typing', 'walking', 'talking'];
    const newState = states[Math.floor(Math.random() * states.length)];

    randomAgent.state = newState;

    bridgeEvents.emitWSEvent({
      type: 'agent_state_changed',
      payload: {
        agentId: randomAgent.id,
        state: newState
      }
    });

    console.log(`[Mock Mode] ${randomAgent.name} -> ${newState}`);
  }, 5000);

  // Simulate agent movement occasionally
  setInterval(() => {
    const agent1 = mockAgents[0];
    const agent2 = mockAgents[1];

    bridgeEvents.emitWSEvent({
      type: 'agent_moving',
      payload: {
        agentId: agent1.id,
        fromX: agent1.x,
        fromY: agent1.y,
        toX: agent2.x,
        toY: agent2.y
      }
    });

    console.log(`[Mock Mode] ${agent1.name} walking to ${agent2.name}'s desk`);
  }, 15000);

  // Simulate messages
  setInterval(() => {
    const from = mockAgents[Math.floor(Math.random() * mockAgents.length)];
    const to = mockAgents[Math.floor(Math.random() * mockAgents.length)];

    if (from.id !== to.id) {
      const messages = [
        'Hey, can you help me with this?',
        'Sure, I\'ll take a look!',
        'The build is passing now.',
        'Great work on that feature!',
        'Let\'s sync up later.'
      ];

      bridgeEvents.emitWSEvent({
        type: 'agent_message',
        payload: {
          id: `msg-${Date.now()}`,
          from: from.id,
          to: to.id,
          text: messages[Math.floor(Math.random() * messages.length)],
          timestamp: Date.now()
        }
      });

      console.log(`[Mock Mode] ${from.name} -> ${to.name}: message sent`);
    }
  }, 10000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  wss.close();
  process.exit(0);
});
