const path = require('path');
const fs = require('fs');

class SkillsManager {
  constructor() {
    this.skills = new Map();
    this.manifest = new Map();
    this.skillMarkdownCache = new Map();
  }

  registerManifest(name, config) {
    this.manifest.set(name, {
      name,
      description: config.description || '',
      trigger: config.trigger || [],
      parameters: config.parameters || {},
      requiredParams: config.requiredParams || [],
      file: config.file,
      supportedTypes: config.supportedTypes || [],
      skillDir: path.dirname(config.file)
    });
  }

  loadFromManifest() {
    for (const [name, config] of this.manifest.entries()) {
      try {
        const SkillClass = require(config.file);
        const skill = new SkillClass();
        this.skills.set(name, { instance: skill, config });
      } catch (err) {
        console.error(`[SkillsManager] Failed to load skill ${name}:`, err.message);
      }
    }
  }

  get(name) {
    const entry = this.skills.get(name);
    return entry ? entry.instance : null;
  }

  getConfig(name) {
    const entry = this.skills.get(name);
    return entry ? entry.config : null;
  }

  getAll() {
    return Array.from(this.skills.values()).map(entry => ({
      name: entry.config.name,
      description: entry.config.description,
      trigger: entry.config.trigger,
      usage: entry.config.usage || entry.config.description,
      supportedTypes: entry.config.supportedTypes,
      tools: entry.config.tools || []
    }));
  }

  getSkillDir(name) {
    const config = this.getConfig(name);
    return config ? config.skillDir : null;
  }

  getSkillMarkdownPath(name) {
    const skillDir = this.getSkillDir(name);
    if (!skillDir) return null;
    return path.join(skillDir, 'SKILL.md');
  }

  loadSkillMarkdown(name) {
    if (this.skillMarkdownCache.has(name)) {
      return this.skillMarkdownCache.get(name);
    }

    const markdownPath = this.getSkillMarkdownPath(name);
    if (!markdownPath || !fs.existsSync(markdownPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(markdownPath, 'utf-8');
      this.skillMarkdownCache.set(name, content);
      return content;
    } catch (err) {
      console.error(`[SkillsManager] Failed to load SKILL.md for ${name}:`, err.message);
      return null;
    }
  }

  parseSkillMarkdown(content) {
    if (!content) return null;

    const result = {
      name: '',
      description: '',
      trigger: [],
      triggers: [],
      scenarios: [],
      workflow: [],
      notes: []
    };

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const body = frontmatterMatch[2];

      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      if (nameMatch) result.name = nameMatch[1].trim();

      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) result.description = descMatch[1].trim();

      const triggerMatch = frontmatter.match(/trigger:\s*\n((?:\s*-\s*.+\n)*)/);
      if (triggerMatch) {
        result.trigger = triggerMatch[1].split('\n').map(t => t.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
      }

      const triggersMatch = frontmatter.match(/triggers:\s*\n((?:\s*-\s*.+\n)*)/);
      if (triggersMatch) {
        result.triggers = triggersMatch[1].split('\n').map(t => t.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
      }

      const h2Match = body.match(/##\s+使用场景\n([\s\S]*?)(?=##|\$)/);
      if (h2Match) {
        result.scenarios = h2Match[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^\s*-\s*/, '').trim());
      }

      const workflowMatch = body.match(/##\s+工作流程\n([\s\S]*?)(?=##|\$)/);
      if (workflowMatch) {
        result.workflow = workflowMatch[1].split('\n').filter(line => /^\d+\./.test(line.trim())).map(line => line.replace(/^\d+\.\s*/, '').trim());
      }

      const notesMatch = body.match(/##\s+注意事项\n([\s\S]*?)(?=##|\$)/);
      if (notesMatch) {
        result.notes = notesMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^\s*-\s*/, '').trim());
      }
    }

    return result;
  }

  getSkillSummary(name) {
    const parsed = this.parseSkillMarkdown(this.loadSkillMarkdown(name));
    if (!parsed) {
      const config = this.getConfig(name);
      return config ? { name: config.name, description: config.description } : null;
    }

    return {
      name: parsed.name || name,
      description: parsed.description,
      trigger: parsed.trigger,
      triggers: parsed.triggers
    };
  }

  getFullSkillContent(name) {
    return this.loadSkillMarkdown(name);
  }

  getAllSkillSummaries() {
    const summaries = [];
    for (const name of this.skills.keys()) {
      const summary = this.getSkillSummary(name);
      if (summary) {
        summaries.push(summary);
      }
    }
    return summaries;
  }

  findByTrigger(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [name, entry] of this.skills.entries()) {
      const triggers = entry.config.trigger || [];
      for (const trigger of triggers) {
        if (lowerQuery.includes(trigger.toLowerCase())) {
          results.push({ name, skill: entry.instance, config: entry.config });
          break;
        }
      }
    }
    return results;
  }

  findByExtension(extension) {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;

    for (const [name, entry] of this.skills.entries()) {
      const types = entry.config.supportedTypes || [];
      if (types.includes(ext) || types.includes(ext.toLowerCase())) {
        return { name, skill: entry.instance, config: entry.config };
      }
    }
    return null;
  }

  clearCache() {
    this.skillMarkdownCache.clear();
  }
}

module.exports = SkillsManager;
