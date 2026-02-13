import chokidar from 'chokidar';
import path from 'path';
import { bridgeEvents } from './events.js';
import { parseAgentFile, AgentFileData } from './parser.js';
import { detectCollaborations } from './collaboration.js';
import type { Agent, Task } from '../../../shared/types.js';

// Track all current agents by ID
const agentState = new Map<string, Agent>();
const agentFileData = new Map<string, AgentFileData>();

// Track tasks extracted from agent plans
const taskState = new Map<string, Task>();

export function startWatcher(agentDir: string) {
  const pattern = path.join(agentDir, '*.json');

  const watcher = chokidar.watch(pattern, {
    persistent: true,
    ignoreInitial: false,
    depth: 0
  });

  let isInitialized = false;
  let initTimer: NodeJS.Timeout | null = null;

  // Debounce init emission - wait for all initial files to load
  const scheduleInit = () => {
    if (initTimer) clearTimeout(initTimer);
    initTimer = setTimeout(() => {
      emitInitState();
      isInitialized = true;
    }, 100);
  };

  watcher
    .on('add', (filePath) => {
      if (!filePath.endsWith('.json')) return;

      console.log(`[Watcher] File added: ${path.basename(filePath)}`);
      const data = parseAgentFile(filePath);

      if (data) {
        handleAgentUpdate(data, true);

        if (!isInitialized) {
          scheduleInit();
        } else {
          emitInitState(); // Re-emit with new agent
        }
      }
    })
    .on('change', (filePath) => {
      if (!filePath.endsWith('.json')) return;

      console.log(`[Watcher] File changed: ${path.basename(filePath)}`);
      const data = parseAgentFile(filePath);

      if (data) {
        handleAgentUpdate(data, false);
      }
    })
    .on('unlink', (filePath) => {
      if (!filePath.endsWith('.json')) return;

      console.log(`[Watcher] File removed: ${path.basename(filePath)}`);
      const agentId = path.basename(filePath, '.json');

      // Remove agent and their tasks
      agentState.delete(agentId);
      agentFileData.delete(agentId);

      // Remove tasks assigned to this agent
      for (const [taskId, task] of taskState.entries()) {
        if (task.assignedTo === agentId) {
          taskState.delete(taskId);
        }
      }

      // Re-emit init to update clients
      emitInitState();
    })
    .on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });

  return watcher;
}

function handleAgentUpdate(newData: AgentFileData, isNew: boolean) {
  const prevData = agentFileData.get(newData.id);
  agentFileData.set(newData.id, newData);

  // Get or create agent
  let agent = agentState.get(newData.id);

  if (!agent || isNew) {
    // New agent - compute desk position
    agent = createAgentFromData(newData);
    agentState.set(newData.id, agent);
    console.log(`[Watcher] New agent: ${newData.name} (${newData.team}) at desk (${agent.deskPosition.x}, ${agent.deskPosition.y})`);
  } else {
    // Existing agent - check for state changes
    const oldState = agent.state;
    agent.state = newData.state;

    // Update current position if not moving
    if (agent.state !== 'walking') {
      agent.x = agent.deskPosition.x;
      agent.y = agent.deskPosition.y;
    }

    // Emit state change if different
    if (oldState !== newData.state) {
      bridgeEvents.emitWSEvent({
        type: 'agent_state_changed',
        payload: { agentId: agent.id, state: newData.state }
      });
      console.log(`[Watcher] ${agent.name} → ${newData.state}`);
    }
  }

  // Handle movement - if two agents are editing the same file, they should meet
  if (prevData && prevData.currentFile !== newData.currentFile && newData.currentFile) {
    // Find other agents working on the same file
    for (const [otherId, otherData] of agentFileData.entries()) {
      if (otherId !== newData.id && otherData.currentFile === newData.currentFile) {
        const otherAgent = agentState.get(otherId);
        if (otherAgent) {
          // This agent moves to the other agent's desk
          bridgeEvents.emitWSEvent({
            type: 'agent_moving',
            payload: {
              agentId: agent.id,
              fromX: agent.x,
              fromY: agent.y,
              toX: otherAgent.deskPosition.x,
              toY: otherAgent.deskPosition.y
            }
          });
          console.log(`[Watcher] ${agent.name} → walks to ${otherAgent.name} (same file: ${newData.currentFile})`);

          // Update current position
          agent.x = otherAgent.deskPosition.x;
          agent.y = otherAgent.deskPosition.y;
          agent.state = 'walking';

          break; // Only walk to first matching agent
        }
      }
    }
  }

  // Handle plan/task updates
  if (newData.plan) {
    handlePlanUpdate(newData);
  }

  // Run collaboration detection after any agent update
  const allAgents = Array.from(agentState.values());
  detectCollaborations(allAgents);
}

function createAgentFromData(data: AgentFileData): Agent {
  const deskPos = computeDeskPosition(data.team, data.id);

  return {
    id: data.id,
    name: data.name,
    role: data.task || 'Agent', // Use task as role if available
    team: data.team,
    state: data.state,
    x: deskPos.x,
    y: deskPos.y,
    deskPosition: deskPos,
    currentFile: data.currentFile
  };
}

function computeDeskPosition(team: string, agentId: string): { x: number; y: number } {
  // Team-based clustering similar to mock mode
  // Use deterministic positioning based on team and agent count

  const teamAgents = Array.from(agentState.values()).filter(a => a.team === team);
  const teamIndex = teamAgents.length;

  // Define team zones (matching mock mode layout)
  const teamZones: Record<string, { baseX: number; baseY: number; cols: number }> = {
    engineering: { baseX: 2, baseY: 3, cols: 2 },
    frontend: { baseX: 2, baseY: 3, cols: 2 },
    backend: { baseX: 10, baseY: 5, cols: 2 },
    design: { baseX: 15, baseY: 3, cols: 2 },
    devops: { baseX: 15, baseY: 8, cols: 2 },
    qa: { baseX: 10, baseY: 8, cols: 2 },
    management: { baseX: 2, baseY: 11, cols: 1 },
    default: { baseX: 6, baseY: 8, cols: 2 }
  };

  const zone = teamZones[team.toLowerCase()] || teamZones.default;
  const col = teamIndex % zone.cols;
  const row = Math.floor(teamIndex / zone.cols);

  return {
    x: zone.baseX + col * 2,
    y: zone.baseY + row * 2
  };
}

function handlePlanUpdate(data: AgentFileData) {
  if (!data.plan) return;

  // Convert plan items to tasks
  data.plan.forEach((item, index) => {
    const taskId = `${data.id}-plan-${index}`;
    const prevTask = taskState.get(taskId);

    const task: Task = {
      id: taskId,
      description: item.text,
      assignedTo: data.id,
      status: item.status as 'pending' | 'in_progress' | 'completed'
    };

    // Only emit if status changed or new task
    if (!prevTask || prevTask.status !== task.status) {
      taskState.set(taskId, task);
      bridgeEvents.emitWSEvent({
        type: 'task_updated',
        payload: task
      });

      if (prevTask) {
        console.log(`[Watcher] Task "${item.text}" → ${task.status}`);
      }
    }
  });
}

function emitInitState() {
  const agents = Array.from(agentState.values());
  const tasks = Array.from(taskState.values());

  bridgeEvents.emitWSEvent({
    type: 'init',
    payload: { agents, tasks }
  });

  console.log(`[Watcher] Emitted init state: ${agents.length} agents, ${tasks.length} tasks`);
}
