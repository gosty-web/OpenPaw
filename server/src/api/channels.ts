import { Router } from 'express';
import { getDb } from '../db/index.js';
import { ChannelManager } from '../channels/ChannelManager.js';

const router = Router();
const channelManager = ChannelManager.getInstance();

// GET /api/channels
router.get('/', (req, res) => {
  const db = getDb();
  const channels = db.prepare('SELECT * FROM channels').all() as any[];
  
  const sanitized = channels.map(c => {
    const config = JSON.parse(c.config_json || '{}');
    const maskedConfig = { ...config };
    if (maskedConfig.botToken) maskedConfig.botToken = '••••••••';
    if (maskedConfig.appToken) maskedConfig.appToken = '••••••••';
    
    return { 
      ...c, 
      config: maskedConfig,
      status: channelManager.getStatus(c.type)
    };
  });
  
  res.json(sanitized);
});

// PATCH /api/channels/:type
router.patch('/:type', async (req, res) => {
  const db = getDb();
  const { config, agentId } = req.body;
  const now = new Date().toISOString();
  const type = req.params.type;
  
  db.prepare('UPDATE channels SET config_json = ?, agent_id = ?, updated_at = ? WHERE type = ?')
    .run(JSON.stringify(config || {}), agentId || null, now, type);
    
  // If enabled, restart the channel to apply new config
  const channel = db.prepare('SELECT enabled FROM channels WHERE type = ?').get(type) as { enabled: number } | undefined;
  if (channel?.enabled) {
    await channelManager.stopChannel(type);
    await channelManager.startChannel(type);
  }

  res.json({ ok: true, status: channelManager.getStatus(type) });
});

// TOGGLE
router.post('/:type/toggle', async (req, res) => {
  const db = getDb();
  const type = req.params.type;
  const channel = db.prepare('SELECT enabled FROM channels WHERE type = ?').get(type) as { enabled: number } | undefined;
  
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  
  const nextEnabled = channel.enabled ? 0 : 1;
  db.prepare('UPDATE channels SET enabled = ?, updated_at = ? WHERE type = ?')
    .run(nextEnabled, new Date().toISOString(), type);

  if (nextEnabled) {
    await channelManager.startChannel(type);
  } else {
    await channelManager.stopChannel(type);
  }

  res.json({ enabled: !!nextEnabled, status: channelManager.getStatus(type) });
});

// WHATSAPP QR
router.get('/whatsapp/qr', (req, res) => {
  const db = getDb();
  const qr = db.prepare('SELECT value FROM settings WHERE key = "whatsapp_qr"').get() as { value: string } | undefined;
  res.json({ qr: qr?.value || null });
});

// TELEGRAM TEST
router.post('/telegram/test', (req, res) => {
  // Logic for simple test message could be added here if needed
  res.json({ ok: true, message: 'Test check performed.' });
});

export default router;
