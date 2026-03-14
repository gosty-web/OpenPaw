import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/slash-commands
router.get('/', (req, res) => {
  const db = getDb();
  // Fetch built-in and user-defined ones
  const commands = db.prepare('SELECT * FROM slash_commands ORDER BY is_builtin DESC, name ASC').all();
  res.json(commands);
});

// POST /api/slash-commands
router.post('/', (req, res) => {
  const db = getDb();
  const { name, display_name, description, prompt_template, agent_id } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  // Clean name (strip leading slash if present)
  let cleanName = (name || '').trim().toLowerCase();
  if (cleanName.startsWith('/')) cleanName = cleanName.substring(1);

  if (!cleanName || !prompt_template) {
    return res.status(400).json({ error: 'name and prompt_template are required' });
  }

  const dName = display_name || `/${cleanName}`;

  try {
    db.prepare(`
      INSERT INTO slash_commands (id, name, display_name, description, prompt_template, is_builtin, agent_id, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, cleanName, dName, description || '', prompt_template, agent_id || null, now);
    
    const newCommand = db.prepare('SELECT * FROM slash_commands WHERE id = ?').get(id);
    res.status(201).json(newCommand);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: `Slash command '${cleanName}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/slash-commands/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;
  const { name, display_name, description, prompt_template, agent_id } = req.body;

  const existing = db.prepare('SELECT * FROM slash_commands WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Command not found' });
  if (existing.is_builtin === 1) return res.status(400).json({ error: 'Built-in commands cannot be modified directly' });

  let cleanName = name !== undefined ? name.trim().toLowerCase() : existing.name;
  if (cleanName.startsWith('/')) cleanName = cleanName.substring(1);

  const dName = display_name !== undefined ? display_name : existing.display_name;
  const desc = description !== undefined ? description : existing.description;
  const tmpl = prompt_template !== undefined ? prompt_template : existing.prompt_template;
  const aId = agent_id !== undefined ? agent_id : existing.agent_id;

  try {
    db.prepare(`
      UPDATE slash_commands 
      SET name = ?, display_name = ?, description = ?, prompt_template = ?, agent_id = ?
      WHERE id = ?
    `).run(cleanName, dName, desc, tmpl, aId || null, id);

    const updatedCommand = db.prepare('SELECT * FROM slash_commands WHERE id = ?').get(id);
    res.json(updatedCommand);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: `Slash command '${cleanName}' already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/slash-commands/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM slash_commands WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Command not found' });
  if (existing.is_builtin === 1) return res.status(400).json({ error: 'Built-in commands cannot be deleted' });

  db.prepare('DELETE FROM slash_commands WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
