# 智能任务拆分与依赖解析

## 目标
实现更智能的任务拆分，能够：
1. 区分主语、谓语、宾语
2. 识别工具间的依赖关系
3. 按依赖顺序执行任务

## 场景示例

### 例子1：深圳天气和位置
"深圳天气怎么样，它在哪个省"
- 主语：深圳
- 谓语1：天气（依赖：无）
- 谓语2：在哪个省（依赖：先知道深圳）

### 例子2：对比天气
"北京和上海的天气对比"
- 主语：北京、上海
- 谓语：天气对比
- 依赖：无

### 例子3：依赖查询
"深圳属于哪个省，它的气候怎么样"
- 任务1：深圳 → 位置查询 → 广东省
- 任务2：深圳的气候 → 天气查询（可并行）

## 实现方案

### 1. 实体提取（Entity Extraction）
识别句子中的关键实体（地名、物品等）

### 2. 关系解析（Relation Parsing）
识别实体之间的关系
- 属于关系
- 对比关系
- 依赖关系

### 3. 依赖图构建（Dependency Graph）
```
Task A → 结果 → Task B（依赖A的结果）
Task C（独立）
```

### 4. 拓扑排序执行
按照依赖顺序执行任务

## 数据结构

```javascript
{
  originalQuery: "深圳天气怎么样，它在哪个省",
  entities: [
    { text: "深圳", type: "LOCATION" }
  ],
  tasks: [
    {
      id: "task1",
      entity: "深圳",
      predicate: "天气",
      query: "深圳天气",
      dependsOn: [],
      intent: "get_weather"
    },
    {
      id: "task2",
      entity: "深圳",
      predicate: "省份",
      query: "深圳在哪个省",
      dependsOn: ["task1"],
      intent: "get_location"
    }
  ],
  executedResults: {}
}
```

## 实现文件
- `d:\chinatravel\my-rag-agent\server\routes\chat.js`

## 实现步骤

### Step 1: 创建智能任务拆分函数
- extractEntities() - 提取实体
- parseRelations() - 解析关系
- buildTaskGraph() - 构建任务图

### Step 2: 实现依赖解析
- 识别"它"、"这个"等指代词
- 关联前置任务的输出

### Step 3: 实现拓扑排序执行
- 按依赖顺序执行任务
- 将前置结果注入后续任务

### Step 4: 结果聚合
- 合并所有任务结果
- 生成完整上下文
