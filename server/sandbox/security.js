const path = require('path');

const VIRTUAL_PATH_PREFIX = '/mnt/user-data';
const ALLOWED_SYSTEM_PATHS = [
  '/bin/',
  '/usr/bin/',
  '/usr/sbin/',
  '/sbin/',
  '/opt/homebrew/bin/',
  '/dev/',
];

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'wget | sh',
  'curl | sh',
  'chown -R',
];

const ALLOWED_EXTENSIONS = [
  '.js', '.ts', '.py', '.json', '.txt', '.md', '.yml', '.yaml',
  '.html', '.css', '.xml', '.csv', '.log', '.sh', '.bat', '.ps1',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z'
];

function rejectPathTraversal(targetPath) {
  const normalized = targetPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  
  for (const segment of segments) {
    if (segment === '..') {
      throw new Error('Path traversal detected: .. is not allowed');
    }
  }
  
  return normalized;
}

function validatePath(targetPath) {
  if (!targetPath) {
    throw new Error('Path is required');
  }

  rejectPathTraversal(targetPath);

  if (!targetPath.startsWith(VIRTUAL_PATH_PREFIX) && 
      !targetPath.startsWith('/mnt/skills') &&
      !targetPath.startsWith('/mnt/acp-workspace')) {
    throw new Error(`Only paths under ${VIRTUAL_PATH_PREFIX}, /mnt/skills, or /mnt/acp-workspace are allowed`);
  }

  return targetPath;
}

function validateBashCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Command is required');
  }

  const trimmedCommand = command.trim();
  
  if (trimmedCommand.length === 0) {
    throw new Error('Command cannot be empty');
  }

  for (const dangerous of DANGEROUS_COMMANDS) {
    if (trimmedCommand.toLowerCase().includes(dangerous.toLowerCase())) {
      throw new Error(`Dangerous command detected: ${dangerous}`);
    }
  }

  if (trimmedCommand.startsWith('sudo') && trimmedCommand.includes('rm')) {
    throw new Error('sudo rm is not allowed');
  }

  if (trimmedCommand.includes('> /dev/sda') || 
      trimmedCommand.includes('> /dev/sdb') ||
      trimmedCommand.includes('of=/dev/')) {
    throw new Error('Direct disk write is not allowed');
  }

  return trimmedCommand;
}

function validateFileExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension ${ext} is not allowed`);
  }
  
  return true;
}

function sanitizeError(error) {
  let message = error.message || String(error);
  
  message = message.replace(/[a-zA-Z]:\\[\w\\]+\s/g, '[PATH]');
  message = message.replace(/\/home\/[\w]+\/[\w\/]+/g, '[PATH]');
  message = message.replace(/\/Users\/[\w]+\/[\w\/]+/g, '[PATH]');
  
  return message;
}

function isLocalPath(pathString) {
  return pathString.startsWith('C:') || 
         pathString.startsWith('D:') ||
         pathString.startsWith('/') ||
         pathString.startsWith('./') ||
         pathString.startsWith('../');
}

function getAllowedRoots() {
  return [
    '/mnt/user-data',
    '/mnt/user-data/workspace',
    '/mnt/user-data/uploads', 
    '/mnt/user-data/outputs',
    '/mnt/skills',
    '/mnt/skills/public',
    '/mnt/skills/custom',
    '/mnt/acp-workspace'
  ];
}

function isPathAllowed(targetPath) {
  try {
    validatePath(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}

function checkCommandSafety(command) {
  const issues = [];
  
  if (!command || command.trim().length === 0) {
    issues.push('Command is empty');
  }

  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('eval ') || lowerCommand.includes('exec ')) {
    issues.push('Contains potentially dangerous shell builtins');
  }

  if (lowerCommand.includes('&') && lowerCommand.includes(';')) {
    issues.push('Contains command chaining');
  }

  if (/\|\s*cat/.test(lowerCommand)) {
    issues.push('Contains pipe to cat');
  }

  if (/curl.*\|\s*sh/.test(lowerCommand) || /wget.*\|\s*sh/.test(lowerCommand)) {
    issues.push('Contains pipe to shell execution');
  }

  return {
    safe: issues.length === 0,
    issues
  };
}

module.exports = {
  validatePath,
  validateBashCommand,
  validateFileExtension,
  sanitizeError,
  isLocalPath,
  getAllowedRoots,
  isPathAllowed,
  checkCommandSafety,
  VIRTUAL_PATH_PREFIX,
  ALLOWED_SYSTEM_PATHS,
  ALLOWED_EXTENSIONS
};
