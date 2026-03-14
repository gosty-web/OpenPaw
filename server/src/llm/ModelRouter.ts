import { LLMRequest, LLMResponse, Provider, MODELS, ModelInfo } from './types.js';
import { callAnthropic, streamAnthropic } from './providers/anthropic.js';
import { openai, groq, openrouter, grok, deepseek, mistral } from './providers/openai-compat.js';
import { callGemini, streamGemini } from './providers/gemini.js';
import { callOllama, streamOllama } from './providers/ollama.js';
import { getDb } from '../db/index.js';

export class ModelRouter {
  private async getApiKey(provider: Provider): Promise<string> {
    const db = getDb();
    const settingKey = `${provider}_api_key`;
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(settingKey) as { value: string } | undefined;
    
    const key = row?.value || process.env[`${provider.toUpperCase()}_API_KEY`];
    
    if (!key && provider !== 'ollama') {
      throw new Error(`API key missing for ${provider}. Please add it in Settings.`);
    }
    
    return key || '';
  }

  async chat(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = await this.getApiKey(req.provider);

    try {
      switch (req.provider) {
        case 'anthropic': return await callAnthropic(req, apiKey);
        case 'openai': return await openai.call(req, apiKey);
        case 'groq': return await groq.call(req, apiKey);
        case 'gemini': return await callGemini(req, apiKey);
        case 'grok': return await grok.call(req, apiKey);
        case 'deepseek': return await deepseek.call(req, apiKey);
        case 'mistral': return await mistral.call(req, apiKey);
        case 'openrouter': return await openrouter.call(req, apiKey);
        case 'ollama': return await callOllama(req);
        default: throw new Error(`Provider ${req.provider} not supported`);
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async *stream(req: LLMRequest): AsyncGenerator<string> {
    const apiKey = await this.getApiKey(req.provider);

    try {
      switch (req.provider) {
        case 'anthropic': yield* streamAnthropic(req, apiKey); break;
        case 'openai': yield* openai.stream(req, apiKey); break;
        case 'groq': yield* groq.stream(req, apiKey); break;
        case 'gemini': yield* streamGemini(req, apiKey); break;
        case 'grok': yield* grok.stream(req, apiKey); break;
        case 'deepseek': yield* deepseek.stream(req, apiKey); break;
        case 'mistral': yield* mistral.stream(req, apiKey); break;
        case 'openrouter': yield* openrouter.stream(req, apiKey); break;
        case 'ollama': yield* streamOllama(req); break;
        default: throw new Error(`Provider ${req.provider} not supported`);
      }
    } catch (error: any) {
      throw new Error(this.handleError(error).content);
    }
  }

  getModels(provider: Provider): ModelInfo[] {
    return MODELS[provider] || [];
  }

  async testProvider(provider: Provider, apiKey?: string): Promise<{ ok: boolean; error?: string }> {
    const testKey = apiKey || await this.getApiKey(provider);
    const testReq: LLMRequest = {
      provider,
      model: this.getModels(provider)[0]?.id || 'default',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 5
    };

    try {
      await this.chat(testReq);
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  private handleError(error: any): LLMResponse {
    let message = error.message || 'An unknown error occurred';
    
    if (message.includes('401') || message.includes('Unauthorized')) message = 'API key invalid or expired';
    if (message.includes('429')) message = 'Rate limited by provider';
    if (message.includes('404')) message = 'Model not found or provider endpoint down';

    return { content: `Error: ${message}` };
  }
}
