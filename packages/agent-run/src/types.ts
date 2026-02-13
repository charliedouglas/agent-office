// Re-export shared types for convenience
export type { Agent, PlanItem, AgentState } from '../../../shared/types.js';

// File format for .agent/<name>.json
export interface AgentFileData {
  id: string;
  name: string;
  team: string;
  task: string;
  state: 'typing' | 'idle';
  plan: Array<{
    text: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  currentFile?: string;
  updatedAt: string;
}
