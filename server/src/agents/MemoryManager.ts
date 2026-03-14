import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { PineconeStore } from '../memory/PineconeStore.js';

export interface Memory {
  id: string;
  agent_id: string;
  tier: 'hot' | 'episodic' | 'semantic';
  content: string;
  importance: number;
  tags_json: string;
  session_id?: string;
  created_at: string;
  accessed_at?: string;
  access_count: number;
}

export class MemoryManager {
  private pinecone = new PineconeStore();

  add(agentId: string, content: string, tier: 'hot' | 'episodic' | 'semantic', importance: number = 0.5, tags: string[] = [], sessionId?: string): Memory {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const memory: Memory = {
      id,
      agent_id: agentId,
      tier,
      content,
      importance,
      tags_json: JSON.stringify(tags),
      session_id: sessionId,
      created_at: now,
      access_count: 0
    };

    db.prepare(`
      INSERT INTO memories (id, agent_id, tier, content, importance, tags_json, session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memory.id, memory.agent_id, memory.tier, memory.content, 
      memory.importance, memory.tags_json, memory.session_id, memory.created_at
    );

    if (tier === 'hot') {
      this.refreshHotCache(agentId);
    }

    this.pinecone
      .upsert(agentId, memory.id, memory.content, {
        tier: memory.tier,
        importance: memory.importance,
        tags,
        created_at: memory.created_at,
      })
      .catch((error) => console.error('[Pinecone] Upsert failed:', error));

    return memory;
  }

  get(id: string): Memory | null {
    const db = getDb();
    return db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Memory | null;
  }

  list(agentId: string, tier?: string, limit: number = 50): Memory[] {
    const db = getDb();
    let query = 'SELECT * FROM memories WHERE agent_id = ?';
    const params: any[] = [agentId];
    
    if (tier) {
      query += ' AND tier = ?';
      params.push(tier);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    return db.prepare(query).all(...params) as Memory[];
  }

  async search(agentId: string, query: string, limit: number = 10): Promise<Memory[]> {
    const db = getDb();
    await this.pinecone.initialize();

    if (this.pinecone.isEnabled()) {
      try {
        const ids = await this.pinecone.search(agentId, query, limit);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const rows = db.prepare(
            `SELECT * FROM memories WHERE id IN (${placeholders})`
          ).all(...ids) as Memory[];

          const rowMap = new Map(rows.map((row) => [row.id, row]));
          return ids.map((id) => rowMap.get(id)).filter(Boolean) as Memory[];
        }
      } catch (error) {
        console.error('[Pinecone] Search failed, falling back to keyword search:', error);
      }
    }

    return db.prepare(`
      SELECT * FROM memories 
      WHERE agent_id = ? AND content LIKE ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).all(agentId, `%${query}%`, limit) as Memory[];
  }

  private refreshHotCache(agentId: string): void {
    const db = getDb();
    // Updates agents.hot_memory with last 3 hot memories
    const lastHot = db.prepare(`
      SELECT content FROM memories 
      WHERE agent_id = ? AND tier = 'hot' 
      ORDER BY created_at DESC LIMIT 3
    `).all(agentId) as { content: string }[];
    
    const hotSummary = lastHot.map(m => `- ${m.content}`).join('\n');
    db.prepare('UPDATE agents SET hot_memory = ? WHERE id = ?').run(hotSummary, agentId);
  }
}
