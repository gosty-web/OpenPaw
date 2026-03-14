import { AgentManager } from './src/agents/AgentManager.js';
import { AgentEngine } from './src/agents/AgentEngine.js';
import { getDb } from './src/db/index.js';
import { ModelRouter } from './src/llm/ModelRouter.js';

async function verify() {
  console.log('--- OpenPaw AgentEngine Verification (Mocked LLM) ---');
  const db = getDb();
  
  // Clear agents/messages/settings for clean state
  db.prepare('DELETE FROM agents').run();
  db.prepare('DELETE FROM messages').run();
  db.prepare("DELETE FROM settings WHERE key = 'first_boot'").run();
  
  const manager = new AgentManager();
  console.log('Creating first agent...');
  const agentId = 'test-pilot-id';
  const agent = await manager.create({
    id: agentId,
    name: 'Test Pilot',
    role: 'Verification specialist',
    personality: 'precise and helpful',
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024
  });
  
  console.log('Agent created:', agent.id);
  
  // Check first_boot flag
  const firstBoot = db.prepare("SELECT value FROM settings WHERE key = 'first_boot'").get() as { value: string };
  console.log('First boot flag:', firstBoot?.value);
  
  const engine = new AgentEngine(agent.id);
  
  // Directly mock the router instance inside engine for this test
  (engine as any).router = {
    chat: async () => ({
      content: "Just came online 👋 who am I? Who are you? Let's figure this out.",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    })
  };

  console.log('Sending first message...');
  
  try {
    const result = await engine.chat('Hello');
    console.log('Response:', result.response);
    console.log('Session ID:', result.sessionId);
    
    // Check sessions
    const sessions = engine.getSessions();
    console.log('Sessions:', JSON.stringify(sessions, null, 2));
    
    if (result.sessionId === 'boot') {
      console.log('✅ PASS: First boot welcome triggered');
    } else {
      console.log('❌ FAIL: First boot welcome NOT triggered');
    }

    const messages = db.prepare('SELECT * FROM messages WHERE agent_id = ?').all(agent.id);
    console.log('Messages in DB:', messages.length);
    if (messages.length > 0) {
      console.log('✅ PASS: Messages saved to database');
    }

  } catch (err) {
    console.error('❌ ERROR during chat:', err);
  }
}

verify().catch(console.error);
