import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

type SkillRecord = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags_json: string;
  content_md: string;
  source_url?: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

function mapSkill(record: SkillRecord) {
  let tags: string[] = [];
  try {
    tags = record.tags_json ? JSON.parse(record.tags_json) : [];
  } catch {
    tags = [];
  }
  const sourceUrl = record.source_url || '';
  const sourceType = sourceUrl.includes('github.com') || sourceUrl.includes('raw.githubusercontent.com') ? 'github' : 'custom';
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    tags,
    sourceType,
    sourceUrl: sourceUrl || undefined,
    content: record.content_md,
    enabled: Boolean(record.enabled),
    size: record.content_md?.length ?? 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// GET /api/skills
router.get('/', (req, res) => {
  const db = getDb();
  const skills = db.prepare('SELECT * FROM skills ORDER BY updated_at DESC').all() as SkillRecord[];
  res.json(skills.map(mapSkill));
});

// GET /api/skills/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as SkillRecord | undefined;
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  res.json(mapSkill(skill));
});

// POST /api/skills
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, category, tags, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content are required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO skills (id, name, description, category, tags_json, content_md, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description || '',
    category || 'Custom',
    JSON.stringify(tags || []),
    content,
    1,
    now,
    now
  );
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as SkillRecord;
  res.status(201).json(mapSkill(skill));
});

// PATCH /api/skills/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const updates: Record<string, any> = { ...req.body };
  if (updates.tags) updates.tags_json = JSON.stringify(updates.tags);
  if (updates.content) updates.content_md = updates.content;
  delete updates.tags;
  delete updates.content;

  const allowed = new Set(['name', 'description', 'category', 'tags_json', 'content_md', 'source_url', 'enabled']);
  const fields = Object.keys(updates).filter((key) => allowed.has(key));
  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const now = new Date().toISOString();
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const values = fields.map((field) => updates[field]);
  db.prepare(`UPDATE skills SET ${assignments}, updated_at = ? WHERE id = ?`).run(...values, now, req.params.id);
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as SkillRecord | undefined;
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  res.json(mapSkill(skill));
});

// DELETE /api/skills/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// IMPORT PREVIEW
router.post('/import/preview', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await fetch(url);
    const content = await response.text();
    const name = url.split('/').pop()?.replace(/\.(md|txt|js|ts)$/i, '') || 'imported-skill';
    res.json({ name, content, sourceUrl: url });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch preview: ${err.message}` });
  }
});

// IMPORT
router.post('/import', async (req, res) => {
  const { url, name, category, tags, content, description } = req.body as {
    url?: string;
    name?: string;
    category?: string;
    tags?: string[];
    content?: string;
    description?: string;
  };
  if (!url || !name || !content) return res.status(400).json({ error: 'URL, name, and content are required' });

  try {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO skills (id, name, description, category, tags_json, content_md, source_url, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || `Imported from ${url}`,
      category || 'Custom',
      JSON.stringify(tags || []),
      content,
      url,
      1,
      now,
      now
    );

    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as SkillRecord;
    res.status(201).json(mapSkill(skill));
  } catch (err: any) {
    res.status(500).json({ error: `Failed to import skill: ${err.message}` });
  }
});

// TOGGLE
router.post('/:id/toggle', (req, res) => {
  const db = getDb();
  const { enabled } = req.body as { enabled?: boolean };
  const skill = db.prepare('SELECT enabled FROM skills WHERE id = ?').get(req.params.id) as { enabled: number } | undefined;
  if (!skill) return res.status(404).json({ error: 'Skill not found' });
  const nextEnabled = typeof enabled === 'boolean' ? (enabled ? 1 : 0) : skill.enabled ? 0 : 1;
  db.prepare('UPDATE skills SET enabled = ?, updated_at = ? WHERE id = ?').run(nextEnabled, new Date().toISOString(), req.params.id);
  const updated = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as SkillRecord;
  res.json(mapSkill(updated));
});

// AGENT ATTACHMENT
router.get('/agent/:agentId', (req, res) => {
  const db = getDb();
  const skills = db.prepare(`
    SELECT s.* 
    FROM skills s
    JOIN agent_skills ask ON s.id = ask.skill_id
    WHERE ask.agent_id = ?
  `).all(req.params.agentId) as SkillRecord[];
  res.json(skills.map(mapSkill));
});

router.post('/agent/:agentId/attach/:skillId', (req, res) => {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
    .run(req.params.agentId, req.params.skillId);
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.skillId) as SkillRecord | undefined;
  res.status(201).json(skill ? mapSkill(skill) : { ok: true });
});

router.delete('/agent/:agentId/detach/:skillId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?')
    .run(req.params.agentId, req.params.skillId);
  res.status(204).end();
});

export default router;
