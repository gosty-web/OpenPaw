import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// GET /api/instances
router.get('/', (req, res) => {
  const db = getDb();
  const agents = db.prepare('SELECT id, name, status FROM agents').all();
  const crons = db.prepare('SELECT id, name, enabled FROM cron_jobs').all();
  
  const instances = [
    ...agents.map((a: any) => ({ id: a.id, name: a.name, type: 'agent', status: a.status })),
    ...crons.map((c: any) => ({ id: c.id, name: c.name, type: 'cron', status: c.enabled ? 'enabled' : 'disabled' })),
    { id: 'system-bridge', name: 'System Bridge', type: 'system', status: 'online' }
  ];
  
  res.json(instances);
});

// GET /api/instances/:id/logs
router.get('/:id/logs', (req, res) => {
  const db = getDb();
  const { level, limit, since } = req.query as { level?: string; limit?: string; since?: string };
  const limitValue = Math.min(Number(limit || 50), 200);

  const conditions: string[] = ['instance_id = ?'];
  const params: any[] = [req.params.id];
  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (since) {
    conditions.push('created_at >= ?');
    params.push(since);
  }

  const whereClause = conditions.join(' AND ');
  const logs = db.prepare(
    `SELECT created_at as timestamp, level, message 
     FROM instance_logs 
     WHERE ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ?`
  ).all(...params, limitValue);

  res.json(logs);
});

export default router;
