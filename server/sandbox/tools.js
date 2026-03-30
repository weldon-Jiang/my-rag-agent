const executor = require('./executor');
const security = require('./security');

const { validateBashCommand, checkCommandSafety } = security;

async function execute(args, context = {}) {
  const { command, description = '' } = args;
  
  console.log(`[bash tool] Executing: ${command}`);
  
  try {
    validateBashCommand(command);
    
    const safetyCheck = checkCommandSafety(command);
    if (!safetyCheck.safe) {
      return {
        success: false,
        error: `Command safety check failed: ${safetyCheck.issues.join(', ')}`
      };
    }
    
    const result = await executor.executeCommand(command, { description });
    
    return {
      success: result.success,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    console.error(`[bash tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function executePythonCode(args, context = {}) {
  const { code, description = '' } = args;
  
  console.log(`[python tool] Executing Python code`);
  
  try {
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'Python code is required'
      };
    }
    
    const result = await executor.executePython(code, { description });
    
    return {
      success: result.success,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode,
      duration: result.duration
    };
  } catch (error) {
    console.error(`[python tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function listDir(args, context = {}) {
  const { path: dirPath, description = '' } = args;
  
  console.log(`[ls tool] Listing directory: ${dirPath}`);
  
  try {
    const result = executor.listDirectory(dirPath);
    return result;
  } catch (error) {
    console.error(`[ls tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function read(args, context = {}) {
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
    return {
      success: false,
      error: error.message
    };
  }
}

async function write(args, context = {}) {
  const { path: filePath, content, append = false, description = '' } = args;
  
  console.log(`[write_file tool] Writing to: ${filePath}`);
  
  try {
    security.validatePath(filePath);
    
    const result = executor.writeFile(filePath, content, { append });
    
    return result;
  } catch (error) {
    console.error(`[write_file tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function strReplace(args, context = {}) {
  const { path: filePath, old_str: oldStr, new_str: newStr, replace_all: replaceAll = false, description = '' } = args;
  
  console.log(`[str_replace tool] Replacing in: ${filePath}`);
  
  try {
    security.validatePath(filePath);
    
    const result = executor.strReplace(filePath, oldStr, newStr, { replaceAll });
    
    return result;
  } catch (error) {
    console.error(`[str_replace tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
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
