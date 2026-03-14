import { Router } from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const router = Router();

// POST /api/import/openclaw
router.post('/openclaw', (req, res) => {
  res.json({ ok: true, message: 'Import logic pending implementation (requires zip parsing)' });
});

// POST /api/export/all
router.post('/export/all', (req, res) => {
  const dataDir = path.join(os.homedir(), '.openpaw');
  res.json({ ok: true, message: 'Export logic pending (creates .zip of ~/.openpaw/)', downloadUrl: '/api/static/export.zip' });
});

export default router;
