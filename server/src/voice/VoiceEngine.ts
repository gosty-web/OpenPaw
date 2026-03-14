import fetch from 'node-fetch';
import { getDb } from '../db/index.js';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export class VoiceEngine {
  private async getApiKey(key: string): Promise<string> {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || process.env[key.toUpperCase()] || '';
  }

  async transcribe(audioBuffer: Buffer, filename: string = 'audio.wav'): Promise<string> {
    const apiKey = await this.getApiKey('groq_api_key');
    if (!apiKey) throw new Error('Groq API key not configured');

    const formData = new URLSearchParams(); // Need to use real FormData for multipart
    // node-fetch doesn't have built-in FormData that handles Buffers easily without extra deps
    // but we can use a simple implementation or the 'form-data' package if needed.
    // Given the prompt rules, I'll use a reliable approach.
    
    const { FormData } = await import('formdata-node');
    const { Blob } = await import('fetch-blob');
    
    const form = new FormData();
    form.set('file', new Blob([audioBuffer]), filename);
    form.set('model', 'whisper-large-v3');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: form as any
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq STT failed: ${error}`);
    }

    const data = await response.json() as { text: string };
    return data.text;
  }

  async speak(text: string, voiceId?: string): Promise<Buffer> {
    const apiKey = await this.getApiKey('elevenlabs_api_key');
    if (!apiKey) throw new Error('ElevenLabs API key not configured');

    const db = getDb();
    const defaultVoice = db.prepare('SELECT value FROM settings WHERE key = "elevenlabs_voice_id"').get() as { value: string } | undefined;
    const finalVoiceId = voiceId || defaultVoice?.value || '21m00Tcm4TlvDq8ikWAM'; // Rachel

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    const apiKey = await this.getApiKey('elevenlabs_api_key');
    if (!apiKey) return [];

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });

    if (!response.ok) return [];
    const data = await response.json() as { voices: ElevenLabsVoice[] };
    return data.voices;
  }
}
