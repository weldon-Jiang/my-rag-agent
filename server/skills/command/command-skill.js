class CommandSkill {
  constructor(options = {}) {
    this.name = options.name || 'command-skill';
    this.description = '命令处理 - 处理系统命令如清空历史、重置会话、帮助等';
    this.version = '1.0.0';
    this.supportedTypes = [];
    this.commands = {
      clear: {
        keywords: ['清空', '清除', '清一下', '清理', '重置历史', '删除历史'],
        description: '清空对话历史',
        response: '已清空对话历史，我们可以开始新的对话了。'
      },
      reset: {
        keywords: ['重新开始', '重启', '重置', '新对话', '新会话'],
        description: '重置整个会话',
        response: '已重置会话，所有上下文已清除。'
      },
      help: {
        keywords: ['帮助', 'help', '怎么用', '如何使用', '说明', '功能'],
        description: '显示帮助信息',
        response: null
      },
      exit: {
        keywords: ['退出', 'exit', '关闭', '再见', '拜拜'],
        description: '退出当前对话',
        response: '再见！有需要随时召唤我。'
      }
    };
  }

  async process(query, context = {}) {
    const command = this.detectCommand(query);
    if (!command) {
      return null;
    }

    return {
      type: 'command',
      command: command.type,
      response: command.response,
      needClearHistory: command.type === 'clear' || command.type === 'reset',
      needEndSession: command.type === 'exit'
    };
  }

  detectCommand(query) {
    if (!query) return null;
    const lowerQuery = query.toLowerCase();

    for (const [cmdType, cmdInfo] of Object.entries(this.commands)) {
      for (const keyword of cmdInfo.keywords) {
        if (lowerQuery.includes(keyword)) {
          return {
            type: cmdType,
            response: cmdInfo.response
          };
        }
      }
    }
    return null;
  }

  getHelpInfo() {
    return {
      name: this.name,
      commands: Object.entries(this.commands).map(([type, info]) => ({
        type,
        description: info.description,
        keywords: info.keywords
      }))
    };
  }
}

module.exports = CommandSkill;