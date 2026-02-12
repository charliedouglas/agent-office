import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  createAgentFile,
  removeAgentFile,
  updateAgentFile,
  listAgents,
  getAgent
} from './openclaw-hook.js';
import type { Agent } from '../../../shared/types.js';

/**
 * Parse JSON body from request
 */
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJSON(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res: ServerResponse, statusCode: number, message: string) {
  sendJSON(res, statusCode, { error: message });
}

/**
 * Handle API routes
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const method = req.method || 'GET';
  const pathname = url.pathname;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // GET /api/agents - List all agents
    if (pathname === '/api/agents' && method === 'GET') {
      const agents = await listAgents();
      sendJSON(res, 200, { agents });
      return;
    }

    // POST /api/agents - Create new agent
    if (pathname === '/api/agents' && method === 'POST') {
      const body = await parseBody(req);
      const { name, team, task } = body;

      if (!name) {
        sendError(res, 400, 'Missing required field: name');
        return;
      }

      const agent = await createAgentFile(name, team, task);
      sendJSON(res, 201, { agent });
      return;
    }

    // GET /api/agents/:name - Get single agent
    if (pathname.startsWith('/api/agents/') && method === 'GET') {
      const name = decodeURIComponent(pathname.split('/')[3]);
      const agent = await getAgent(name);

      if (!agent) {
        sendError(res, 404, 'Agent not found');
        return;
      }

      sendJSON(res, 200, { agent });
      return;
    }

    // PATCH /api/agents/:name - Update agent
    if (pathname.startsWith('/api/agents/') && method === 'PATCH') {
      const name = decodeURIComponent(pathname.split('/')[3]);
      const body = await parseBody(req);

      const agent = await updateAgentFile(name, body);
      sendJSON(res, 200, { agent });
      return;
    }

    // DELETE /api/agents/:name - Remove agent
    if (pathname.startsWith('/api/agents/') && method === 'DELETE') {
      const name = decodeURIComponent(pathname.split('/')[3]);
      await removeAgentFile(name);
      sendJSON(res, 204, null);
      return;
    }

    // GET /api/health - Health check
    if (pathname === '/api/health' && method === 'GET') {
      sendJSON(res, 200, { status: 'ok', service: 'agent-office-bridge' });
      return;
    }

    // Route not found
    sendError(res, 404, 'Not found');
  } catch (error) {
    console.error('[API] Error handling request:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Internal server error');
  }
}

/**
 * Start HTTP API server
 * @param port - Port to listen on (default 3002)
 * @returns The HTTP server instance
 */
export function startAPIServer(port: number = 3002): http.Server {
  const server = http.createServer(handleRequest);

  server.listen(port, '0.0.0.0', () => {
    console.log(`[API Server] Running on http://0.0.0.0:${port}`);
    console.log(`[API Server] Endpoints:`);
    console.log(`  GET    /api/agents       - List all agents`);
    console.log(`  POST   /api/agents       - Create agent (body: {name, team?, task?})`);
    console.log(`  GET    /api/agents/:name - Get agent`);
    console.log(`  PATCH  /api/agents/:name - Update agent`);
    console.log(`  DELETE /api/agents/:name - Remove agent`);
    console.log(`  GET    /api/health       - Health check`);
  });

  return server;
}
