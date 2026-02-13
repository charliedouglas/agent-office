import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startWatcher } from '../watcher.js';
import { bridgeEvents } from '../events.js';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import type { FSWatcher } from 'chokidar';

describe('watcher', () => {
  let testDir: string;
  let watcher: FSWatcher;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `agent-office-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Clear all event listeners
    bridgeEvents.removeAllListeners();
  });

  afterEach(async () => {
    // Close watcher
    if (watcher) {
      await watcher.close();
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('startWatcher', () => {
    it('should emit init event when agent files are added', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        watcher = startWatcher(testDir);

        // Wait for watcher to be ready
        await new Promise(r => setTimeout(r, 200));

        // Create an agent file
        const agentFile = path.join(testDir, 'test-agent.json');
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'test-agent',
            name: 'Test Agent',
            team: 'engineering',
            task: 'Testing',
            state: 'typing',
            deskPosition: { x: 3, y: 3 }
          })
        );

        // Wait for file to be processed
        setTimeout(() => {
          try {
            // Should emit init event
            const initEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'init'
            );
            expect(initEvents.length).toBeGreaterThan(0);

            const initPayload = initEvents[initEvents.length - 1][0].payload;
            expect(initPayload.agents).toHaveLength(1);
            expect(initPayload.agents[0]).toMatchObject({
              id: 'test-agent',
              name: 'Test Agent',
              team: 'engineering'
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should emit agent_state_changed when agent state changes', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const agentFile = path.join(testDir, 'state-test-agent.json');

        // Create initial agent file
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'state-test-agent',
            name: 'State Test Agent',
            team: 'qa',
            task: 'Testing state changes',
            state: 'typing',
            deskPosition: { x: 5, y: 5 }
          })
        );

        watcher = startWatcher(testDir);

        // Wait for initial processing
        await new Promise(r => setTimeout(r, 300));

        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        // Update agent state
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'state-test-agent',
            name: 'State Test Agent',
            team: 'qa',
            task: 'Testing state changes',
            state: 'walking',
            deskPosition: { x: 5, y: 5 }
          })
        );

        // Wait for change to be processed
        setTimeout(() => {
          try {
            const stateChangedEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'agent_state_changed'
            );
            expect(stateChangedEvents.length).toBeGreaterThan(0);

            const event = stateChangedEvents[0][0];
            expect(event.payload).toMatchObject({
              agentId: 'state-test-agent',
              state: 'walking'
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should handle agent file removal', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const agentFile = path.join(testDir, 'remove-test-agent.json');

        // Create agent file
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'remove-test-agent',
            name: 'Remove Test Agent',
            team: 'design',
            task: 'Testing removal',
            state: 'idle',
            deskPosition: { x: 7, y: 7 }
          })
        );

        watcher = startWatcher(testDir);

        // Wait for initial processing
        await new Promise(r => setTimeout(r, 300));

        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        // Remove the file
        await fs.unlink(agentFile);

        // Wait for removal to be processed
        setTimeout(() => {
          try {
            // Should emit init event with updated agent list
            const initEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'init'
            );
            expect(initEvents.length).toBeGreaterThan(0);

            const initPayload = initEvents[initEvents.length - 1][0].payload;
            // Agent list should be empty or not contain removed agent
            const hasRemovedAgent = initPayload.agents.some(
              (a: any) => a.id === 'remove-test-agent'
            );
            expect(hasRemovedAgent).toBe(false);

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should handle plan updates and emit task events', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const agentFile = path.join(testDir, 'plan-test-agent.json');

        // Create agent with plan
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'plan-test-agent',
            name: 'Plan Test Agent',
            team: 'engineering',
            task: 'Testing plans',
            state: 'typing',
            deskPosition: { x: 9, y: 9 },
            plan: [
              { text: 'Task 1', status: 'pending' },
              { text: 'Task 2', status: 'pending' }
            ]
          })
        );

        watcher = startWatcher(testDir);

        // Wait for initial processing
        await new Promise(r => setTimeout(r, 300));

        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        // Update plan status
        await fs.writeFile(
          agentFile,
          JSON.stringify({
            id: 'plan-test-agent',
            name: 'Plan Test Agent',
            team: 'engineering',
            task: 'Testing plans',
            state: 'typing',
            deskPosition: { x: 9, y: 9 },
            plan: [
              { text: 'Task 1', status: 'in_progress' },
              { text: 'Task 2', status: 'pending' }
            ]
          })
        );

        // Wait for change to be processed
        setTimeout(() => {
          try {
            const taskEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'task_updated'
            );
            expect(taskEvents.length).toBeGreaterThan(0);

            const taskPayload = taskEvents[0][0].payload;
            expect(taskPayload).toMatchObject({
              description: 'Task 1',
              status: 'in_progress',
              assignedTo: 'plan-test-agent'
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should ignore non-JSON files', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        watcher = startWatcher(testDir);

        // Wait for watcher to be ready
        await new Promise(r => setTimeout(r, 200));

        // Create a non-JSON file
        const nonJsonFile = path.join(testDir, 'not-an-agent.txt');
        await fs.writeFile(nonJsonFile, 'This is not JSON');

        // Wait to see if any events are emitted
        setTimeout(() => {
          try {
            // Should not emit any events for non-JSON files
            expect(emitSpy).not.toHaveBeenCalled();
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const agentFile = path.join(testDir, 'invalid-agent.json');

        // Create invalid JSON file
        await fs.writeFile(agentFile, '{invalid json}');

        watcher = startWatcher(testDir);

        // Wait for processing
        await new Promise(r => setTimeout(r, 300));

        // Should not crash, watcher should still be running
        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        // Create a valid agent file
        const validFile = path.join(testDir, 'valid-agent.json');
        await fs.writeFile(
          validFile,
          JSON.stringify({
            id: 'valid-agent',
            name: 'Valid Agent',
            team: 'qa',
            task: 'Testing',
            state: 'typing',
            deskPosition: { x: 11, y: 11 }
          })
        );

        // Wait for processing
        setTimeout(() => {
          try {
            // Should still process valid files
            const initEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'init'
            );
            expect(initEvents.length).toBeGreaterThan(0);

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });

    it('should detect when agents work on the same file', async () => {
      return new Promise<void>(async (resolve, reject) => {
        const agent1File = path.join(testDir, 'collab-agent-1.json');
        const agent2File = path.join(testDir, 'collab-agent-2.json');

        // Create two agents
        await fs.writeFile(
          agent1File,
          JSON.stringify({
            id: 'collab-agent-1',
            name: 'Collab Agent 1',
            team: 'engineering',
            task: 'Collaborating',
            state: 'typing',
            deskPosition: { x: 3, y: 3 },
            currentFile: 'src/index.ts'
          })
        );

        await fs.writeFile(
          agent2File,
          JSON.stringify({
            id: 'collab-agent-2',
            name: 'Collab Agent 2',
            team: 'engineering',
            task: 'Collaborating',
            state: 'typing',
            deskPosition: { x: 5, y: 3 },
            currentFile: 'src/other.ts'
          })
        );

        watcher = startWatcher(testDir);

        // Wait for initial processing
        await new Promise(r => setTimeout(r, 300));

        const emitSpy = vi.fn();
        bridgeEvents.on('ws-event', emitSpy);

        // Make agent 2 work on the same file as agent 1
        await fs.writeFile(
          agent2File,
          JSON.stringify({
            id: 'collab-agent-2',
            name: 'Collab Agent 2',
            team: 'engineering',
            task: 'Collaborating',
            state: 'typing',
            deskPosition: { x: 5, y: 3 },
            currentFile: 'src/index.ts'
          })
        );

        // Wait for collaboration detection
        setTimeout(() => {
          try {
            const movingEvents = emitSpy.mock.calls.filter(
              call => call[0].type === 'agent_moving'
            );
            expect(movingEvents.length).toBeGreaterThan(0);

            resolve();
          } catch (error) {
            reject(error);
          }
        }, 300);
      });
    });
  });
});
