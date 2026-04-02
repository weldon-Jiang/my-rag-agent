const path = require('path');
const fs = require('fs');

class SkillsManager {
  constructor() {
    this.skills = new Map();
    this.manifest = new Map();
  }

  registerManifest(name, config) {
    this.manifest.set(name, {
      name,
      description: config.description || '',
      trigger: config.trigger || [],
      parameters: config.parameters || {},
      requiredParams: config.requiredParams || [],
      file: config.file,
      supportedTypes: config.supportedTypes || []
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
      supportedTypes: entry.config.supportedTypes,
      tools: entry.config.tools || []
    }));
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
}

module.exports = SkillsManager;
