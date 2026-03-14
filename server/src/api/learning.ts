import { Router } from 'express';
import { LearningSession } from '../learning/LearningSession.js';

const router = Router();
const learningSession = new LearningSession();

// POST /api/learning/start
router.post('/start', async (req, res) => {
  try {
    const { agentId } = req.body as { agentId?: string };
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    const session = await learningSession.startSession(agentId);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning/frame
router.post('/frame', async (req, res) => {
  try {
    const { sessionId, image, imageBase64, transcript } = req.body as { sessionId?: string; image?: string; imageBase64?: string; transcript?: string };
    const payloadImage = image || imageBase64;
    if (!sessionId || !payloadImage) {
      return res.status(400).json({ error: 'sessionId and image are required' });
    }
    await learningSession.processFrame(sessionId, payloadImage as string, transcript);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning/end
router.post('/end', async (req, res) => {
  try {
    const { sessionId, attachToAgent } = req.body as { sessionId?: string; attachToAgent?: boolean };
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const skill = await learningSession.endSession(sessionId, Boolean(attachToAgent));
    res.json(skill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning/transcribe
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body as { audioBase64?: string; mimeType?: string };
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required' });
    const text = await learningSession.transcribeAudio(audioBase64, mimeType);
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
