import fetch from 'node-fetch';
import { getDb } from '../db/index.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
}

export class WebSearchEngine {
  private async getApiKey(key: string): Promise<string> {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || process.env[key.toUpperCase()] || '';
  }

  async search(query: string, numResults = 5): Promise<SearchResult[]> {
    const db = getDb();
    const providerRow = db.prepare('SELECT value FROM settings WHERE key = "search_provider"').get() as { value: string } | undefined;
    const provider = providerRow?.value || 'duckduckgo';

    switch (provider) {
      case 'brave':
        return this.searchBrave(query);
      case 'google':
        return this.searchGoogle(query);
      case 'tavily':
        return this.searchTavily(query);
      default:
        return this.searchDuckDuckGo(query);
    }
  }

  async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const results: SearchResult[] = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || 'Abstract',
        url: data.AbstractURL || '',
        snippet: data.AbstractText
      });
    }

    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text) {
          results.push({
            title: topic.FirstURL?.split('/').pop() || 'Related',
            url: topic.FirstURL || '',
            snippet: topic.Text
          });
        }
      });
    }

    return results;
  }

  async searchBrave(query: string): Promise<SearchResult[]> {
    const apiKey = await this.getApiKey('brave_search_api_key');
    if (!apiKey) return this.searchDuckDuckGo(query);

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' }
    });

    if (!response.ok) return [];
    const data = await response.json() as any;
    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));
  }

  async searchGoogle(query: string): Promise<SearchResult[]> {
    const apiKey = await this.getApiKey('google_search_api_key');
    const cx = await this.getApiKey('google_search_cx');
    if (!apiKey || !cx) return this.searchDuckDuckGo(query);

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    }));
  }

  async searchTavily(query: string): Promise<SearchResult[]> {
    const apiKey = await this.getApiKey('tavily_api_key');
    if (!apiKey) return this.searchDuckDuckGo(query);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic' })
    });

    if (!response.ok) return [];
    const data = await response.json() as any;
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      published_date: r.published_date
    }));
  }
}
