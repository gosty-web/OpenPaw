import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { AgentManager } from '../agents/AgentManager.js';
import { AgentFileManager } from '../agents/files/AgentFileManager.js';
import { ModelRouter } from '../llm/ModelRouter.js';
import { VoiceEngine } from '../voice/VoiceEngine.js';
import OpenAI from 'openai';

export type LearningSkill = {
  id: string;
  name: string;
  description: string;
  category: 'Custom';
  tags: string[];
  sourceType: 'custom';
  sourceUrl?: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type LearningSessionState = {
  id: string;
  agentId: string;
  observations: string[];
  startedAt: string;
  lastFrameAt?: string;
};

const sessions = new Map<string, LearningSessionState>();

export class LearningSession {
  private agentManager = new AgentManager();
  private router = new ModelRouter();
  private voiceEngine = new VoiceEngine();

  async startSession(agentId: string): Promise<{ sessionId: string }> {
    const agent = this.agentManager.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const sessionId = uuidv4();
    sessions.set(sessionId, {
      id: sessionId,
      agentId,
      observations: [],
      startedAt: new Date().toISOString(),
    });

    return { sessionId };
  }

  async processFrame(sessionId: string, imageBase64: string, transcript?: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('Learning session not found');

    const description = await this.describeImage(imageBase64);
    const spoken = transcript?.trim() ? transcript.trim() : 'No narration provided.';
    const observation = `I see: ${description}. User said: ${spoken}`;

    session.observations.push(observation);
    session.lastFrameAt = new Date().toISOString();
  }

  async endSession(sessionId: string, attachToAgent: boolean = false): Promise<LearningSkill> {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('Learning session not found');

    const agent = this.agentManager.get(session.agentId);
    if (!agent) throw new Error('Agent not found');

    const observations = session.observations.length
      ? session.observations.map((entry, index) => `${index + 1}. ${entry}`).join('\n')
      : 'No observations captured.';

    const prompt = [
      'Based on this screen recording and narration, create a SKILL.md that teaches an AI agent how to perform this task step by step.',
      'Return only the SKILL.md content.',
      '',
      'Observations:',
      observations,
    ].join('\n');

    const response = await this.router.chat({
      provider: agent.provider as any,
      model: agent.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
    });

    const content = response.content.trim();
    const name = this.extractTitle(content) || `Learned Skill ${new Date().toISOString().slice(0, 10)}`;
    const description = this.extractDescription(content) || 'Generated from live learning session.';

    const db = getDb();
    const skillId = uuidv4();
    const now = new Date().toISOString();
    const sourceUrl = `learning://${sessionId}`;

    db.prepare(`
      INSERT INTO skills (
        id, name, description, category, tags_json, content_md, source_url, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      skillId,
      name,
      description,
      'Custom',
      JSON.stringify([]),
      content,
      sourceUrl,
      1,
      now,
      now
    );

    if (attachToAgent) {
      db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
        .run(agent.id, skillId);
    }

    await this.appendGrowthLog(agent.id, agent.name, {
      sessionId,
      skillName: name,
      skillId,
      observationCount: session.observations.length,
    });

    sessions.delete(sessionId);

    return {
      id: skillId,
      name,
      description,
      category: 'Custom',
      tags: [],
      sourceType: 'custom',
      sourceUrl,
      content,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async transcribeAudio(audioBase64: string, mimeType?: string): Promise<string> {
    const buffer = Buffer.from(audioBase64, 'base64');
    const extension = this.extensionFromMime(mimeType);
    const filename = `learning-audio.${extension}`;
    return await this.voiceEngine.transcribe(buffer, filename);
  }

  private async describeImage(imageBase64: string): Promise<string> {
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const apiKey = await this.getSetting('openai_api_key') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return 'Screenshot captured (vision model not configured)';
    }

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this screenshot in one short sentence focused on UI actions.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 120,
      });

      const description = response.choices?.[0]?.message?.content?.trim();
      return description || 'Screenshot captured.';
    } catch (error) {
      return 'Screenshot captured (vision description failed)';
    }
  }

  private async appendGrowthLog(
    agentId: string,
    agentName: string,
    summary: { sessionId: string; skillName: string; skillId: string; observationCount: number }
  ): Promise<void> {
    const fileManager = new AgentFileManager(agentId, agentName);
    let content = '';
    try {
      content = await fileManager.readFile('GROWTH.md');
    } catch {
      content = '';
    }

    const block = [
      '',
      `## Live Learning Session (${new Date().toISOString()})`,
      `- Session ID: ${summary.sessionId}`,
      `- Generated Skill: ${summary.skillName} (${summary.skillId})`,
      `- Observations: ${summary.observationCount}`,
      '',
    ].join('\n');

    await fileManager.writeFile('GROWTH.md', `${content}${block}`);
  }

  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  private extractDescription(content: string): string | null {
    const cleaned = content
      .replace(/^#.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    const line = cleaned.split('\n').find((entry) => entry.trim().length > 0);
    return line ? line.trim().slice(0, 180) : null;
  }

  private extensionFromMime(mimeType?: string): string {
    if (!mimeType) return 'webm';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  private async getSetting(key: string): Promise<string | undefined> {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }
}
