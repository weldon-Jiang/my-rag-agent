const BaseSkill = require('../base-skill');
const windowsSystem = require('./windows-system');

class WindowsSystemSkill extends BaseSkill {
  constructor(options = {}) {
    super({
      name: 'windows-system-skill',
      description: 'Windows系统操作技能 - 提供磁盘管理、文件操作、系统信息查询等功能。敏感操作需要用户确认，格式化磁盘等危险操作禁止执行。',
      version: '1.0.0',
      supportedTypes: [],
      ...options
    });
  }

  supports(extension) {
    return false;
  }

  async process(input, context = {}) {
    const { command, operation } = input;

    if (!command && !operation) {
      return {
        success: false,
        error: '请提供要执行的命令或操作类型'
      };
    }

    if (operation === 'disks') {
      return await windowsSystem.getDiskList();
    }

    if (operation === 'disk_info') {
      return await windowsSystem.getDiskInfo();
    }

    if (operation === 'system_info') {
      return await windowsSystem.getSystemInfo();
    }

    if (command) {
      const forbidden = windowsSystem.checkForbiddenOperation(command);
      if (forbidden.forbidden) {
        return {
          success: false,
          forbidden: true,
          action: forbidden.action,
          message: forbidden.reason
        };
      }

      const sensitive = windowsSystem.checkSensitiveOperation(command);
      if (sensitive.sensitive && sensitive.requireAdmin) {
        return {
          success: false,
          requiresConfirmation: true,
          sensitive: true,
          action: sensitive.action,
          message: `即将执行「${sensitive.action}」，这可能需要管理员权限。是否继续？`
        };
      }

      const result = await windowsSystem.executeCommand(command);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode
      };
    }

    return {
      success: false,
      error: '未知的操作类型'
    };
  }

  async checkAndExecute(command, confirmed = false) {
    const forbidden = windowsSystem.checkForbiddenOperation(command);
    if (forbidden.forbidden) {
      return {
        success: false,
        forbidden: true,
        action: forbidden.action,
        message: forbidden.reason
      };
    }

    const sensitive = windowsSystem.checkSensitiveOperation(command);
    if (sensitive.sensitive && sensitive.requireAdmin && !confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        sensitive: true,
        action: sensitive.action,
        message: `即将执行「${sensitive.action}」，这可能需要管理员权限。是否继续？`
      };
    }

    return await windowsSystem.executeCommand(command);
  }
}

module.exports = WindowsSystemSkill;


