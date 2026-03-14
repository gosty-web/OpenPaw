import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { getDb, getOpenPawDataDir } from '../db/index.js';
import { AgentFileManager, CreateAgentInput } from './files/AgentFileManager.js';
import { MemoryLogger } from './files/MemoryLogger.js';
import { Agent, AgentStatus, AgentVitality } from '../types/agent.js';

export class AgentManager {
  async create(input: CreateAgentInput): Promise<Agent> {
    const db = getDb();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();
    
    // Check if this is the first agent
    const countResult = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    const isFirstAgent = countResult.count === 0;

    const fileManager = new AgentFileManager(id, input.name);
    
    // Default vitality
    const vitality: AgentVitality = { energy: 100, curiosity: 50, mood: 'stable' };

    const agent: Agent = {
      ...input,
      id,
      status: 'idle',
      max_tokens: input.maxTokens || 4096,
      vitality_json: JSON.stringify(vitality),
      soul_md: '', 
      user_md: '',
      agents_md: '',
      identity_md: '',
      memory_md: '',
      heartbeat_md: '',
      growth_md: '',
      bonds_md: '',
      hot_memory: '',
      created_at: now,
      updated_at: now
    };

    db.prepare(`
      INSERT INTO agents (
        id, name, role, personality, status, model, provider, temperature, max_tokens, 
        vitality_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agent.id, agent.name, agent.role, agent.personality, agent.status, 
      agent.model, agent.provider, agent.temperature, agent.max_tokens,
      agent.vitality_json, agent.created_at, agent.updated_at
    );

    // Initialize files correctly
    await fileManager.initialize(input);
    
    // Create first semantic memory
    db.prepare(`
      INSERT INTO memories (id, agent_id, tier, content, importance, created_at)
      VALUES (?, ?, 'semantic', ?, 1.0, ?)
    `).run(uuidv4(), id, `Identity established for ${input.name} as ${input.role}`, now);

    if (isFirstAgent) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('first_boot', 'true', ?)")
        .run(now);
    }

    return agent;
  }

  get(id: string): Agent | null {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
    return agent || null;
  }

  getAll(): Agent[] {
    const db = getDb();
    return db.prepare('SELECT * FROM agents').all() as Agent[];
  }

  update(id: string, updates: Partial<Agent>): void {
    const db = getDb();
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    const now = new Date().toISOString();
    
    db.prepare(`UPDATE agents SET ${fields}, updated_at = ? WHERE id = ?`)
      .run(...values, now, id);
  }

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    const agentDir = path.join(getOpenPawDataDir(), 'agents', id);
    fs.removeSync(agentDir);
  }

  setStatus(id: string, status: AgentStatus): void {
    this.update(id, { status } as any);
  }

  updateVitality(id: string, delta: Partial<AgentVitality>): void {
    const agent = this.get(id);
    if (!agent) return;
    
    const currentVitality = JSON.parse(agent.vitality_json) as AgentVitality;
    const newVitality = {
      energy: Math.max(0, Math.min(100, (currentVitality.energy || 100) + (delta.energy || 0))),
      curiosity: Math.max(0, Math.min(100, (currentVitality.curiosity || 50) + (delta.curiosity || 0))),
      mood: delta.mood || currentVitality.mood || 'stable'
    };
    
    this.update(id, { vitality_json: JSON.stringify(newVitality) } as any);
  }

  async getSoulContext(id: string): Promise<string> {
    const agent = this.get(id);
    if (!agent) throw new Error('Agent not found');
    
    const fileManager = new AgentFileManager(id, agent.name);
    const agentsMd = await fileManager.readFile('AGENTS.md');
    const soulMd = await fileManager.readFile('SOUL.md');
    const userMd = await fileManager.readFile('USER.md');
    
    const logger = new MemoryLogger(id);
    const recentLogs = await logger.readRecent(2);
    const logsContext = recentLogs.length > 0 
      ? "\n\n## Recent Activity Logs\n" + recentLogs.join("\n---\n") 
      : "";

    return `${agentsMd}\n\n${soulMd}\n\n${userMd}\n\n## Internal Latent Memory\n${agent.hot_memory}${logsContext}`;
  }
}
