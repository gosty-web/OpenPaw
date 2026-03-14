import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/mcps
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM mcps').all());
});

// POST /api/mcps
router.post('/', (req, res) => {
  const db = getDb();
  const { name, transport, endpoint } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO mcps (id, name, transport, endpoint, status) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, transport || 'stdio', endpoint || '', 'disconnected');
  res.status(201).json({ id, name, transport, endpoint, status: 'disconnected' });
});

// PATCH /api/mcps/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
  const values = Object.values(req.body);
  db.prepare(`UPDATE mcps SET ${fields} WHERE id = ?`).run(...values, req.params.id);
  res.json(db.prepare('SELECT * FROM mcps WHERE id = ?').get(req.params.id));
});

// DELETE /api/mcps/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM mcps WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// TEST
router.post('/:id/test', (req, res) => {
  const db = getDb();
  const mcp = db.prepare('SELECT * FROM mcps WHERE id = ?').get(req.params.id);
  if (!mcp) return res.status(404).json({ error: 'MCP not found' });
  
  // Mocking tools list for now
  res.json({
    ok: true,
    tools: [
      { name: 'echo', description: 'Replies with what you said' },
      { name: 'search_web', description: 'Search the web using Google' }
    ]
  });
});

// TOGGLE
router.post('/:id/toggle', (req, res) => {
  const db = getDb();
  const mcp = db.prepare('SELECT * FROM mcps WHERE id = ?').get(req.params.id) as any;
  if (!mcp) return res.status(404).json({ error: 'MCP not found' });
  const status = mcp.status === 'connected' ? 'disconnected' : 'connected';
  db.prepare('UPDATE mcps SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ status });
});

// AGENT ATTACHMENT
router.get('/agent/:agentId', (req, res) => {
  const db = getDb();
  const mcps = db.prepare(`
    SELECT m.* 
    FROM mcps m
    JOIN agent_mcps am ON m.id = am.mcp_id
    WHERE am.agent_id = ?
  `).all(req.params.agentId);
  res.json(mcps);
});

router.post('/agent/:agentId/:mcpId', (req, res) => {
  const db = getDb();
  db.prepare('INSERT INTO agent_mcps (agent_id, mcp_id) VALUES (?, ?)')
    .run(req.params.agentId, req.params.mcpId);
  res.status(201).end();
});

router.delete('/agent/:agentId/:mcpId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM agent_mcps WHERE agent_id = ? AND mcp_id = ?')
    .run(req.params.agentId, req.params.mcpId);
  res.status(204).end();
});

export default router;
