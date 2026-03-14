import { Telegraf } from 'telegraf';
import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { BaseChannel } from './ChannelManager.js';

export class TelegramChannel implements BaseChannel {
  private bot?: Telegraf;
  private status: 'connected' | 'not_connected' | 'error' = 'not_connected';

  async start() {
    const db = getDb();
    const channelData = db.prepare('SELECT * FROM channels WHERE type = "telegram"').get() as any;
    if (!channelData || !channelData.enabled) return;

    const config = JSON.parse(channelData.config_json || '{}');
    const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      this.status = 'error';
      console.error('[Telegram] No token found');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.on('message', async (ctx: any) => {
      try {
        const text = (ctx.message as any).text;
        if (!text) return;

        const userId = ctx.from!.id.toString();
        const allowList = config.allowList || [];
        if (allowList.length > 0 && !allowList.includes(userId)) {
          return ctx.reply('Unauthorized.');
        }

        const agentId = channelData.agent_id;
        if (!agentId) return ctx.reply('No agent configured for this channel.');

        const engine = new AgentEngine(agentId);
        const sessionId = `telegram-${ctx.chat.id}`;
        
        await ctx.sendChatAction('typing');
        const stream = engine.streamChat(text, sessionId);

        let fullText = '';
        let lastMsg = await ctx.reply('...');
        let lastUpdate = Date.now();

        for await (const chunk of stream as AsyncGenerator<{ type: string; token: string }>) {
          if (chunk.type === 'token') {
            fullText += chunk.token;
            // Throttle Telegram updates to avoid rate limits
            if (Date.now() - lastUpdate > 1000) {
              await ctx.telegram.editMessageText(ctx.chat.id, lastMsg.message_id, undefined, fullText);
              lastUpdate = Date.now();
            }
          }
        }
        
        await ctx.telegram.editMessageText(ctx.chat.id, lastMsg.message_id, undefined, fullText || 'No response from agent.');
      } catch (err) {
        console.error('[Telegram] Error processing message:', err);
      }
    });

    this.bot.launch();
    this.status = 'connected';
    console.log('[Telegram] Bot launched');
  }

  async stop() {
    this.bot?.stop();
    this.status = 'not_connected';
  }

  getStatus() {
    return this.status;
  }
}
