const executor = require('../executor');
const security = require('../security');

async function execute(args, context = {}) {
  let { path: filePath, start_line: startLine, end_line: endLine, description = '' } = args;

  console.log(`[read_file tool] Reading file: ${filePath}`);

  try {
    const convertedPath = security.convertWindowsPath(filePath);
    if (convertedPath !== filePath) {
      console.log(`[read_file tool] Converted Windows path: ${filePath} -> ${convertedPath}`);
      filePath = convertedPath;
    }

    security.validatePath(filePath);
    const result = executor.readFile(filePath, { startLine, endLine });
    return result;
  } catch (error) {
    console.error(`[read_file tool] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { execute };
