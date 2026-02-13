// Shared types for Agent Office

export type AgentState = 'idle' | 'typing' | 'walking' | 'talking';

export interface PlanItem {
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  state: AgentState;
  x: number;
  y: number;
  deskPosition: { x: number; y: number };
  currentFile?: string; // File the agent is currently working on
  plan?: PlanItem[];
  currentTask?: string; // Current task description
  spawnTime?: number; // Timestamp when agent was created
}

export interface Task {
  id: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  agentId?: string;
  agentName?: string;
  team?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

// WebSocket event types
export type WSEventType =
  | 'agent_state_changed'
  | 'agent_moving'
  | 'agent_message'
  | 'user_message'
  | 'task_updated'
  | 'agent_removed'
  | 'init'
  | 'file_conflict'
  | 'file_conflict_resolved';

export interface WSEvent {
  type: WSEventType;
  payload: any;
}

export interface AgentStateChangedEvent extends WSEvent {
  type: 'agent_state_changed';
  payload: {
    agentId: string;
    state: AgentState;
  };
}

export interface AgentMovingEvent extends WSEvent {
  type: 'agent_moving';
  payload: {
    agentId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  };
}

export interface AgentMessageEvent extends WSEvent {
  type: 'agent_message';
  payload: Message;
}

export interface TaskUpdatedEvent extends WSEvent {
  type: 'task_updated';
  payload: Task;
}

export interface AgentRemovedEvent extends WSEvent {
  type: 'agent_removed';
  payload: {
    agentId: string;
  };
}

export interface InitEvent extends WSEvent {
  type: 'init';
  payload: {
    agents: Agent[];
    tasks: Task[];
  };
}

export interface FileConflictEvent extends WSEvent {
  type: 'file_conflict';
  payload: {
    file: string;
    agentIds: string[];
  };
}

export interface FileConflictResolvedEvent extends WSEvent {
  type: 'file_conflict_resolved';
  payload: {
    file: string;
    agentIds: string[];
  };
}

export type WSEventPayload =
  | AgentStateChangedEvent
  | AgentMovingEvent
  | AgentMessageEvent
  | TaskUpdatedEvent
  | AgentRemovedEvent
  | InitEvent
  | FileConflictEvent
  | FileConflictResolvedEvent;
