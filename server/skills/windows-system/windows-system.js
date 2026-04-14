const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORBIDDEN_OPERATIONS = [
  { pattern: /format\s+[a-z]:/i, action: '格式化磁盘', reason: '格式化磁盘会清除所有数据，智能体不能执行此操作' },
  { pattern: /diskpart/i, action: '磁盘分区操作', reason: '磁盘分区操作可能导致数据丢失，智能体不能执行此操作' },
  { pattern: /fdisk/i, action: '磁盘分区', reason: '磁盘分区操作可能导致数据丢失，智能体不能执行此操作' },
];

const SENSITIVE_PATTERNS = [
  { pattern: /del\s+.*system32/i, action: '删除系统文件', requireAdmin: true },
  { pattern: /rd\s+.*system32/i, action: '删除系统目录', requireAdmin: true },
  { pattern: /rmdir\s+.*system32/i, action: '删除系统目录', requireAdmin: true },
  { pattern: /reg\s+(add|delete|import)/i, action: '修改注册表', requireAdmin: true },
  { pattern: /sc\s+(create|delete|stop|start)/i, action: '修改系统服务', requireAdmin: true },
  { pattern: /net\s+(user|localgroup)/i, action: '管理用户账户', requireAdmin: true },
  { pattern: /disable.*firewall/i, action: '关闭防火墙', requireAdmin: true },
  { pattern: /shutdown/i, action: '关闭/重启系统', requireAdmin: true },
];

const VIRTUAL_PATH_MAP = {
  '/mnt/user-data/workspace': 'D:\\user-data\\workspace',
  '/mnt/user-data/uploads': 'D:\\user-data\\uploads',
};

class WindowsSystem {
  constructor() {
    this.name = 'windows-system';
  }

  normalizePath(virtualPath) {
    for (const [virtual, real] of Object.entries(VIRTUAL_PATH_MAP)) {
      if (virtualPath.startsWith(virtual)) {
        return virtualPath.replace(virtual, real);
      }
    }
    return virtualPath;
  }

  isForbidden(command) {
    return FORBIDDEN_OPERATIONS.some(op => op.pattern.test(command));
  }

  isSensitive(command) {
    return SENSITIVE_PATTERNS.some(op => op.pattern.test(command));
  }

  async execute(command, context = {}) {
    if (this.isForbidden(command)) {
      const op = FORBIDDEN_OPERATIONS.find(op => op.pattern.test(command));
      return {
        success: false,
        error: op.reason
      };
    }

    const normalizedCommand = this.normalizePath(command);

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/bash';
      const shellArg = isWindows ? '/c' : '-c';

      const child = spawn(shell, [shellArg, normalizedCommand], {
        cwd: context.cwd || os.tmpdir(),
        env: { ...process.env },
        timeout: 30000
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout, code });
        } else {
          resolve({ success: false, output: stdout, error: stderr || `命令执行失败，退出码: ${code}`, code });
        }
      });

      child.on('timeout', () => {
        child.kill();
        resolve({ success: false, error: '命令执行超时' });
      });
    });
  }

  async listDir(dirPath, context = {}) {
    const normalizedPath = this.normalizePath(dirPath);

    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/bash';
      const shellArg = isWindows ? '/c' : '-c';

      const child = spawn(shell, [shellArg, 'dir /b /a "' + normalizedPath + '"'], {
        cwd: context.cwd || os.tmpdir(),
        timeout: 10000
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message, files: [] });
      });

      child.on('close', (code) => {
        if (code === 0 || stdout) {
          const files = stdout.split('\n').filter(line => line.trim()).map(line => {
            const isDir = line.endsWith('/') || line.endsWith('<DIR>');
            const name = line.replace(/\s+\<DIR\>/, '').trim();
            return { name, isDirectory: isDir };
          });
          resolve({ success: true, path: dirPath, files, raw: stdout });
        } else {
          resolve({ success: false, error: stderr || '无法列出目录', files: [] });
        }
      });
    });
  }

  async getDiskInfo() {
    return new Promise((resolve) => {
      const child = spawn('cmd.exe', ['/c', 'wmic logicaldisk get caption,size,freespace,drivetype /format:csv']);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const disks = lines.slice(1).map(line => {
            const parts = line.split(',');
            return {
              drive: parts[0]?.replace(':', ''),
              freeSpace: parseInt(parts[1]) || 0,
              size: parseInt(parts[2]) || 0,
              type: parts[3]
            };
          }).filter(d => d.size > 0);

          resolve({ success: true, disks });
        } else {
          resolve({ success: false, error: stderr || '无法获取磁盘信息' });
        }
      });
    });
  }

  async getSystemInfo() {
    return {
      success: true,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      hostname: os.hostname(),
      uptime: os.uptime()
    };
  }
}

module.exports = WindowsSystem;
