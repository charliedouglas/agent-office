import fs from 'fs';
import type { AgentState } from '../../../shared/types.js';

export interface AgentFileData {
  id: string;
  name: string;
  team: string;
  task: string;
  state: AgentState;
  plan?: Array<{ text: string; status: string }>;
  currentFile?: string;
  updatedAt?: number;
}

export function parseAgentFile(filePath: string): AgentFileData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Validate required fields
    if (!data.id || !data.name || !data.team) {
      console.error(`[Parser] Invalid agent file: missing required fields in ${filePath}`);
      return null;
    }

    // Map state to valid AgentState
    let state: AgentState = 'idle';
    if (data.state === 'typing' || data.state === 'walking' || data.state === 'talking') {
      state = data.state;
    }

    return {
      id: data.id,
      name: data.name,
      team: data.team,
      task: data.task || '',
      state,
      plan: data.plan || [],
      currentFile: data.currentFile,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error(`[Parser] Error parsing ${filePath}:`, error);
    return null;
  }
}
