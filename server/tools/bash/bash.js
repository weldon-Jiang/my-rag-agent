const executor = require('../executor');
const security = require('../security');

const { validateBashCommand, checkCommandSafety } = security;

async function execute(args, context = {}) {
  const { command, description = '' } = args;

  console.log(`[工具] bash: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`);

  try {
    validateBashCommand(command);

    const safetyCheck = checkCommandSafety(command);
    if (!safetyCheck.safe) {
      return { success: false, error: `Command safety check failed: ${safetyCheck.issues.join(', ')}` };
    }

    const result = await executor.executeCommand(command, { description });

    const output = result.stdout || result.stderr;
    if (result.success && !output) {
      return {
        success: true,
        message: '命令执行成功',
        output: '',
        exitCode: result.exitCode,
        duration: result.duration
      };
    }

    return {
      success: result.success,
      output,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    console.error(`[工具] bash 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
