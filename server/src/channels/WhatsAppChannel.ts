import * as wppconnect from '@wppconnect-team/wppconnect';
import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { BaseChannel } from './ChannelManager.js';

export class WhatsAppChannel implements BaseChannel {
  private client?: wppconnect.Whatsapp;
  private status: 'connected' | 'not_connected' | 'error' = 'not_connected';

  async start() {
    const db = getDb();
    const channelData = db.prepare('SELECT * FROM channels WHERE type = "whatsapp"').get() as any;
    if (!channelData || !channelData.enabled) return;

    try {
      this.client = await wppconnect.create({
        session: 'openpaw-session',
        catchQR: (base64Qr: string, asciiQR: string, attempts: number, urlCode?: string) => {
          // Store QR in DB for the API to serve
          db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = "whatsapp_qr"')
            .run(base64Qr, new Date().toISOString());
        },
        statusFind: (statusSession: string, session: string) => {
          this.status = statusSession === 'isLogged' ? 'connected' : 'not_connected';
          console.log('[WhatsApp] Status:', statusSession);
        },
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false,
        browserArgs: ['--no-sandbox']
      });

      const agentId = channelData.agent_id;

      this.client.onMessage(async (message: any) => {
        if (message.isGroupMsg) return; // For now, only DMs
        if (!agentId) return;

        const engine = new AgentEngine(agentId);
        const sessionId = `whatsapp-${message.from}`;

        try {
          const result = await engine.chat(message.body, sessionId);
          await this.client?.sendText(message.from, result.response);
        } catch (err) {
          console.error('[WhatsApp] Error processing message:', err);
        }
      });

      this.status = 'connected';
    } catch (err) {
      this.status = 'error';
      console.error('[WhatsApp] Failed to start:', err);
    }
  }

  async stop() {
    await this.client?.close();
    this.status = 'not_connected';
  }

  getStatus() {
    return this.status;
  }
}
