import chokidar from 'chokidar';
import fs from 'fs/promises';
import { bridgeEvents } from './events.js';
import { parseTeamState } from './parser.js';
import type { Agent } from '../../../shared/types.js';

export function startWatcher(teamsDir: string, agentsDir?: string) {
  const dirs = [teamsDir];
  if (agentsDir) {
    dirs.push(agentsDir);
  }

  console.log(`[Watcher] Watching directories: ${dirs.join(', ')}`);

  const watcher = chokidar.watch(dirs, {
    persistent: true,
    ignoreInitial: false,
    depth: 2
  });

  watcher
    .on('add', async (path) => {
      console.log(`[Watcher] File added: ${path}`);

      // Handle .agent/*.json files (OpenClaw agents)
      if (path.includes('.agent') && path.endsWith('.json')) {
        await handleAgentFile(path, 'add');
      } else {
        const state = parseTeamState(path);
        // Emit state changes through event emitter
      }
    })
    .on('change', async (path) => {
      console.log(`[Watcher] File changed: ${path}`);

      // Handle .agent/*.json files (OpenClaw agents)
      if (path.includes('.agent') && path.endsWith('.json')) {
        await handleAgentFile(path, 'change');
      } else {
        const state = parseTeamState(path);
        // Emit state changes through event emitter
      }
    })
    .on('unlink', (path) => {
      console.log(`[Watcher] File removed: ${path}`);

      // Handle .agent/*.json files (OpenClaw agents)
      if (path.includes('.agent') && path.endsWith('.json')) {
        handleAgentFileRemoved(path);
      }
    })
    .on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });

  return watcher;
}

/**
 * Handle agent file add/change events
 */
async function handleAgentFile(filePath: string, event: 'add' | 'change') {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const agent = JSON.parse(content) as Agent;

    if (event === 'add') {
      // New agent - emit as part of init or as agent added event
      bridgeEvents.emitWSEvent({
        type: 'agent_state_changed',
        payload: { agentId: agent.id, state: agent.state }
      });
      console.log(`[Watcher] Agent added: ${agent.name} (${agent.team})`);
    } else {
      // Agent updated
      bridgeEvents.emitWSEvent({
        type: 'agent_state_changed',
        payload: { agentId: agent.id, state: agent.state }
      });
      console.log(`[Watcher] Agent updated: ${agent.name}`);
    }
  } catch (error) {
    console.error(`[Watcher] Failed to parse agent file ${filePath}:`, error);
  }
}

/**
 * Handle agent file removal
 */
function handleAgentFileRemoved(filePath: string) {
  // Extract agent name from file path
  const fileName = filePath.split('/').pop() || '';
  const agentId = fileName.replace('.json', '');
  console.log(`[Watcher] Agent removed: ${agentId}`);
  // TODO: Emit agent_removed event
}
