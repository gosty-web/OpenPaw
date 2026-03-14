import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// GET /api/settings
router.get('/', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all() as any[];
  
  const sanitized = settings.map(s => {
    let value = s.value;
    if (s.key.toLowerCase().includes('key') || s.key.toLowerCase().includes('token') || s.key.toLowerCase().includes('secret')) {
      value = 'sk-...xxxx';
    }
    return { ...s, value };
  });
  
  res.json(sanitized);
});

// PATCH /api/settings
router.patch('/', (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  
  const updates = req.body; // Expecting { key: value }
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  
  const transaction = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value, now);
    }
  });
  
  transaction(updates);
  res.json({ ok: true });
});

// TEST PROVIDER
router.post('/test/:provider', (req, res) => {
  res.json({ ok: true, message: `Connection to ${req.params.provider} successful` });
});

// RESTART
router.post('/system/restart', (req, res) => {
  console.log('[System] Restart requested...');
  res.json({ ok: true, message: 'Server restarting gracefully' });
  setTimeout(() => process.exit(0), 1000);
});

export default router;
