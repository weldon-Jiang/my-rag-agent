const BaseSkill = require('./base-skill');
const axios = require('axios');

class WebSearchSkill extends BaseSkill {
  constructor(options = {}) {
    super({
      name: 'web-search-skill',
      description: '网页搜索技能 - 通过搜索引擎获取互联网上的信息',
      version: '1.0.0',
      supportedTypes: [],
      ...options,
    });

    this.maxResults = options.maxResults || 10;
    this.timeout = options.timeout || 30000;
  }

  async search(query, options = {}) {
    try {
      const maxResults = options.maxResults || this.maxResults;

      const searchResults = await this.performSearch(query, maxResults);

      return {
        success: true,
        skill: this.name,
        query: query,
        results: searchResults,
        count: searchResults.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`${this.name} 搜索失败:`, error);
      return {
        success: false,
        error: error.message,
        skill: this.name,
      };
    }
  }

  async performSearch(query, maxResults) {
    const results = [];

    try {
      const duckDuckGoUrl = 'https://html.duckduckgo.com/html/';
      const response = await axios.get(duckDuckGoUrl, {
        params: { q: query },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const html = response.data;
      const titleRegex = /<a class="result__a" href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      const snippetRegex = /<a class="result__snippet"[^>]*>([^<]*)<\/a>/g;

      let titleMatch;
      let snippetMatch;
      let index = 0;

      while ((titleMatch = titleRegex.exec(html)) !== null && index < maxResults) {
        const url = titleMatch[1];
        const title = this.stripHtml(titleMatch[2]);

        let snippet = '';
        if (snippetRegex.exec(html) !== null) {
          snippet = this.stripHtml(snippetMatch ? snippetMatch[1] : '');
        }

        results.push({
          title: title,
          url: url,
          snippet: snippet || '',
        });
        index++;
      }
    } catch (error) {
      console.error('DuckDuckGo搜索失败:', error.message);
    }

    if (results.length === 0) {
      try {
        const fallbackUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        results.push({
          title: '搜索建议',
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: '无法直接获取搜索结果，请访问Google搜索链接查看',
        });
      } catch (e) {
        console.error('备用搜索失败:', e.message);
      }
    }

    return results;
  }

  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async process(file, context = {}) {
    return {
      success: false,
      error: 'WebSearchSkill 不支持文件处理，请使用 search 方法',
    };
  }
}

module.exports = WebSearchSkill;
