import chokidar from 'chokidar';
import { bridgeEvents } from './events.js';
import { parseTeamState } from './parser.js';
import { detectCollaborations } from './collaboration.js';
import type { Agent } from '../../../shared/types.js';

// Track all agents for collaboration detection in real mode
const agentRegistry: Agent[] = [];

export function startWatcher(teamsDir: string) {
  console.log(`[Watcher] Watching directory: ${teamsDir}`);

  const watcher = chokidar.watch(teamsDir, {
    persistent: true,
    ignoreInitial: false,
    depth: 2
  });

  watcher
    .on('add', (path) => {
      console.log(`[Watcher] File added: ${path}`);
      const state = parseTeamState(path);
      updateAgentRegistry(state.agents);
      detectCollaborations(agentRegistry);
    })
    .on('change', (path) => {
      console.log(`[Watcher] File changed: ${path}`);
      const state = parseTeamState(path);
      updateAgentRegistry(state.agents);
      detectCollaborations(agentRegistry);
    })
    .on('unlink', (path) => {
      console.log(`[Watcher] File removed: ${path}`);
    })
    .on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });

  return watcher;
}

/**
 * Update the agent registry with new agent state from parsed files.
 * Merges or adds agents to maintain a complete view of all agents.
 */
function updateAgentRegistry(newAgents: Agent[]) {
  for (const newAgent of newAgents) {
    const existingIndex = agentRegistry.findIndex(a => a.id === newAgent.id);
    if (existingIndex >= 0) {
      // Update existing agent
      agentRegistry[existingIndex] = newAgent;
    } else {
      // Add new agent
      agentRegistry.push(newAgent);
    }
  }
}
