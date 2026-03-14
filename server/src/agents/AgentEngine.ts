import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { getDb, getOpenPawDataDir } from '../db/index.js';
import { AgentManager } from './AgentManager.js';
import { MemoryManager } from './MemoryManager.js';
import { ModelRouter } from '../llm/ModelRouter.js';
import { MemoryLogger } from './files/MemoryLogger.js';
import { Agent, AgentStatus, ChatResult, ProactiveResult, SessionSummary } from '../types/agent.js';
import { LLMMessage } from '../llm/types.js';
import { WebSearchEngine } from '../search/WebSearchEngine.js';
import { BrowserEngine } from '../browser/BrowserEngine.js';
import { AgentFileManager } from './files/AgentFileManager.js';
import { emitAgentStatus } from '../socket.js';

export class AgentEngine {
  private agentId: string;
  private agentManager: AgentManager;
  private memoryManager: MemoryManager;
  private router: ModelRouter;
  private searchEngine: WebSearchEngine;
  private browserEngine: BrowserEngine;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.agentManager = new AgentManager();
    this.memoryManager = new MemoryManager();
    this.router = new ModelRouter();
    this.searchEngine = new WebSearchEngine();
    this.browserEngine = new BrowserEngine();
  }

  async chat(userMessage: string, sessionId: string = 'default'): Promise<ChatResult> {
    this.setStatus('busy');
    try {
      const db = getDb();
      const agent = this.agentManager.get(this.agentId);
      if (!agent) throw new Error('Agent not found');

      // First Boot Check
      const firstBootResult = db.prepare("SELECT value FROM settings WHERE key = 'first_boot'").get() as { value: string } | undefined;
      const isFirstBoot = firstBootResult?.value === 'true';
      const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE agent_id = ?').get(this.agentId) as { count: number };
      
      if (isFirstBoot && messageCount.count === 0) {
        const result = await this.handleFirstBoot();
        this.setStatus('idle');
        return result;
      }

      const systemContext = await this.agentManager.getSoulContext(this.agentId);
      const history = this.getHistory(sessionId, 20);
      const memories = await this.memoryManager.search(this.agentId, userMessage, 5);
      
      const messages: LLMMessage[] = [
        { role: 'system', content: systemContext },
        ...memories.map(m => ({ role: 'system', content: `Relevant Memory: ${m.content}` } as LLMMessage)),
        ...history.map(h => ({ role: h.role as any, content: h.content })),
        { role: 'user', content: userMessage }
      ];

      let response = await this.router.chat({
        provider: agent.provider as any,
        model: agent.model,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens
      });

      // Primitive tool patterns: [SEARCH: query] and [BROWSER: url]
      let content = response.content;
      let modified = false;

      // 1. Search Pattern
      const searchMatch = content.match(/\[SEARCH:\s*(.*?)\]/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        console.log(`[AgentEngine] Triggering Search: ${query}`);
        const results = await this.searchEngine.search(query);
        const searchContext = results.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n');
        
        response = await this.router.chat({
          provider: agent.provider as any,
          model: agent.model,
          messages: [
            ...messages,
            { role: 'assistant', content: content },
            { role: 'system', content: `SEARCH RESULTS:\n${searchContext}\n\nContinue your response using this information.` }
          ]
        });
        content = response.content;
        modified = true;
      }

      // 2. Browser Pattern
      const browserMatch = content.match(/\[BROWSER:\s*(.*?)\]/i);
      if (browserMatch && !modified) {
        const url = browserMatch[1].trim();
        console.log(`[AgentEngine] Triggering Browser: ${url}`);
        try {
          const pageText = await this.browserEngine.navigate(this.agentId, url);
          response = await this.router.chat({
            provider: agent.provider as any,
            model: agent.model,
            messages: [
              ...messages,
              { role: 'assistant', content: content },
              { role: 'system', content: `BROWSER CONTENT from ${url}:\n${pageText.substring(0, 5000)}\n\nContinue your response using this information.` }
            ]
          });
          content = response.content;
          modified = true;
        } catch (err: any) {
          console.error(`[AgentEngine] Browser failed: ${err.message}`);
        }
      }

      // Post-processing
      const now = new Date().toISOString();
      db.prepare('INSERT INTO messages (id, agent_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), this.agentId, 'user', userMessage, sessionId, now);
      db.prepare('INSERT INTO messages (id, agent_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), this.agentId, 'assistant', response.content, sessionId, now);

      const logger = new MemoryLogger(this.agentId);
      await logger.append(`User: ${userMessage.substring(0, 50)}... | Assistant: ${response.content.substring(0, 50)}...`);

      if (response.content.length > 150) {
        this.memoryManager.add(this.agentId, response.content.substring(0, 500), 'episodic', 0.6, ['chat'], sessionId);
      }

      this.agentManager.updateVitality(this.agentId, { energy: -1, curiosity: 1 });

      this.setStatus('idle');

      return {
        response: response.content,
        message: {
          role: 'assistant',
          content: response.content
        },
        sessionId,
        usage: response.usage
      };
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  private setStatus(status: AgentStatus): void {
    this.agentManager.setStatus(this.agentId, status);
    emitAgentStatus(this.agentId, status);
  }

  async *streamChat(userMessage: string, sessionId: string = 'default'): AsyncGenerator<any> {
    this.setStatus('busy');
    try {
      const db = getDb();
      const agent = this.agentManager.get(this.agentId);
      if (!agent) throw new Error('Agent not found');

      const systemContext = await this.agentManager.getSoulContext(this.agentId);
      const history = this.getHistory(sessionId, 20);
      const memories = await this.memoryManager.search(this.agentId, userMessage, 5);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemContext },
        ...memories.map(m => ({ role: 'system', content: `Relevant Memory: ${m.content}` } as LLMMessage)),
        ...history.map(h => ({ role: h.role as any, content: h.content })),
        { role: 'user', content: userMessage }
      ];

      let fullResponse = '';
      const stream = this.router.stream({
        provider: agent.provider as any,
        model: agent.model,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens
      });

      for await (const chunk of stream) {
        fullResponse += chunk;
        yield { type: 'chunk', text: chunk };
      }

      // Save history
      const now = new Date().toISOString();
      db.prepare('INSERT INTO messages (id, agent_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), this.agentId, 'user', userMessage, sessionId, now);
      db.prepare('INSERT INTO messages (id, agent_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), this.agentId, 'assistant', fullResponse, sessionId, now);

      this.agentManager.updateVitality(this.agentId, { energy: -1, curiosity: 1 });
      
      this.setStatus('idle');
      yield { type: 'done', sessionId, fullResponse };
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  getSessions(): SessionSummary[] {
    const db = getDb();
    return db.prepare(`
      SELECT session_id as sessionId, content as lastMessage, created_at as updatedAt
      FROM messages
      WHERE agent_id = ?
      GROUP BY session_id
      ORDER BY created_at DESC
    `).all(this.agentId) as SessionSummary[];
  }

  getHistory(sessionId: string, limit: number = 20): any[] {
    const db = getDb();
    return db.prepare(`
      SELECT role, content, created_at 
      FROM messages 
      WHERE agent_id = ? AND session_id = ? 
      ORDER BY created_at ASC LIMIT ?
    `).all(this.agentId, sessionId, limit);
  }

  async proactiveCheck(): Promise<ProactiveResult | null> {
    const agent = this.agentManager.get(this.agentId);
    if (!agent) return null;

    this.setStatus('busy');
    try {
      const dataDir = path.join(getOpenPawDataDir(), 'agents', this.agentId);
      const stateFile = path.join(dataDir, 'memory', 'heartbeat-state.json');
      await fs.ensureDir(path.dirname(stateFile));

      let state = { last_check: {} as Record<string, string> };
      if (fs.existsSync(stateFile)) {
        state = fs.readJsonSync(stateFile);
      }

      const now = Date.now();
      const dueChecks: string[] = [];
      const lastEmailCheck = state.last_check['email'];
      if (!lastEmailCheck || now - new Date(lastEmailCheck).getTime() > 2 * 60 * 60 * 1000) {
        dueChecks.push('email');
      }

      if (dueChecks.length === 0) {
        this.setStatus('idle');
        return null;
      }

      const fileManager = new AgentFileManager(this.agentId, agent.name);
      let heartbeatMd = '';
      try {
        heartbeatMd = await fileManager.readFile('HEARTBEAT.md');
      } catch {
        heartbeatMd = '[No HEARTBEAT.md found]';
      }

      const prompt = `Check ${dueChecks.join(', ')}. HEARTBEAT.md says:\n${heartbeatMd}\nReport anything important. Be brief.`;

      const systemContext = await this.agentManager.getSoulContext(this.agentId);
      const response = await this.router.chat({
        provider: agent.provider as any,
        model: agent.model,
        messages: [
          { role: 'system', content: systemContext },
          { role: 'user', content: prompt }
        ]
      });

      for (const check of dueChecks) {
        state.last_check[check] = new Date().toISOString();
      }
      fs.writeJsonSync(stateFile, state);

      const trimmed = response.content.trim();
      if (trimmed.toUpperCase() === 'HEARTBEAT_OK') {
        this.setStatus('idle');
        return null;
      }

      this.setStatus('idle');
      return { message: response.content, channel: 'chat' };
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  private async handleFirstBoot(): Promise<ChatResult> {
    const db = getDb();
    const agent = this.agentManager.get(this.agentId);
    const systemContext = await this.agentManager.getSoulContext(this.agentId);

    const response = await this.router.chat({
      provider: agent?.provider as any,
      model: agent?.model || '',
      messages: [
        { role: 'system', content: systemContext },
        { role: 'user', content: "You're now online for the first time. Send your welcome message to the user." }
      ]
    });

    const now = new Date().toISOString();
    db.prepare('INSERT INTO messages (id, agent_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), this.agentId, 'assistant', response.content, 'boot', now);

    db.prepare("DELETE FROM settings WHERE key = 'first_boot'").run();

    return {
      response: response.content,
      message: {
        role: 'assistant',
        content: response.content
      },
      sessionId: 'boot',
      usage: response.usage
    };
  }
}
