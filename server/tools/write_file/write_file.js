const executor = require('../executor');
const security = require('../security');

async function execute(args, context = {}) {
  const { path: filePath, content, append = false, description = '' } = args;

  console.log(`[write_file tool] Writing to: ${filePath}`);

  try {
    let convertedPath = security.convertWindowsPath(filePath);
    if (convertedPath !== filePath) {
      console.log(`[write_file tool] Converted Windows path: ${filePath} -> ${convertedPath}`);
    }
    security.validatePath(convertedPath);
    const result = executor.writeFile(convertedPath, content, { append });
    if (result.success && result.message) {
      result.message = `文件创建成功：${filePath}`;
    }
    return result;
  } catch (error) {
    console.error(`[write_file tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
