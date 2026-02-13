import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startAPIServer } from '../api.js';
import type { Server } from 'http';
import type { Agent } from '../../../../shared/types.js';

// Mock the openclaw-hook module
vi.mock('../openclaw-hook.js', () => {
  const mockAgents: Agent[] = [];

  return {
    createAgentFile: vi.fn(async (name: string, team: string = 'engineering', task: string = 'Working...') => {
      const agent: Agent = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        role: task,
        team: team.toLowerCase(),
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 }
      };
      mockAgents.push(agent);
      return agent;
    }),
    updateAgentFile: vi.fn(async (name: string, updates: Partial<Agent>) => {
      const index = mockAgents.findIndex(a => a.id === name.toLowerCase().replace(/\s+/g, '-'));
      if (index === -1) throw new Error('Agent not found');
      mockAgents[index] = { ...mockAgents[index], ...updates };
      return mockAgents[index];
    }),
    removeAgentFile: vi.fn(async (name: string) => {
      const index = mockAgents.findIndex(a => a.id === name.toLowerCase().replace(/\s+/g, '-'));
      if (index !== -1) mockAgents.splice(index, 1);
    }),
    listAgents: vi.fn(async () => [...mockAgents]),
    getAgent: vi.fn(async (name: string) => {
      return mockAgents.find(a => a.id === name.toLowerCase().replace(/\s+/g, '-')) || null;
    })
  };
});

describe('API Server', () => {
  let server: Server;
  let port: number;
  let baseURL: string;

  beforeEach(() => {
    // Use a random port to avoid conflicts
    port = 3002 + Math.floor(Math.random() * 1000);
    baseURL = `http://localhost:${port}`;
    server = startAPIServer(port);
  });

  afterEach(async () => {
    // Close server after each test
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /api/health', () => {
    it('should return health check', async () => {
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'ok',
        service: 'agent-office-bridge'
      });
    });
  });

  describe('POST /api/agents', () => {
    it('should create a new agent with all fields', async () => {
      const response = await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TestAgent',
          team: 'engineering',
          task: 'Testing features'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent).toMatchObject({
        id: 'testagent',
        name: 'TestAgent',
        team: 'engineering',
        role: 'Testing features'
      });
    });

    it('should create agent with default team and task if not provided', async () => {
      const response = await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'MinimalAgent'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent).toMatchObject({
        id: 'minimalagent',
        name: 'MinimalAgent',
        team: 'engineering',
        role: 'Working...'
      });
    });

    it('should return 400 if name is missing', async () => {
      const response = await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: 'engineering'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required field: name');
    });

    it('should handle invalid JSON', async () => {
      const response = await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/agents', () => {
    it('should list all agents', async () => {
      // Create a test agent first
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ListTestAgent' })
      });

      const response = await fetch(`${baseURL}/api/agents`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agents).toBeInstanceOf(Array);
      expect(data.agents.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/agents/:name', () => {
    it('should get a specific agent', async () => {
      // Create a test agent first
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'GetTestAgent',
          team: 'qa'
        })
      });

      const response = await fetch(`${baseURL}/api/agents/GetTestAgent`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent).toMatchObject({
        id: 'gettestagent',
        name: 'GetTestAgent',
        team: 'qa'
      });
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await fetch(`${baseURL}/api/agents/NonExistentAgent`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent not found');
    });

    it('should handle URL-encoded agent names', async () => {
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Agent With Spaces' })
      });

      const response = await fetch(`${baseURL}/api/agents/Agent%20With%20Spaces`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent.name).toBe('Agent With Spaces');
    });
  });

  describe('PATCH /api/agents/:name', () => {
    it('should update an agent', async () => {
      // Create a test agent first
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'UpdateTestAgent',
          team: 'engineering'
        })
      });

      const response = await fetch(`${baseURL}/api/agents/UpdateTestAgent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'walking',
          currentFile: 'src/test.ts'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent).toMatchObject({
        name: 'UpdateTestAgent',
        state: 'walking',
        currentFile: 'src/test.ts'
      });
    });

    it('should handle partial updates', async () => {
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PartialUpdateAgent' })
      });

      const response = await fetch(`${baseURL}/api/agents/PartialUpdateAgent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'idle' })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent.state).toBe('idle');
      expect(data.agent.name).toBe('PartialUpdateAgent');
    });
  });

  describe('DELETE /api/agents/:name', () => {
    it('should delete an agent', async () => {
      // Create a test agent first
      await fetch(`${baseURL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DeleteTestAgent' })
      });

      const response = await fetch(`${baseURL}/api/agents/DeleteTestAgent`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await fetch(`${baseURL}/api/agents/DeleteTestAgent`);
      expect(getResponse.status).toBe(404);
    });

    it('should handle deleting non-existent agent gracefully', async () => {
      const response = await fetch(`${baseURL}/api/agents/NonExistent`, {
        method: 'DELETE'
      });

      // Should still return 204 (idempotent)
      expect(response.status).toBe(204);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${baseURL}/api/agents`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should include CORS headers in responses', async () => {
      const response = await fetch(`${baseURL}/api/health`);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${baseURL}/api/unknown`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });
  });
});
