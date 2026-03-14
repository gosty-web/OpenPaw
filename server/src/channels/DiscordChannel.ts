import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';
import { getDb } from '../db/index.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { BaseChannel } from './ChannelManager.js';

export class DiscordChannel implements BaseChannel {
  private client?: Client;
  private status: 'connected' | 'not_connected' | 'error' = 'not_connected';

  async start() {
    const db = getDb();
    const channelData = db.prepare('SELECT * FROM channels WHERE type = "discord"').get() as any;
    if (!channelData || !channelData.enabled) return;

    const config = JSON.parse(channelData.config_json || '{}');
    const token = config.botToken || process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      this.status = 'error';
      console.error('[Discord] No token found');
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    this.client.on('messageCreate', async (message: any) => {
      if (message.author.bot) return;

      const isDM = !message.guild;
      const allowList = config.allowList || [];
      
      if (allowList.length > 0 && !allowList.includes(message.author.id)) return;

      const agentId = channelData.agent_id;
      if (!agentId) return;

      const engine = new AgentEngine(agentId);
      const sessionId = `discord-${message.channelId}`;

      try {
        await message.channel.sendTyping();
        const typingInterval = setInterval(() => message.channel.sendTyping(), 8000);
        
        const stream = engine.streamChat(message.content, sessionId);
        let fullText = '';
        let responseMsg = await message.reply('...');
        let lastUpdate = Date.now();

        for await (const chunk of stream as AsyncGenerator<{ type: string; token: string }>) {
          if (chunk.type === 'token') {
            fullText += chunk.token;
            if (Date.now() - lastUpdate > 1500) {
              await responseMsg.edit(fullText.slice(0, 2000));
              lastUpdate = Date.now();
            }
          }
        }
        
        clearInterval(typingInterval);
        await responseMsg.edit(fullText.slice(0, 2000) || 'No response from agent.');
        await responseMsg.react('✅');
      } catch (err) {
        console.error('[Discord] Error processing message:', err);
      }
    });

    await this.client.login(token);
    this.status = 'connected';
    console.log('[Discord] Client logged in');
  }

  async stop() {
    await this.client?.destroy();
    this.status = 'not_connected';
  }

  getStatus() {
    return this.status;
  }
}
