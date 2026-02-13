import type { Agent } from '../../../shared/types.js';
import { bridgeEvents } from './events.js';

/**
 * Tracks collaboration state between agents working on the same file.
 * Prevents event spam by only triggering on state transitions.
 */

interface CollaborationPair {
  agent1Id: string;
  agent2Id: string;
  file: string;
}

// Track current collaborations (agents visiting each other)
const activeCollaborations = new Map<string, CollaborationPair>();

// Track current file conflicts (2+ agents on same file)
const activeConflicts = new Map<string, string[]>(); // file -> agentIds

/**
 * Generate a unique key for a collaboration pair (order-independent)
 */
function collaborationKey(agent1Id: string, agent2Id: string): string {
  const [a, b] = [agent1Id, agent2Id].sort();
  return `${a}:${b}`;
}

/**
 * Detect and handle collaboration changes when agent states update.
 * Call this whenever agents' currentFile values change.
 */
export function detectCollaborations(agents: Agent[]) {
  // Build a map of file -> agents working on it
  const fileToAgents = new Map<string, Agent[]>();

  for (const agent of agents) {
    if (agent.currentFile) {
      if (!fileToAgents.has(agent.currentFile)) {
        fileToAgents.set(agent.currentFile, []);
      }
      fileToAgents.get(agent.currentFile)!.push(agent);
    }
  }

  // Check each file with multiple agents
  const currentCollaborations = new Set<string>();

  for (const [file, agentsOnFile] of fileToAgents.entries()) {
    if (agentsOnFile.length < 2) continue;

    // Detect file conflicts (2+ agents on same file)
    const agentIds = agentsOnFile.map(a => a.id);
    if (agentsOnFile.length >= 2) {
      const existingConflict = activeConflicts.get(file);
      const conflictChanged = !existingConflict ||
        existingConflict.length !== agentIds.length ||
        !agentIds.every(id => existingConflict.includes(id));

      if (conflictChanged) {
        // New conflict or changed conflict
        activeConflicts.set(file, agentIds);
        bridgeEvents.emitWSEvent({
          type: 'file_conflict',
          payload: {
            file,
            agentIds
          }
        });
        console.log(`[Conflict] File conflict detected: ${agentsOnFile.map(a => a.name).join(', ')} on ${file}`);
      }
    }

    // For each pair of agents on this file
    for (let i = 0; i < agentsOnFile.length; i++) {
      for (let j = i + 1; j < agentsOnFile.length; j++) {
        const agent1 = agentsOnFile[i];
        const agent2 = agentsOnFile[j];
        const key = collaborationKey(agent1.id, agent2.id);

        currentCollaborations.add(key);

        // If this is a NEW collaboration, trigger events
        if (!activeCollaborations.has(key)) {
          startCollaboration(agent1, agent2, file);
          activeCollaborations.set(key, {
            agent1Id: agent1.id,
            agent2Id: agent2.id,
            file
          });
        }
      }
    }
  }

  // Check for ended collaborations
  for (const [key, collaboration] of activeCollaborations.entries()) {
    if (!currentCollaborations.has(key)) {
      endCollaboration(collaboration, agents);
      activeCollaborations.delete(key);
    }
  }

  // Check for resolved conflicts
  for (const [file, agentIds] of activeConflicts.entries()) {
    const currentAgentsOnFile = fileToAgents.get(file);
    const stillInConflict = currentAgentsOnFile && currentAgentsOnFile.length >= 2;

    if (!stillInConflict) {
      // Conflict resolved
      bridgeEvents.emitWSEvent({
        type: 'file_conflict_resolved',
        payload: {
          file,
          agentIds
        }
      });
      console.log(`[Conflict] File conflict resolved: ${file}`);
      activeConflicts.delete(file);
    }
  }
}

/**
 * Trigger events when two agents start collaborating on a file
 */
function startCollaboration(agent1: Agent, agent2: Agent, file: string) {
  // Agent1 walks to Agent2's desk
  bridgeEvents.emitWSEvent({
    type: 'agent_moving',
    payload: {
      agentId: agent1.id,
      fromX: agent1.deskPosition.x,
      fromY: agent1.deskPosition.y,
      toX: agent2.deskPosition.x,
      toY: agent2.deskPosition.y
    }
  });

  console.log(`[Collaboration] ${agent1.name} walks to ${agent2.name}'s desk`);

  // After a brief delay, show collaboration message
  setTimeout(() => {
    bridgeEvents.emitWSEvent({
      type: 'agent_message',
      payload: {
        id: `collab-${Date.now()}`,
        from: agent1.id,
        to: agent2.id,
        text: `Collaborating on ${file}`,
        timestamp: Date.now()
      }
    });

    console.log(`[Collaboration] ${agent1.name} ↔ ${agent2.name}: "${file}"`);
  }, 1000);
}

/**
 * Trigger events when collaboration ends (agents working on different files)
 */
function endCollaboration(collaboration: CollaborationPair, agents: Agent[]) {
  const agent1 = agents.find(a => a.id === collaboration.agent1Id);
  const agent2 = agents.find(a => a.id === collaboration.agent2Id);

  if (!agent1 || !agent2) return;

  // Agent1 walks back to their own desk
  bridgeEvents.emitWSEvent({
    type: 'agent_moving',
    payload: {
      agentId: agent1.id,
      fromX: agent2.deskPosition.x,
      fromY: agent2.deskPosition.y,
      toX: agent1.deskPosition.x,
      toY: agent1.deskPosition.y
    }
  });

  console.log(`[Collaboration] ${agent1.name} returns to their desk`);

  // Update state back to typing after returning
  setTimeout(() => {
    bridgeEvents.emitWSEvent({
      type: 'agent_state_changed',
      payload: {
        agentId: agent1.id,
        state: 'typing'
      }
    });
  }, 1500);
}

/**
 * Clear all collaboration state (useful for resetting)
 */
export function clearCollaborations() {
  activeCollaborations.clear();
  activeConflicts.clear();
}
