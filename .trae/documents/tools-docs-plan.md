# 技能和工具说明书编写计划

## 目标

为所有技能和工具编写详细的使用说明书，便于用户理解和使用。

---

## 实施步骤

### 1. 完善工具参数描述

| 工具 | 当前描述 | 完善后 |
|------|----------|--------|
| bash | 执行 Shell 命令 | 详细说明参数和用法 |
| python | 执行 Python 代码 | 详细说明参数和用法 |
| ls | 列出目录内容 | 详细说明参数和用法 |
| read_file | 读取文件 | 详细说明参数和用法 |
| write_file | 写入文件 | 详细说明参数和用法 |
| str_replace | 替换字符串 | 详细说明参数和用法 |

### 2. 添加前端工具说明页面

在前端添加工具使用说明页面，展示所有工具的功能和参数。

---

## 详细说明书内容

### bash 工具
- 功能：在沙盒环境中执行 Shell 命令
- 参数：
  - command: 要执行的命令
  - description: 命令说明
- 可用路径：
  - /mnt/user-data/workspace -> 项目 workspace 目录
  - /mnt/user-data/uploads -> 上传文件目录

### python 工具
- 功能：执行 Python 代码
- 参数：
  - code: Python 代码
  - description: 代码说明

### ls 工具
- 功能：列出目录内容
- 参数：
  - path: 目录路径
  - description: 说明

### read_file 工具
- 功能：读取文件内容
- 参数：
  - path: 文件路径
  - start_line: 起始行（可选）
  - end_line: 结束行（可选）
  - description: 说明

### write_file 工具
- 功能：写入内容到文件
- 参数：
  - path: 文件路径
  - content: 要写入的内容
  - append: 是否追加（默认覆盖）
  - description: 说明

### str_replace 工具
- 功能：替换文件中的字符串
- 参数：
  - path: 文件路径
  - old_str: 要替换的字符串
  - new_str: 新的字符串
  - replace_all: 是否全部替换
  - description: 说明
