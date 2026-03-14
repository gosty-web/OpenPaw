import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse } from '../types.js';

export async function callAnthropic(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
  const anthropic = new Anthropic({ apiKey });
  
  const systemMessage = req.messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = req.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: m.content
  }));

  const response = await anthropic.messages.create({
    model: req.model,
    system: systemMessage,
    messages: chatMessages,
    max_tokens: req.maxTokens || 4096,
    temperature: req.temperature || 0.7,
  });

  return {
    content: (response.content[0] as any).text || '',
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens
    }
  };
}

export async function* streamAnthropic(req: LLMRequest, apiKey: string): AsyncGenerator<string> {
  const anthropic = new Anthropic({ apiKey });
  
  const systemMessage = req.messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = req.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: m.content
  }));

  const stream = await anthropic.messages.create({
    model: req.model,
    system: systemMessage,
    messages: chatMessages,
    max_tokens: req.maxTokens || 4096,
    temperature: req.temperature || 0.7,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && (event.delta as any).text) {
      yield (event.delta as any).text;
    }
  }
}
