class BaseSkill {
  constructor(options = {}) {
    this.name = options.name || 'base-skill';
    this.description = options.description || '';
    this.version = options.version || '1.0.0';
    this.supportedTypes = options.supportedTypes || [];
  }

  supports(fileType) {
    return this.supportedTypes.includes(fileType);
  }

  async process(file, context = {}) {
    throw new Error(`${this.name} 技能未实现 process 方法`);
  }

  getInfo() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      supportedTypes: this.supportedTypes,
    };
  }
}

module.exports = BaseSkill;