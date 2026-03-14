import { Router } from 'express';
import { VoiceEngine } from '../voice/VoiceEngine.js';

const router = Router();
const voiceEngine = new VoiceEngine();

// GET /api/voice/voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await voiceEngine.getVoices();
    res.json(voices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/tts
router.post('/tts', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const buffer = await voiceEngine.speak(text, voiceId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/stt
router.post('/stt', async (req, res) => {
  // Implementation for audio upload would go here
  res.status(501).json({ error: 'STT upload endpoint not yet fully implemented' });
});

export default router;
