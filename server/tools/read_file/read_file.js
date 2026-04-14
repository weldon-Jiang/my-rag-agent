const executor = require('../executor');
const security = require('../security');

async function execute(args, context = {}) {
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

module.exports = { execute };
