const executor = require('./executor');
const security = require('./security');

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

async function executePythonCode(args, context = {}) {
  const { code, description = '' } = args;

  console.log(`[工具] python: ${code.substring(0, 30)}...`);

  try {
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Python code is required' };
    }

    const result = await executor.executePython(code, { description });

    return {
      success: result.success,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    console.error(`[工具] python 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function listDir(args, context = {}) {
  const { path: dirPath, description = '' } = args;

  console.log(`[工具] ls: ${dirPath}`);

  try {
    const result = executor.listDirectory(dirPath);
    return result;
  } catch (error) {
    console.error(`[工具] ls 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function read(args, context = {}) {
  let { path: filePath, start_line: startLine, end_line: endLine, description = '' } = args;

  console.log(`[工具] read: ${filePath}`);

  try {
    const convertedPath = security.convertWindowsPath(filePath);
    if (convertedPath !== filePath) {
      filePath = convertedPath;
    }

    security.validatePath(filePath);
    const result = executor.readFile(filePath, { startLine, endLine });
    return result;
  } catch (error) {
    console.error(`[工具] read 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function write(args, context = {}) {
  const { path: filePath, content, append = false, description = '' } = args;

  console.log(`[工具] write: ${filePath}`);

  try {
    let convertedPath = security.convertWindowsPath(filePath);
    security.validatePath(convertedPath);
    const result = executor.writeFile(convertedPath, content, { append });
    if (result.success && result.message) {
      result.message = `文件创建成功：${filePath}`;
    }
    return result;
  } catch (error) {
    console.error(`[工具] write 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function strReplace(args, context = {}) {
  const { path: filePath, old_str: oldStr, new_str: newStr, replace_all: replaceAll = false, description = '' } = args;

  console.log(`[工具] str_replace: ${filePath}`);

  try {
    let convertedPath = security.convertWindowsPath(filePath);
    security.validatePath(convertedPath);
    const result = executor.strReplace(convertedPath, oldStr, newStr, { replaceAll });
    if (result.success && result.message) {
      result.message = `文件修改成功：${filePath}`;
    }
    return result;
  } catch (error) {
    console.error(`[工具] str_replace 错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  execute,
  executePythonCode,
  listDir,
  read,
  write,
  strReplace
};
