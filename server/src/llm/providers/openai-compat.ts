import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../types.js';

export function createOpenAIProvider(baseURL?: string) {
  return {
    async call(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
      const client = new OpenAI({ apiKey, baseURL });
      
      const response = await client.chat.completions.create({
        model: req.model,
        messages: req.messages as any,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
      });

      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    },

    async* stream(req: LLMRequest, apiKey: string): AsyncGenerator<string> {
      const client = new OpenAI({ apiKey, baseURL });
      
      const stream = await client.chat.completions.create({
        model: req.model,
        messages: req.messages as any,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) yield delta;
      }
    }
  };
}

export const openai = createOpenAIProvider();
export const groq = createOpenAIProvider('https://api.groq.com/openai/v1');
export const openrouter = createOpenAIProvider('https://openrouter.ai/api/v1');
export const grok = createOpenAIProvider('https://api.x.ai/v1');
export const deepseek = createOpenAIProvider('https://api.deepseek.com/v1');
export const mistral = createOpenAIProvider('https://api.mistral.ai/v1');
