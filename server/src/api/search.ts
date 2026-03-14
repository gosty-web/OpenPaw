import { Router } from 'express';
import { WebSearchEngine } from '../search/WebSearchEngine.js';

const router = Router();
const searchEngine = new WebSearchEngine();

// GET /api/search
router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const results = await searchEngine.search(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
