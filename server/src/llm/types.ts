export type Provider = 
  | 'anthropic' 
  | 'openai' 
  | 'groq' 
  | 'gemini' 
  | 'grok' 
  | 'ollama' 
  | 'openrouter' 
  | 'deepseek' 
  | 'glm' 
  | 'mistral';

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface LLMRequest {
  provider: Provider;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type StreamEvent = {
  type: 'content';
  delta: string;
} | {
  type: 'done';
  response: LLMResponse;
} | {
  type: 'error';
  message: string;
};

export const MODELS: Record<Provider, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude Sonnet 3.5', contextWindow: 200000 },
    { id: 'claude-3-opus-20240229', name: 'Claude Opus 3', contextWindow: 200000 },
    { id: 'claude-4-6-sonnet', name: 'Claude Sonnet 4.6 (2026)', contextWindow: 200000 },
    { id: 'claude-4-6-opus', name: 'Claude Opus 4.6 (2026)', contextWindow: 200000 },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'o1-preview', name: 'o1 Preview' },
    { id: 'gpt-5-4-pro', name: 'GPT-5.4 Pro (2026)' },
    { id: 'gpt-5-4', name: 'GPT-5.4 (2026)' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro (2026)' },
    { id: 'gemini-3-1-flash', name: 'Gemini 3.1 Flash (2026)' },
  ],
  grok: [
    { id: 'grok-2', name: 'Grok 2' },
    { id: 'grok-4-20', name: 'Grok 4.20 (2026)' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
    { id: 'deepseek-v4', name: 'DeepSeek V4 (2026)' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
  ],
  glm: [
    { id: 'glm-4', name: 'GLM-4' },
    { id: 'glm-5', name: 'GLM-5 (2026)' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'pixtral-12b', name: 'Pixtral 12B' },
  ],
  ollama: [
    { id: 'llama3.1', name: 'Llama 3.1' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder' },
    { id: 'custom', name: 'Custom (editable)' },
  ],
  openrouter: [
    { id: 'custom', name: 'Any OpenRouter model' },
  ]
};
