import { WebSearchEngine } from './src/search/WebSearchEngine.js';
import { BrowserEngine } from './src/browser/BrowserEngine.js';
import { VoiceEngine } from './src/voice/VoiceEngine.js';
import { getDb } from './src/db/index.js';

async function verify() {
  console.log('--- Phase 21 Verification ---');

  // 1. Search Verification (DuckDuckGo - Free)
  const search = new WebSearchEngine();
  console.log('Testing DuckDuckGo Search...');
  try {
    const results = await search.searchDuckDuckGo('OpenClaw AI');
    console.log(`DuckDuckGo Results: ${results.length} found.`);
    if (results.length > 0) console.log('Top Result:', results[0].title);
  } catch (err: any) {
    console.error('DuckDuckGo Failed:', err.message);
  }

  // 2. Browser Verification (Puppeteer)
  const browser = new BrowserEngine();
  console.log('\nTesting Puppeteer Browser Launch...');
  try {
    // We'll just test navigation to a simple page
    const content = await browser.navigate('test-agent', 'https://example.com');
    console.log('Browser Content Length:', content.length);
    if (content.includes('Example Domain')) {
      console.log('Browser Verification: SUCCESS');
    }
    await browser.close('test-agent');
  } catch (err: any) {
    console.error('Browser Failed:', err.message);
  }

  // 3. Voice Verification (API Check Only)
  const voice = new VoiceEngine();
  console.log('\nTesting Voice Engine (Voices List)...');
  try {
    const voices = await voice.getVoices();
    console.log(`Found ${voices.length} ElevenLabs voices (needs API key).`);
  } catch (err: any) {
    console.log('Voice API Check (Expected if no key):', err.message);
  }
}

verify().catch(console.error);
