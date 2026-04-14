---
name: windows-system-skill
description: Windows系统操作 - 列出目录文件、查看磁盘信息、执行Windows命令
trigger:
  - 磁盘
  - 硬盘
  - 盘符
  - 系统信息
  - 格式化
  - 删除文件
  - 移动文件
  - 复制文件
  - 目录
  - 文件
  - 查看文件
  - 列出文件
  - E盘
  - D盘
  - C盘
  - cmd
  - 命令提示符
triggers:
  - 列出D盘的文件
  - 查看C盘空间
  - 执行cmd命令
  - 帮我看看桌面有什么
---

# Windows 系统操作 Skill

## 使用场景
当用户需要执行 Windows 系统操作时使用：
- "列出 D 盘的文件"
- "查看 C 盘空间"
- "帮我看看桌面有什么"

## 工作流程
1. 解析用户命令
2. 执行系统命令或文件操作
3. 返回执行结果

## 可用操作
- `ls`: 列出目录文件
- `bash`: 执行 Shell 命令
- `python`: 执行 Python 代码
- `read_file`: 读取文件
- `write_file`: 写入文件

## 注意事项
- 危险操作需要二次确认
- 文件路径需要正确处理
