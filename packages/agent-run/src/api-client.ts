/**
 * API client for Agent Office REST API
 * Provides functions to register, update, and unregister agents
 */

const API_URL = process.env.AGENT_OFFICE_API_URL || 'http://localhost:3002';

interface AgentUpdate {
  state?: 'idle' | 'typing' | 'talking';
  currentFile?: string;
  plan?: Array<{
    text: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}

/**
 * Register a new agent with the API
 */
export async function registerAgent(
  name: string,
  team: string,
  task: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, team, task }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to register agent: ${response.status} ${errorText}`);
  }
}

/**
 * Update an agent's state via the API
 */
export async function updateAgentAPI(
  name: string,
  updates: AgentUpdate
): Promise<void> {
  const response = await fetch(`${API_URL}/api/agents/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update agent: ${response.status} ${errorText}`);
  }
}

/**
 * Unregister an agent from the API
 */
export async function unregisterAgent(name: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/agents/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    // Ignore 404 errors (agent already removed)
    const errorText = await response.text();
    throw new Error(`Failed to unregister agent: ${response.status} ${errorText}`);
  }
}
