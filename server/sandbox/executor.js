const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const security = require('./security');

const VIRTUAL_PATH_PREFIX = '/mnt/user-data';
const WORKSPACE_DIR = path.join(__dirname, '../../workspace');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OUTPUTS_DIR = path.join(__dirname, '../../outputs');

const VIRTUAL_TO_ACTUAL = {
  '/mnt/user-data': path.join(__dirname, '../../data'),
  '/mnt/user-data/workspace': WORKSPACE_DIR,
  '/mnt/user-data/uploads': UPLOADS_DIR,
  '/mnt/user-data/outputs': OUTPUTS_DIR,
};

const ACTUAL_TO_VIRTUAL = {
  [path.join(__dirname, '../../data')]: '/mnt/user-data',
  [WORKSPACE_DIR]: '/mnt/user-data/workspace',
  [UPLOADS_DIR]: '/mnt/user-data/uploads',
  [OUTPUTS_DIR]: '/mnt/user-data/outputs',
};

function ensureDirectories() {
  [WORKSPACE_DIR, UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function replaceVirtualPath(command, threadData = null) {
  let result = command;
  const isWindows = process.platform === 'win32';
  
  for (const [virtual, actual] of Object.entries(VIRTUAL_TO_ACTUAL)) {
    if (isWindows) {
      const virtualEscaped = virtual.replace(/\//g, '\\\\');
      if (result.includes(virtual) || result.includes(virtualEscaped)) {
        result = result.split(virtual).join(actual).split(virtualEscaped).join(actual);
      }
    } else {
      if (result.includes(virtual)) {
        result = result.replace(new RegExp(virtual.replace('/', '\\/'), 'g'), actual);
      }
    }
  }
  return result;
}

async function executeCommand(command, options = {}) {
  const { timeout = 60000, description = '', skipPathReplace = false } = options;

  try {
    const validatedCommand = security.validateBashCommand(command);
    const actualCommand = skipPathReplace ? validatedCommand : replaceVirtualPath(validatedCommand);

    console.log(`[Bash Executor] Executing: ${actualCommand}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArgs = process.platform === 'win32' ? ['/c', actualCommand] : ['-c', actualCommand];

      const proc = spawn(shell, shellArgs, {
        cwd: WORKSPACE_DIR,
        env: { ...process.env },
        timeout
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Command execution error: ${error.message}`));
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        console.log(`[Bash Executor] Command finished with code ${code} in ${duration}ms`);

        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration,
          command: validatedCommand
        });
      });

      proc.on('timeout', () => {
        proc.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      });

      setTimeout(() => {
        if (!proc.killed) {
          proc.kill();
          reject(new Error(`Command timeout after ${timeout}ms`));
        }
      }, timeout);
    });
  } catch (error) {
    console.error(`[Bash Executor] Error: ${error.message}`);
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: error.message,
      duration: 0,
      command
    };
  }
}

async function executePython(code, options = {}) {
  const { timeout = 60000, description = '' } = options;

  const tempFile = path.join(WORKSPACE_DIR, `temp_script_${Date.now()}.py`);

  try {
    fs.writeFileSync(tempFile, code, 'utf-8');
    
    const result = await executeCommand(`python "${tempFile}"`, { timeout, description, skipPathReplace: true });

    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      console.warn(`[Bash Executor] Failed to delete temp file: ${tempFile}`);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: error.message,
      duration: 0,
      command: 'python'
    };
  }
}

function listDirectory(dirPath, options = {}) {
  const { maxDepth = 2 } = options;

  try {
    const validatedPath = security.validatePath(dirPath);
    const actualPath = replaceVirtualPath(validatedPath);

    if (!fs.existsSync(actualPath)) {
      return { success: false, error: `Directory not found: ${dirPath}` };
    }

    const stats = fs.statSync(actualPath);
    if (!stats.isDirectory()) {
      return { success: false, error: `Path is not a directory: ${dirPath}` };
    }

    function formatTree(dir, prefix = '', depth = 0) {
      if (depth >= maxDepth) {
        if (depth === maxDepth) {
          return [prefix + '...'];
        }
        return [];
      }

      const items = fs.readdirSync(dir);
      const dirs = [];
      const files = [];

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          dirs.push(item);
        } else {
          files.push(item);
        }
      });

      const result = [];

      dirs.sort().forEach((item, i) => {
        const isLast = i === dirs.length - 1 && files.length === 0;
        result.push(prefix + (isLast ? '└── ' : '├── ') + item + '/');
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result.push(...formatTree(path.join(dir, item), newPrefix, depth + 1));
      });

      files.sort().forEach((item, i) => {
        const isLast = i === files.length - 1;
        result.push(prefix + (isLast ? '└── ' : '├── ') + item);
      });

      return result;
    }

    const tree = formatTree(actualPath);
    return {
      success: true,
      path: validatedPath,
      content: tree.join('\n')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function readFile(filePath, options = {}) {
  const { startLine, endLine } = options;

  try {
    const validatedPath = security.validatePath(filePath);
    const actualPath = replaceVirtualPath(validatedPath);

    if (!fs.existsSync(actualPath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const stats = fs.statSync(actualPath);
    if (stats.isDirectory()) {
      return { success: false, error: `Path is a directory: ${filePath}` };
    }

    let content = fs.readFileSync(actualPath, 'utf-8');

    if (startLine !== undefined && endLine !== undefined) {
      const lines = content.split('\n');
      content = lines.slice(startLine - 1, endLine).join('\n');
    }

    return {
      success: true,
      path: validatedPath,
      content,
      size: stats.size
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function writeFile(filePath, content, options = {}) {
  const { append = false } = options;

  try {
    const validatedPath = security.validatePath(filePath);
    const actualPath = replaceVirtualPath(validatedPath);

    const dir = path.dirname(actualPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (append) {
      fs.appendFileSync(actualPath, content, 'utf-8');
    } else {
      fs.writeFileSync(actualPath, content, 'utf-8');
    }

    return {
      success: true,
      path: validatedPath,
      message: append ? 'Content appended' : 'File written'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function strReplace(filePath, oldStr, newStr, options = {}) {
  const { replaceAll = false } = options;

  try {
    const validatedPath = security.validatePath(filePath);
    const actualPath = replaceVirtualPath(validatedPath);

    if (!fs.existsSync(actualPath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    let content = fs.readFileSync(actualPath, 'utf-8');

    const occurrences = replaceAll
      ? content.split(oldStr).length - 1
      : (content.includes(oldStr) ? 1 : 0);

    if (occurrences === 0) {
      return { success: false, error: `String not found in file: ${oldStr}` };
    }

    if (replaceAll) {
      content = content.split(oldStr).join(newStr);
    } else {
      content = content.replace(oldStr, newStr);
    }

    fs.writeFileSync(actualPath, content, 'utf-8');

    return {
      success: true,
      path: validatedPath,
      replacements: occurrences,
      message: `Replaced ${occurrences} occurrence(s)`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

ensureDirectories();

module.exports = {
  executeCommand,
  executePython,
  listDirectory,
  readFile,
  writeFile,
  strReplace,
  VIRTUAL_PATH_PREFIX,
  WORKSPACE_DIR,
  UPLOADS_DIR,
  OUTPUTS_DIR
};
