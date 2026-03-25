# 智能关键词提取与技能匹配重构

## 目标
重构任务分解和执行流程，实现：
1. 从用户输入中智能提取多个关键词
2. 根据关键词匹配对应技能和工具
3. 执行命中的工具，收集结果
4. 智能组装上下文发给大模型
5. **未命中技能时**：直接将用户输入发给大模型，让大模型自己处理

## 当前问题
- 任务分解过于简单，只是按分隔符分割
- 关键词提取不够智能
- 未考虑未命中技能的情况

## 新架构流程
```
用户输入
    ↓
关键词智能提取（extractKeywords）
    ↓
技能匹配（matchSkillsByKeywords）
    ↓
执行命中的工具（executeMatchedTools）
    ↓
结果聚合（aggregateResults）
    ↓
发送大模型（包含原始问题和工具结果）
```

## 核心函数设计

### 1. extractKeywords(query)
智能提取查询中的关键词：
- 天气相关：天气、温度、湿度...
- 位置相关：省、市、县、区...
- 文件相关：PDF、图片、文档...
- 知识库：搜索、查询、找...

### 2. matchSkillsByKeywords(keywords)
根据关键词匹配技能：
- 返回匹配的技能列表
- 未匹配时返回空数组

### 3. executeMatchedTools(skills, query)
执行匹配到的工具：
- 并行执行多个工具
- 返回执行结果

### 4. 构建上下文
- 工具结果格式化
- **关键**：未命中时，context 为空字符串，让大模型直接处理用户问题

## 实现文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`

## 修改步骤

### Step 1: 重构 extractKeywords 函数
更智能地提取关键词，支持多关键词提取

### Step 2: 修改 matchSkillsByKeywords
根据关键词匹配技能，返回技能列表

### Step 3: 修改主流程
简化逻辑，未命中技能时直接发送原始问题给大模型

### Step 4: 保持工具执行不变
复用现有 executeTools 函数
