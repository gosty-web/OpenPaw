import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDb } from './db/index.js';
import { setSocketServer } from './socket.js';

// Routers
import agentsRouter from './api/agents.js';
import chatRouter from './api/chat.js';
import workspacesRouter from './api/workspaces.js';
import mcpsRouter from './api/mcps.js';
import skillsRouter from './api/skills.js';
import cronRouter from './api/cron.js';
import channelsRouter from './api/channels.js';
import instancesRouter from './api/instances.js';
import settingsRouter from './api/settings.js';
import providersRouter from './api/providers.js';
import importRouter from './api/import.js';
import voiceRouter from './api/voice.js';
import searchRouter from './api/search.js';
import learningRouter from './api/learning.js';
import { VoiceEngine } from './voice/VoiceEngine.js';
import { CronScheduler } from './cron/CronScheduler.js';
import { AgentEngine } from './agents/AgentEngine.js';
import { setCronScheduler } from './cron/schedulerStore.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
setSocketServer(io);

const port = process.env.PORT || 7411;

// Initialize Cron
const cronScheduler = new CronScheduler(io);
setCronScheduler(cronScheduler);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/agents', chatRouter); 
app.use('/api/workspaces', workspacesRouter);
app.use('/api/mcps', mcpsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/cron', cronRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/instances', instancesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/providers', providersRouter);
app.use('/api/import', importRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/search', searchRouter);
app.use('/api/learning', learningRouter);

// Socket.IO
io.on('connection', (socket) => {
  console.log('[Socket] Peer connected:', socket.id);
  socket.emit('server:ready', { version: '0.1.0' });

  socket.on('agent:subscribe', (agentId: string) => {
    socket.join(`agent:${agentId}`);
    console.log(`[Socket] Peer ${socket.id} subscribed to agent:${agentId}`);
  });

  socket.on('instance:subscribe', () => {
    socket.join('instances');
    console.log(`[Socket] Peer ${socket.id} subscribed to instances`);
  });

  socket.on('chat:stream', async ({ agentId, message, sessionId }) => {
    try {
      const engine = new AgentEngine(agentId);
      const stream = engine.streamChat(message, sessionId);
      
      for await (const chunk of stream) {
        if (chunk.type === 'chunk') {
          socket.emit('chat:chunk', { agentId, sessionId, chunk: chunk.text, done: false });
        } else if (chunk.type === 'done') {
          socket.emit('chat:chunk', { agentId, sessionId, chunk: '', done: true });
        }
      }
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  });
});

// Health Endpoint
app.get('/api/health', (req, res) => {
  const db = getDb();
  const counts = {
    agents: db.prepare('SELECT COUNT(*) as count FROM agents').get() as any,
    memories: db.prepare('SELECT COUNT(*) as count FROM memories').get() as any,
    messages: db.prepare('SELECT COUNT(*) as count FROM messages').get() as any,
    workspaces: db.prepare('SELECT COUNT(*) as count FROM workspaces').get() as any,
    tasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any,
    skills: db.prepare('SELECT COUNT(*) as count FROM skills').get() as any,
    mcps: db.prepare('SELECT COUNT(*) as count FROM mcps').get() as any,
  };
  
  res.json({
    status: 'healthy',
    version: '0.1.0',
    counts: {
      agents: counts.agents.count,
      memories: counts.memories.count,
      messages: counts.messages.count,
      workspaces: counts.workspaces.count,
      tasks: counts.tasks.count,
      skills: counts.skills.count,
      mcps: counts.mcps.count,
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Startup
httpServer.listen(port, () => {
  console.log(`OpenPaw Engine -> http://localhost:${port}`);
  getDb(); // Ensure DB is initialized
  cronScheduler.start(); // Trigger cron + heartbeats
  import('./channels/ChannelManager.js').then(({ ChannelManager }) => {
    ChannelManager.getInstance().initialize();
  });
});

export { app, io };
