import express, { Router } from 'express';
import { AgentManager } from '../agents/AgentManager.js';
import { AgentFileManager } from '../agents/files/AgentFileManager.js';
import { MemoryManager } from '../agents/MemoryManager.js';
import { AgentEngine } from '../agents/AgentEngine.js';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const agentManager = new AgentManager();
const memoryManager = new MemoryManager();

// GET /api/agents
router.get('/', (req, res) => {
  res.json(agentManager.getAll());
});

// POST /api/agents
router.post('/', (req, res) => {
  try {
    const agent = agentManager.create(req.body);
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/agents/:id
router.get('/:id', (req, res) => {
  const agent = agentManager.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// PATCH /api/agents/:id
router.patch('/:id', (req, res) => {
  try {
    agentManager.update(req.params.id, req.body);
    res.json(agentManager.get(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', (req, res) => {
  try {
    agentManager.delete(req.params.id);
    res.status(204).end();
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// FILES API
router.get('/:id/files', async (req, res) => {
  const agent = agentManager.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const fm = new AgentFileManager(agent.id, agent.name);
  const files = await fm.listFiles();
  res.json(files);
});

router.get('/:id/files/:filename', async (req, res) => {
  const agent = agentManager.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const fm = new AgentFileManager(agent.id, agent.name);
  try {
    const content = await fm.readFile(req.params.filename as any);
    res.json({ name: req.params.filename, content });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

router.put('/:id/files/:filename', express.text(), async (req, res) => {
  const agent = agentManager.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const fm = new AgentFileManager(agent.id, agent.name);
  try {
    await fm.writeFile(req.params.filename as any, req.body);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// MEMORY API
router.get('/:id/memory', (req, res) => {
  const { tier, limit, search } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM memories WHERE agent_id = ?';
  const params: any[] = [req.params.id];

  if (tier) {
    query += ' AND tier = ?';
    params.push(tier);
  }
  if (search) {
    query += ' AND content LIKE ?';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY created_at DESC';
  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit as string));
  }

  const memories = db.prepare(query).all(...params);
  res.json(memories);
});

router.post('/:id/memory', (req, res) => {
  try {
    const { content, tier, importance, tags } = req.body;
    const memoryId = memoryManager.add(req.params.id, content, tier, importance, tags);
    res.status(201).json({ id: memoryId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/memory/:memoryId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM memories WHERE id = ? AND agent_id = ?').run(req.params.memoryId, req.params.id);
  res.status(204).end();
});

// SESSIONS
router.get('/:id/sessions', (req, res) => {
  try {
    const engine = new AgentEngine(req.params.id);
    res.json(engine.getSessions());
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/:id/sessions/:sessionId/messages', (req, res) => {
  try {
    const engine = new AgentEngine(req.params.id);
    res.json(engine.getHistory(req.params.sessionId, 100));
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// SPAWN
router.post('/:id/spawn', (req, res) => {
  try {
    const parent = agentManager.get(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent agent not found' });
    
    const subAgentData = {
      ...req.body,
      personality: `${req.body.personality || ''} (Sub-agent of ${parent.name})`.trim()
    };
    const agent = agentManager.create(subAgentData);
    
    // Add reference to parent in DB metadata if needed, but for now just linked via personality
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
