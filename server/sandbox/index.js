const executor = require('./executor');
const security = require('./security');
const tools = require('./tools');

module.exports = {
  bashTool: tools.execute,
  pythonTool: tools.executePythonCode,
  lsTool: tools.listDir,
  readFileTool: tools.read,
  writeFileTool: tools.write,
  strReplaceTool: tools.strReplace,
  executeCommand: executor.executeCommand,
  executePython: executor.executePython,
  listDirectory: executor.listDirectory,
  readFile: executor.readFile,
  writeFile: executor.writeFile,
  strReplace: executor.strReplace,
  validatePath: security.validatePath,
  validateBashCommand: security.validateBashCommand,
  validateFileExtension: security.validateFileExtension,
  sanitizeError: security.sanitizeError,
  isLocalPath: security.isLocalPath,
  getAllowedRoots: security.getAllowedRoots,
  isPathAllowed: security.isPathAllowed,
  checkCommandSafety: security.checkCommandSafety,
  VIRTUAL_PATH_PREFIX: executor.VIRTUAL_PATH_PREFIX,
  WORKSPACE_DIR: executor.WORKSPACE_DIR,
  UPLOADS_DIR: executor.UPLOADS_DIR,
  OUTPUTS_DIR: executor.OUTPUTS_DIR,
  ALLOWED_SYSTEM_PATHS: security.ALLOWED_SYSTEM_PATHS,
  ALLOWED_EXTENSIONS: security.ALLOWED_EXTENSIONS
};
