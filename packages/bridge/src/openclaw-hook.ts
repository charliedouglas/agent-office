import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { Agent } from '../../../shared/types.js';

/**
 * Find project root by looking for .agent directory
 */
function findProjectRoot(): string {
  let current = process.cwd();

  // Try current directory first
  if (existsSync(path.join(current, '.agent'))) {
    return current;
  }

  // Try parent directory (for when running from packages/bridge)
  const parent = path.dirname(current);
  if (existsSync(path.join(parent, '.agent'))) {
    return parent;
  }

  // Try grandparent directory (for deeply nested structures)
  const grandparent = path.dirname(parent);
  if (existsSync(path.join(grandparent, '.agent'))) {
    return grandparent;
  }

  // Default to current directory
  return current;
}

const AGENTS_DIR = path.join(findProjectRoot(), '.agent');

/**
 * Ensures the .agent directory exists
 */
async function ensureAgentsDir(): Promise<void> {
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('[OpenClaw Hook] Failed to create .agent directory:', error);
    throw error;
  }
}

/**
 * Get the file path for an agent
 */
function getAgentFilePath(name: string): string {
  // Sanitize name to be filesystem-safe
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
  return path.join(AGENTS_DIR, `${safeName}.json`);
}

/**
 * Auto-assign desk position based on team and existing agents
 */
async function assignDeskPosition(team: string): Promise<{ x: number; y: number }> {
  // Team-based clustering (similar to mock mode layout)
  const teamClusters: Record<string, { startX: number; startY: number; spacing: number }> = {
    engineering: { startX: 3, startY: 3, spacing: 2 },
    design: { startX: 13, startY: 3, spacing: 2 },
    qa: { startX: 13, startY: 10, spacing: 2 },
    management: { startX: 3, startY: 11, spacing: 2 },
    default: { startX: 8, startY: 8, spacing: 2 }
  };

  const cluster = teamClusters[team.toLowerCase()] || teamClusters.default;

  // Count existing agents in this team to offset position
  try {
    const files = await fs.readdir(AGENTS_DIR);
    let teamCount = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(AGENTS_DIR, file), 'utf-8');
        const agent = JSON.parse(content);
        if (agent.team === team) {
          teamCount++;
        }
      }
    }

    // Simple grid layout: alternating x positions, incrementing y every 2 agents
    const col = teamCount % 2;
    const row = Math.floor(teamCount / 2);

    return {
      x: cluster.startX + col * cluster.spacing,
      y: cluster.startY + row * cluster.spacing
    };
  } catch (error) {
    // If reading fails, use default position
    return { x: cluster.startX, y: cluster.startY };
  }
}

/**
 * Create a new agent file in .agent/<name>.json
 * @param name - Agent name (used as ID and filename)
 * @param team - Team name (engineering, design, qa, management, etc.)
 * @param task - Current task description (becomes the role)
 * @returns The created agent object
 */
export async function createAgentFile(
  name: string,
  team: string = 'engineering',
  task: string = 'Working...'
): Promise<Agent> {
  await ensureAgentsDir();

  const deskPosition = await assignDeskPosition(team);

  const agent: Agent = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    role: task,
    team: team.toLowerCase(),
    state: 'typing',
    x: deskPosition.x,
    y: deskPosition.y,
    deskPosition
  };

  const filePath = getAgentFilePath(name);

  try {
    await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
    console.log(`[OpenClaw Hook] Created agent file: ${filePath}`);
    return agent;
  } catch (error) {
    console.error('[OpenClaw Hook] Failed to create agent file:', error);
    throw error;
  }
}

/**
 * Update an existing agent file
 * @param name - Agent name
 * @param updates - Partial agent data to update
 * @returns The updated agent object
 */
export async function updateAgentFile(
  name: string,
  updates: Partial<Agent>
): Promise<Agent> {
  const filePath = getAgentFilePath(name);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const agent = JSON.parse(content) as Agent;

    const updatedAgent = { ...agent, ...updates };

    await fs.writeFile(filePath, JSON.stringify(updatedAgent, null, 2));
    console.log(`[OpenClaw Hook] Updated agent file: ${filePath}`);
    return updatedAgent;
  } catch (error) {
    console.error('[OpenClaw Hook] Failed to update agent file:', error);
    throw error;
  }
}

/**
 * Remove an agent file from .agent/<name>.json
 * @param name - Agent name to remove
 */
export async function removeAgentFile(name: string): Promise<void> {
  const filePath = getAgentFilePath(name);

  try {
    await fs.unlink(filePath);
    console.log(`[OpenClaw Hook] Removed agent file: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[OpenClaw Hook] Failed to remove agent file:', error);
      throw error;
    }
    // File doesn't exist, that's fine
  }
}

/**
 * List all agents from .agent directory
 * @returns Array of all agent objects
 */
export async function listAgents(): Promise<Agent[]> {
  try {
    await ensureAgentsDir();
    const files = await fs.readdir(AGENTS_DIR);
    const agents: Agent[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(AGENTS_DIR, file), 'utf-8');
          const agent = JSON.parse(content) as Agent;
          agents.push(agent);
        } catch (error) {
          console.error(`[OpenClaw Hook] Failed to parse agent file ${file}:`, error);
        }
      }
    }

    return agents;
  } catch (error) {
    console.error('[OpenClaw Hook] Failed to list agents:', error);
    return [];
  }
}

/**
 * Get a single agent by name
 * @param name - Agent name
 * @returns The agent object or null if not found
 */
export async function getAgent(name: string): Promise<Agent | null> {
  const filePath = getAgentFilePath(name);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Agent;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('[OpenClaw Hook] Failed to get agent:', error);
    throw error;
  }
}
