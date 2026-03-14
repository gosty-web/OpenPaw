import { Router } from 'express';
// Assuming MODELS is exported from LLM router, or just hardcode representative ones for now
const MODELS = {
  anthropic: [ { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' } ],
  openai: [ { id: 'gpt-4o', name: 'GPT-4o' } ],
  groq: [ { id: 'llama3-70b', name: 'Llama 3 70B' } ]
};

const router = Router();

// GET /api/providers/models
router.get('/models', (req, res) => {
  res.json(MODELS);
});

export default router;
