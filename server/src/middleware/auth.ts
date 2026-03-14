import { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/health' || req.path === '/login' || req.path === '/') {
    return next();
  }

  // Check config file
  let storedToken = '';
  try {
    const configPath = path.join(os.homedir(), '.openpaw', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      storedToken = config.token || '';
    }
  } catch (e) {
    // ignore
  }

  // Check DB settings as fallback
  if (!storedToken) {
    try {
      const db = getDb();
      const dbTokenRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('auth_token') as { value: string } | undefined;
      storedToken = dbTokenRow?.value || '';
    } catch {
       // db error during init
    }
  }

  if (!storedToken) {
    // Open access in dev mode when no token is defined anywhere
    return next();
  }

  const authHeader = req.headers.authorization;
  const xToken = req.headers['x-openpaw-token'];
  
  let incomingToken = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    incomingToken = authHeader.split(' ')[1];
  } else if (typeof xToken === 'string') {
    incomingToken = xToken;
  }

  if (incomingToken === storedToken) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
}
