import { getDb } from '../db/index.js';

export interface BaseChannel {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): 'connected' | 'not_connected' | 'error';
}

export class ChannelManager {
  private static instance: ChannelManager;
  private channels: Map<string, BaseChannel> = new Map();

  constructor() {}

  static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager();
    }
    return ChannelManager.instance;
  }

  async initialize() {
    const db = getDb();
    const enabledChannels = db.prepare('SELECT type FROM channels WHERE enabled = 1').all() as { type: string }[];
    
    for (const { type } of enabledChannels) {
      try {
        await this.startChannel(type);
      } catch (err) {
        console.error(`[ChannelManager] Failed to start ${type}:`, err);
      }
    }
  }

  async startChannel(type: string) {
    if (this.channels.has(type)) return;

    let channel: BaseChannel | undefined;
    
    // Lazy load to avoid overhead if not used
    switch (type) {
      case 'telegram':
        const { TelegramChannel } = await import('./TelegramChannel.js');
        channel = new TelegramChannel();
        break;
      case 'discord':
        const { DiscordChannel } = await import('./DiscordChannel.js');
        channel = new DiscordChannel();
        break;
      case 'slack':
        const { SlackChannel } = await import('./SlackChannel.js');
        channel = new SlackChannel();
        break;
      case 'whatsapp':
        const { WhatsAppChannel } = await import('./WhatsAppChannel.js');
        channel = new WhatsAppChannel();
        break;
    }

    if (channel) {
      await channel.start();
      this.channels.set(type, channel);
      console.log(`[ChannelManager] ${type} started`);
    }
  }

  async stopChannel(type: string) {
    const channel = this.channels.get(type);
    if (channel) {
      await channel.stop();
      this.channels.delete(type);
      console.log(`[ChannelManager] ${type} stopped`);
    }
  }

  getStatus(type: string): 'connected' | 'not_connected' | 'error' {
    return this.channels.get(type)?.getStatus() || 'not_connected';
  }
}
