import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDb } from './db/index.js';
import { setSocketServer } from './socket.js';
import { authMiddleware } from './middleware/auth.js';
import path from 'path';

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
import slashCommandsRouter from './api/slash-commands.js';
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

// Initialize DB and Cron
const db = getDb();

const cronScheduler = new CronScheduler(io);
setCronScheduler(cronScheduler);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(authMiddleware);

// Routes
app.use('/api/agents', agentsRouter);
// Note: chatRouter is already mounted within agentsRouter logic in some patterns, 
// but here we ensure it doesn't collide. We'll merge if needed, but for now just fix the mount.
app.use('/api/chat', chatRouter); 
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
app.use('/api/slash-commands', slashCommandsRouter);

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

// Login Page
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - OpenPaw</title>
      <style>
        body {
          background-color: #0c0a09;
          color: #fafaf9;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          background-color: #1c1917;
          border: 1px solid #292524;
          border-radius: 0.75rem;
          padding: 2.5rem;
          width: 100%;
          max-width: 24rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        p {
          color: #a8a29e;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }
        input {
          width: 100%;
          background-color: #292524;
          border: 1px solid #44403c;
          color: #fafaf9;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          margin-bottom: 1rem;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 1px #6366f1;
        }
        button {
          width: 100%;
          background-color: #4f46e5;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #4338ca;
        }
        .help {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: #78716c;
        }
        code {
          background-color: #292524;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: inherit;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🐾 OpenPaw</h1>
        <p>Enter your secure token to access the platform.</p>
        <form id="loginForm">
          <input type="text" id="tokenInput" placeholder="opk_..." required autocomplete="off">
          <button type="submit">Enter</button>
        </form>
        <div class="help">
          Where's my token? Run <code>openpaw token</code> in your terminal.
        </div>
      </div>
      <script>
        document.getElementById('loginForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const token = document.getElementById('tokenInput').value.trim();
          if (token) {
            localStorage.setItem('openpaw_token', token);
            window.location.href = '/';
          }
        });
        
        // Auto-fill if exists
        const existing = localStorage.getItem('openpaw_token');
        if (existing) {
          document.getElementById('tokenInput').value = existing;
        }
      </script>
    </body>
    </html>
  `);
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
const startServer = async () => {
  try {
    httpServer.listen(port, () => {
      console.log(`OpenPaw Engine -> http://localhost:${port}`);
      try {
        cronScheduler.start(); // Trigger cron + heartbeats
        import('./channels/ChannelManager.js').then(({ ChannelManager }) => {
          ChannelManager.getInstance().initialize();
        });
      } catch (initErr) {
        console.error('[Startup] Failed to start services:', initErr);
      }
    });

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Error] Port ${port} is already in use. Please kill the process using it or change the port in .env`);
        process.exit(1);
      } else {
        console.error('[Error] Server failed to start:', err);
      }
    });
  } catch (startupErr) {
    console.error('[Startup] Critical failure:', startupErr);
    process.exit(1);
  }
};

startServer();

export { app, io };
