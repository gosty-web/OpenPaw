export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

export interface AgentVitality {
  energy: number;
  curiosity: number;
  mood: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  personality: string;
  status: AgentStatus;
  model: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  vitality_json: string;
  soul_md: string;
  user_md: string;
  agents_md: string;
  identity_md: string;
  memory_md: string;
  heartbeat_md: string;
  growth_md: string;
  bonds_md: string;
  hot_memory: string;
  created_at: string;
  updated_at: string;
}

export interface ChatResult {
  response: string;
  message: {
    role: string;
    content: string;
  };
  sessionId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface SessionSummary {
  sessionId: string;
  lastMessage: string;
  updatedAt: string;
}

export interface ProactiveResult {
  message: string;
  channel: 'chat';
}
