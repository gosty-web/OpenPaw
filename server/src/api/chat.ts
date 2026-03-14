import { Router } from 'express';
import { AgentEngine } from '../agents/AgentEngine.js';
import { getDb } from '../db/index.js';

const router = Router();

// POST /api/agents/:id/chat
router.post('/:id/chat', async (req, res) => {
  try {
    const engine = new AgentEngine(req.params.id);
    const result = await engine.chat(req.body.message, req.body.sessionId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/agents/:id/stream
router.post('/:id/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const engine = new AgentEngine(req.params.id);
    const stream = engine.streamChat(req.body.message, req.body.sessionId);

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

// DELETE /api/agents/:id/sessions/:sessionId
router.delete('/:id/sessions/:sessionId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE agent_id = ? AND session_id = ?').run(req.params.id, req.params.sessionId);
  res.status(204).end();
});

export default router;
