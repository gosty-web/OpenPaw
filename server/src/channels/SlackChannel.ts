import pkg, { App as SlackApp } from '@slack/bolt';
const { App } = pkg;
import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { BaseChannel } from './ChannelManager.js';

export class SlackChannel implements BaseChannel {
  private app?: SlackApp;
  private status: 'connected' | 'not_connected' | 'error' = 'not_connected';

  async start() {
    const db = getDb();
    const channelData = db.prepare('SELECT * FROM channels WHERE type = "slack"').get() as any;
    if (!channelData || !channelData.enabled) return;

    const config = JSON.parse(channelData.config_json || '{}');
    const token = config.botToken || process.env.SLACK_BOT_TOKEN;
    const appToken = config.appToken || process.env.SLACK_APP_TOKEN;

    if (!token || !appToken) {
      this.status = 'error';
      console.error('[Slack] No tokens found');
      return;
    }

    this.app = new App({
      token,
      appToken,
      socketMode: true
    });

    const agentId = channelData.agent_id;

    const handleMessage = async ({ message, say }: { message: any; say: any }) => {
      if (!agentId) return;
      const engine = new AgentEngine(agentId);
      const sessionId = `slack-${message.channel}`;
      
      try {
        const result = await engine.chat(message.text, sessionId);
        await say({
          text: result.response,
          thread_ts: message.ts
        });
      } catch (err) {
        console.error('[Slack] Error processing message:', err);
      }
    };

    this.app.event('app_mention', handleMessage);
    this.app.message(handleMessage);

    await this.app.start();
    this.status = 'connected';
    console.log('[Slack] App started in socket mode');
  }

  async stop() {
    await this.app?.stop();
    this.status = 'not_connected';
  }

  getStatus() {
    return this.status;
  }
}
