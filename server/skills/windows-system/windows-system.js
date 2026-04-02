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
  { pattern: /bcdedit/i, action: '修改启动配置', requireAdmin: true },
  { pattern: /icacls.*system32/i, action: '修改系统权限', requireAdmin: true },
  { pattern: /takeown/i, action: '获取文件所有权', requireAdmin: true },
];

function checkForbiddenOperation(command) {
  for (const item of FORBIDDEN_OPERATIONS) {
    if (item.pattern.test(command)) {
      return { forbidden: true, action: item.action, reason: item.reason };
    }
  }
  return { forbidden: false };
}

function checkSensitiveOperation(command) {
  for (const item of SENSITIVE_PATTERNS) {
    if (item.pattern.test(command)) {
      return { sensitive: true, action: item.action, requireAdmin: item.requireAdmin };
    }
  }
  return { sensitive: false, requireAdmin: false };
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const child = spawn(shell, shellArgs, {
      windowsHide: true,
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

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr,
        exitCode: code
      });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function getDiskList() {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell', ['-Command', 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | ConvertTo-Json'], {
      windowsHide: true
    });

    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        try {
          const drives = JSON.parse(stdout);
          resolve({ success: true, drives: Array.isArray(drives) ? drives : [drives] });
        } catch (e) {
          resolve({ success: true, output: stdout });
        }
      } else {
        resolve({ success: false, error: '获取磁盘列表失败' });
      }
    });
    child.on('error', reject);
  });
}

async function getDiskInfo() {
  return new Promise((resolve) => {
    const child = spawn('wmic', ['/output:stdout', 'diskdrive', 'get', 'Model,Size,Status,MediaType', '/format:csv'], {
      windowsHide: true
    });

    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout || '磁盘信息查询完成',
        error: code !== 0 ? '查询失败' : null
      });
    });
    child.on('error', (err) => resolve({ success: false, error: err.message }));
  });
}

async function getSystemInfo() {
  return new Promise((resolve) => {
    const child = spawn('systeminfo', [], { windowsHide: true });

    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        const lines = stdout.split('\n').filter(l => l.trim());
        const info = {};
        lines.forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            if (key && value) info[key] = value;
          }
        });
        resolve({ success: true, info });
      } else {
        resolve({ success: false, error: '系统信息查询失败' });
      }
    });
    child.on('error', (err) => resolve({ success: false, error: err.message }));
  });
}

module.exports = {
  checkForbiddenOperation,
  checkSensitiveOperation,
  executeCommand,
  getDiskList,
  getDiskInfo,
  getSystemInfo
};
