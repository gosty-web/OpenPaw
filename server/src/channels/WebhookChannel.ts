import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { BaseChannel } from './ChannelManager.js';

export class WebhookChannel implements BaseChannel {
  private status: 'connected' | 'not_connected' | 'error' = 'not_connected';

  async start() {
    this.status = 'connected';
    console.log('[Webhook] Channel ready');
  }

  async stop() {
    this.status = 'not_connected';
  }

  getStatus() {
    return this.status;
  }

  async handleWebhook(agentId: string, payload: any) {
    const { message, user } = payload;
    if (!message || !agentId) throw new Error('Invalid payload');

    const engine = new AgentEngine(agentId);
    const sessionId = `webhook-${user || 'default'}`;
    return await engine.chat(message, sessionId);
  }
}
