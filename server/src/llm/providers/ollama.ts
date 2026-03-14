import { LLMRequest, LLMResponse } from '../types.js';

interface OllamaResponse {
  message: {
    content: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
}

export async function callOllama(req: LLMRequest, ollamaUrl: string = 'http://localhost:11434'): Promise<LLMResponse> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaResponse;

  return {
    content: data.message.content,
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    }
  };
}

export async function* streamOllama(req: LLMRequest, ollamaUrl: string = 'http://localhost:11434'): AsyncGenerator<string> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: true,
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) yield json.message.content;
      } catch (e) {
        // Handle partial JSON or empty lines
      }
    }
  }
}
