// Shared types for Agent Office

export type AgentState = 'idle' | 'typing' | 'walking' | 'talking';

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
}

export interface Task {
  id: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
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
  | 'init';

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

export interface InitEvent extends WSEvent {
  type: 'init';
  payload: {
    agents: Agent[];
    tasks: Task[];
  };
}

export type WSEventPayload =
  | AgentStateChangedEvent
  | AgentMovingEvent
  | AgentMessageEvent
  | TaskUpdatedEvent
  | InitEvent;
