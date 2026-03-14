import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/workspaces
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM workspaces').all());
});

// POST /api/workspaces
router.post('/', (req, res) => {
  const db = getDb();
  const { name, type, description } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO workspaces (id, name, type, description, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, type || 'project', description || '', now);
  res.status(201).json({ id, name, type, description, created_at: now });
});

// GET /api/workspaces/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  res.json(workspace);
});

// PATCH /api/workspaces/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
  const values = Object.values(req.body);
  db.prepare(`UPDATE workspaces SET ${fields} WHERE id = ?`).run(...values, req.params.id);
  res.json(db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id));
});

// DELETE /api/workspaces/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// AGENTS
router.get('/:id/agents', (req, res) => {
  const db = getDb();
  const agents = db.prepare(`
    SELECT a.*, wa.role as workspaceRole
    FROM agents a
    JOIN workspace_agents wa ON a.id = wa.agent_id
    WHERE wa.workspace_id = ?
  `).all(req.params.id);
  res.json(agents);
});

router.post('/:id/agents', (req, res) => {
  const db = getDb();
  const { agentId, role } = req.body;
  db.prepare('INSERT INTO workspace_agents (workspace_id, agent_id, role, joined_at) VALUES (?, ?, ?, ?)')
    .run(req.params.id, agentId, role || 'member', new Date().toISOString());
  res.status(201).end();
});

router.delete('/:id/agents/:agentId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM workspace_agents WHERE workspace_id = ? AND agent_id = ?')
    .run(req.params.id, req.params.agentId);
  res.status(204).end();
});

// TASKS
router.get('/:id/tasks', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM tasks WHERE workspace_id = ?').all(req.params.id));
});

router.post('/:id/tasks', (req, res) => {
  const db = getDb();
  const { title, description } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, workspace_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, title, description || '', 'pending', new Date().toISOString());
  res.status(201).json({ id, title, description, status: 'pending' });
});

router.patch('/:id/tasks/:taskId', (req, res) => {
  const db = getDb();
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
  const values = Object.values(req.body);
  db.prepare(`UPDATE tasks SET ${fields} WHERE id = ? AND workspace_id = ?`).run(...values, req.params.taskId, req.params.id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId));
});

export default router;
