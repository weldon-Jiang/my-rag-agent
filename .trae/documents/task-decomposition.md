# 智能任务分解与并行执行计划

## 目标
实现一个智能的任务分解和并行执行系统，让 Agent 能够：
1. 将用户输入分解为多个独立任务
2. 并行执行多个任务的工具调用
3. 整合所有结果发送给大模型

## 当前架构
```
用户输入 → Router → Skill Selector → Tool Executor → LLM
```

## 新架构
```
用户输入
    ↓
Task Decomposer（任务分解器）
    ↓
Task 1 → Skill Matcher → Tool Executor → 结果
Task 2 → Skill Matcher → Tool Executor → 结果
...
    ↓
Result Aggregator（结果聚合器）
    ↓
LLM 生成最终回答
```

## 核心组件

### 1. TaskDecomposer（任务分解器）
将用户输入分解为多个原子任务

```javascript
function decomposeTasks(query) {
  // 根据关键词或标点符号分解
  // "帮我查一下深圳天气和北京天气" → ["深圳天气", "北京天气"]
}
```

### 2. SkillMatcher（技能匹配器）
将任务与技能匹配

```javascript
function matchSkillToTask(task) {
  // 返回匹配的技能名称
}
```

### 3. ParallelExecutor（并行执行器）
并行执行多个工具调用

```javascript
async function executeTasksInParallel(tasks) {
  const results = await Promise.all(
    tasks.map(task => executeSingleTask(task))
  );
  return results;
}
```

### 4. ResultAggregator（结果聚合器）
聚合所有任务结果

```javascript
function aggregateResults(taskResults) {
  // 整合所有结果为一个上下文
}
```

## 实现文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`

## 实现步骤

### Step 1: 创建任务分解函数 decomposeTasks()
- 识别用户输入中的多个查询意图
- 按标点符号或关键词分割

### Step 2: 创建技能匹配函数 matchSkillToTask()
- 根据任务特征匹配到对应技能

### Step 3: 创建并行执行器
- 使用 Promise.all 并行执行任务

### Step 4: 修改主流程
- 使用新的任务分解和执行流程
