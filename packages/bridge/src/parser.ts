import type { Agent, Task } from '../../../shared/types.js';

export interface TeamState {
  agents: Agent[];
  tasks: Task[];
}

export function parseTeamState(filePath: string): TeamState {
  // TODO: In future phases, this will parse actual .claude/teams/ files
  // For now, return empty state (mock mode will override)
  return {
    agents: [],
    tasks: []
  };
}
