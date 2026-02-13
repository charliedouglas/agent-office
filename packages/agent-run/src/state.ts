import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentFileData } from './types.js';

export async function ensureAgentDir(projectRoot: string): Promise<string> {
  const agentDir = path.join(projectRoot, '.agent');
  await fs.mkdir(agentDir, { recursive: true });
  return agentDir;
}

export async function createInitialState(
  agentDir: string,
  name: string,
  team: string,
  task: string
): Promise<AgentFileData> {
  const state: AgentFileData = {
    id: randomUUID(),
    name,
    team,
    task,
    state: 'idle',
    plan: [],
    updatedAt: new Date().toISOString(),
  };

  const statePath = path.join(agentDir, `${name}.json`);
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));

  return state;
}

export async function updateState(
  agentDir: string,
  name: string,
  updates: Partial<AgentFileData>
): Promise<void> {
  const statePath = path.join(agentDir, `${name}.json`);

  let state: AgentFileData;
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    state = JSON.parse(content);
  } catch {
    // If file doesn't exist, we can't update it
    return;
  }

  const updatedState: AgentFileData = {
    ...state,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(statePath, JSON.stringify(updatedState, null, 2));
}

export function getInjectedInstructions(agentDir: string, name: string): string {
  const statePath = path.join(agentDir, `${name}.json`);

  return `
IMPORTANT AGENT INSTRUCTIONS:
You are agent "${name}". As you work on your task, you MUST maintain your plan and current state by updating the file: ${statePath}

After each significant step or action, update this JSON file with your current progress. The file should have this structure:
{
  "id": "your-id",
  "name": "${name}",
  "team": "your-team",
  "task": "your-task",
  "state": "typing" | "idle",
  "plan": [
    {"text": "Step description", "status": "pending"},
    {"text": "Another step", "status": "in_progress"},
    {"text": "Completed step", "status": "completed"}
  ],
  "currentFile": "path/to/file/you/are/working/on",
  "updatedAt": "ISO timestamp"
}

Guidelines:
- Set state to "typing" when actively working, "idle" when waiting or done
- Keep your plan updated with all major steps
- Mark steps as "pending", "in_progress", or "completed" as you progress
- Update currentFile to the file you're currently editing
- Update the file after each completed step, not just at the end

This allows the office visualization to show your progress in real-time.
`;
}
