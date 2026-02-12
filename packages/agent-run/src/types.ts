export interface PlanStep {
  text: string;
  status: 'todo' | 'in_progress' | 'done';
}

export interface AgentState {
  id: string;
  name: string;
  team: string;
  task: string;
  state: 'typing' | 'idle';
  plan: PlanStep[];
  currentFile?: string;
  updatedAt: string;
}
