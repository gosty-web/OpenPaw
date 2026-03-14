import { getDb } from '../db/index.js';
import OpenAI from 'openai';

type PineconeIndex = {
  query: (args: any) => Promise<any>;
  upsert: (args: any) => Promise<any>;
};

export class PineconeStore {
  private client: any;
  private index: PineconeIndex | null = null;
  private indexName = 'openpaw-memories';
  private initialized = false;
  private initializing: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      const apiKey = this.getSetting('pinecone_api_key') || process.env.PINECONE_API_KEY;
      if (!apiKey) {
        this.initializing = null;
        return;
      }

      const { Pinecone } = await import('@pinecone-database/pinecone');
      this.client = new Pinecone({ apiKey });

      const configuredIndex = this.getSetting('pinecone_index') || process.env.PINECONE_INDEX;
      if (configuredIndex) this.indexName = configuredIndex;

      await this.ensureIndexExists();
      this.index = this.client.index(this.indexName);
      this.initialized = true;
    })();

    return this.initializing;
  }

  isEnabled(): boolean {
    return Boolean(this.index);
  }

  async embed(text: string): Promise<number[]> {
    const openaiKey = this.getSetting('openai_api_key') || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });
        const embedding = response.data?.[0]?.embedding;
        if (embedding?.length) return embedding;
      } catch {
        // Fall through to other options
      }
    }

    const groqKey = this.getSetting('groq_api_key') || process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const client = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
        const response = await client.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });
        const embedding = response.data?.[0]?.embedding;
        if (embedding?.length) return embedding;
      } catch {
        // Fall through to local embedding
      }
    }

    return this.hashingEmbedding(text, 1536);
  }

  async upsert(agentId: string, memoryId: string, content: string, metadata: object): Promise<void> {
    await this.initialize();
    if (!this.index) return;

    const vector = await this.embed(content);
    await this.index.upsert({
      namespace: agentId,
      vectors: [
        {
          id: memoryId,
          values: vector,
          metadata,
        },
      ],
    });
  }

  async search(agentId: string, query: string, topK = 5): Promise<string[]> {
    await this.initialize();
    if (!this.index) return [];

    const vector = await this.embed(query);
    const response = await this.index.query({
      namespace: agentId,
      vector,
      topK,
      includeMetadata: true,
    });

    const matches = response?.matches ?? [];
    return matches.map((match: any) => match.id).filter(Boolean);
  }

  private getSetting(key: string): string | undefined {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const result = await this.client.listIndexes();
      const names = Array.isArray(result)
        ? result
        : Array.isArray(result?.indexes)
          ? result.indexes.map((index: any) => index.name ?? index)
          : [];

      if (names.includes(this.indexName)) return;

      const environment = this.getSetting('pinecone_environment') || process.env.PINECONE_ENVIRONMENT;

      try {
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1536,
          metric: 'cosine',
          spec: environment
            ? { pod: { environment, podType: 'p1.x1' } }
            : { serverless: { cloud: 'aws', region: 'us-east-1' } },
        });
      } catch {
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1536,
          metric: 'cosine',
        });
      }
    } catch (error) {
      console.error('[Pinecone] Failed to ensure index exists:', error);
    }
  }

  private hashingEmbedding(text: string, dimensions: number): number[] {
    const vector = new Array(dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const token of tokens) {
      const index = this.simpleHash(token) % dimensions;
      vector[index] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / norm);
  }

  private simpleHash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
