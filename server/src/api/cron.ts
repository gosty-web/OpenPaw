import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getCronScheduler } from '../cron/schedulerStore.js';
import type { CronJobRecord } from '../cron/CronScheduler.js';

const router = Router();

// GET /api/cron
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM cron_jobs ORDER BY created_at DESC').all());
});

// GET /api/cron/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Cron job not found' });
  res.json(job);
});

// GET /api/cron/:id/last-result
router.get('/:id/last-result', (req, res) => {
  const db = getDb();
  const job = db.prepare('SELECT id, last_result FROM cron_jobs WHERE id = ?').get(req.params.id) as { id: string; last_result: string } | undefined;
  if (!job) return res.status(404).json({ error: 'Cron job not found' });
  res.json({ id: job.id, last_result: job.last_result });
});

// POST /api/cron
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, schedule, prompt, agentId, timezone, enabled, maxRetries, timeoutMinutes } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  const enabledValue = typeof enabled === 'number' ? enabled : enabled === false ? 0 : 1;

  db.prepare(`
    INSERT INTO cron_jobs (
      id, name, description, agent_id, prompt, schedule, timezone, enabled, max_retries, timeout_minutes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description || '',
    agentId || '',
    prompt,
    schedule,
    timezone || 'UTC',
    enabledValue,
    typeof maxRetries === 'number' ? maxRetries : 0,
    typeof timeoutMinutes === 'number' ? timeoutMinutes : 10,
    now
  );

  const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as CronJobRecord;
  const scheduler = getCronScheduler();
  if (scheduler && job.enabled === 1) {
    scheduler.scheduleJob(job);
  }
  const updatedJob = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id);
  res.status(201).json(updatedJob);
});

// PATCH /api/cron/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const normalizedBody = { ...req.body } as Record<string, any>;
  if (normalizedBody.agentId && !normalizedBody.agent_id) normalizedBody.agent_id = normalizedBody.agentId;
  if (normalizedBody.maxRetries !== undefined && normalizedBody.max_retries === undefined) normalizedBody.max_retries = normalizedBody.maxRetries;
  if (normalizedBody.timeoutMinutes !== undefined && normalizedBody.timeout_minutes === undefined) normalizedBody.timeout_minutes = normalizedBody.timeoutMinutes;
  if (typeof normalizedBody.enabled === 'boolean') normalizedBody.enabled = normalizedBody.enabled ? 1 : 0;

  const allowedFields = new Set([
    'name',
    'description',
    'agent_id',
    'prompt',
    'schedule',
    'timezone',
    'enabled',
    'max_retries',
    'timeout_minutes'
  ]);

  const updates = Object.entries(normalizedBody).filter(([key]) => allowedFields.has(key));
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const fields = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([, value]) => value);
  db.prepare(`UPDATE cron_jobs SET ${fields} WHERE id = ?`).run(...values, req.params.id);

  const job = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id) as CronJobRecord | undefined;
  if (!job) return res.status(404).json({ error: 'Cron job not found' });

  const scheduler = getCronScheduler();
  if (scheduler && updates.some(([key]) => ['schedule', 'timezone', 'enabled'].includes(key))) {
    scheduler.rescheduleJob(req.params.id);
  }

  const updatedJob = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id);
  res.json(updatedJob);
});

// DELETE /api/cron/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const scheduler = getCronScheduler();
  if (scheduler) scheduler.unscheduleJob(req.params.id);
  db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// RUN
router.post('/:id/run', async (req, res) => {
  const db = getDb();
  const cron = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(req.params.id) as { name: string } | undefined;
  if (!cron) return res.status(404).json({ error: 'Cron job not found' });

  const scheduler = getCronScheduler();
  if (!scheduler) {
    return res.status(500).json({ error: 'Cron scheduler not available' });
  }

  try {
    const result = await scheduler.runNow(req.params.id);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
