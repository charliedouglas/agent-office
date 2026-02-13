import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectCollaborations, clearCollaborations } from '../collaboration.js';
import { bridgeEvents } from '../events.js';
import type { Agent } from '../../../../shared/types.js';

describe('collaboration', () => {
  beforeEach(() => {
    // Clear collaboration state before each test
    clearCollaborations();
    // Clear all event listeners
    bridgeEvents.removeAllListeners();
  });

  describe('detectCollaborations', () => {
    it('should detect collaboration when two agents work on the same file', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      detectCollaborations([agent1, agent2]);

      // Should emit agent_moving event immediately
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_moving',
          payload: expect.objectContaining({
            agentId: 'agent-1',
            fromX: 3,
            fromY: 3,
            toX: 5,
            toY: 3
          })
        })
      );
    });

    it('should not detect collaboration when agents work on different files', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/other.ts'
      };

      detectCollaborations([agent1, agent2]);

      // Should not emit any events
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should handle three agents on the same file', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent3: Agent = {
        id: 'agent-3',
        name: 'Charlie',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 7,
        y: 3,
        deskPosition: { x: 7, y: 3 },
        currentFile: 'src/index.ts'
      };

      detectCollaborations([agent1, agent2, agent3]);

      // Should emit 3 agent_moving events (one for each pair: 1-2, 1-3, 2-3)
      const movingEvents = emitSpy.mock.calls.filter(
        call => call[0].type === 'agent_moving'
      );
      expect(movingEvents).toHaveLength(3);
    });

    it('should not trigger duplicate events for ongoing collaborations', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      // First detection - should emit events
      detectCollaborations([agent1, agent2]);
      const firstCallCount = emitSpy.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second detection with same state - should not emit new events
      detectCollaborations([agent1, agent2]);
      expect(emitSpy.mock.calls.length).toBe(firstCallCount);
    });

    it('should detect when collaboration ends', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      // Start collaboration
      detectCollaborations([agent1, agent2]);
      emitSpy.mockClear();

      // Agent 2 switches files
      agent2.currentFile = 'src/other.ts';
      detectCollaborations([agent1, agent2]);

      // Should emit agent_moving event for agent1 returning to their desk
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_moving',
          payload: expect.objectContaining({
            agentId: 'agent-1',
            toX: 3,
            toY: 3
          })
        })
      );
    });

    it('should handle agents with no current file', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'idle',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 }
        // No currentFile
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      detectCollaborations([agent1, agent2]);

      // Should not emit any events
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should generate order-independent collaboration keys', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      // First detection with [agent1, agent2]
      detectCollaborations([agent1, agent2]);
      const firstCallCount = emitSpy.mock.calls.length;

      // Clear spy but not collaboration state
      emitSpy.mockClear();

      // Second detection with reversed order [agent2, agent1]
      detectCollaborations([agent2, agent1]);

      // Should not emit new events (same collaboration pair)
      expect(emitSpy.mock.calls.length).toBe(0);
    });
  });

  describe('clearCollaborations', () => {
    it('should clear all collaboration state', () => {
      const emitSpy = vi.fn();
      bridgeEvents.on('ws-event', emitSpy);

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 3,
        y: 3,
        deskPosition: { x: 3, y: 3 },
        currentFile: 'src/index.ts'
      };

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        team: 'engineering',
        state: 'typing',
        x: 5,
        y: 3,
        deskPosition: { x: 5, y: 3 },
        currentFile: 'src/index.ts'
      };

      // Start collaboration
      detectCollaborations([agent1, agent2]);
      emitSpy.mockClear();

      // Clear state
      clearCollaborations();

      // Detect again - should trigger new collaboration events
      detectCollaborations([agent1, agent2]);
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
