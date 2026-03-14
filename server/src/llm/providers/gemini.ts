import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMRequest, LLMResponse } from '../types.js';

export async function callGemini(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: req.model });

  const systemMessage = req.messages.find(m => m.role === 'system')?.content || '';
  const history = req.messages.filter(m => m.role !== 'system').slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const lastMessage = req.messages[req.messages.length - 1].content;

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: req.temperature,
      maxOutputTokens: req.maxTokens,
    },
  });

  const result = await chat.sendMessage(lastMessage);
  const response = await result.response;

  return {
    content: response.text(),
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0
    }
  };
}

export async function* streamGemini(req: LLMRequest, apiKey: string): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: req.model });

  const history = req.messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const lastMessage = req.messages[req.messages.length - 1].content;

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
