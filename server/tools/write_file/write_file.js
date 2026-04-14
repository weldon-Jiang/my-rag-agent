const executor = require('../executor');
const security = require('../security');

async function execute(args, context = {}) {
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

module.exports = { execute };
