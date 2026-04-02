# 计划：用户与智能体关系功能

## 需求分析

1. **设定关系**：用户可以说"我是你的老板"、"我是你主人"等设定关系
2. **称呼优先级**：关系 > 用户名称 > 无称呼
3. **语气影响**：不同的关系使用不同的语气

## 实现方案

### 步骤1: 前端存储关系
- 文件：`public/app.js`
- 添加关系相关的存储函数
- 存储键名：`rag_agent_user_relationship`
- 默认值：null

### 步骤2: 前端发送关系
- 在发送聊天请求时，携带 relationship 参数

### 步骤3: 后端添加关系设定意图
- 文件：`server/routes/chat.js`
- 添加关系设定的意图关键词
- 关键词：我是你的、我是你主人、我是你爸爸、我是你老师等

### 步骤4: 添加关系提取函数
- 添加 `extractRelationship()` 函数
- 提取用户设定的关系类型

### 步骤5: 定义关系语气模板
```javascript
const RELATIONSHIPS = {
  '老板': {
    title: '老板',
    formal: true,
    pronouns: '您',
    style: '恭敬、专业'
  },
  '主人': {
    title: '主人',
    formal: false,
    pronouns: '您',
    style: '忠诚、服从'
  },
  '爸爸': {
    title: '爸爸',
    formal: false,
    pronouns: '你',
    style: '亲情、尊敬'
  },
  '妈妈': {
    title: '妈妈',
    formal: false,
    pronouns: '你',
    style: '亲情、温暖'
  },
  '老师': {
    title: '老师',
    formal: true,
    pronouns: '您',
    style: '尊敬、谦虚'
  },
  '朋友': {
    title: '朋友',
    formal: false,
    pronouns: '你',
    style: '轻松、随意'
  },
  '默认': {
    title: null,
    formal: false,
    pronouns: '你',
    style: '正常'
  }
};
```

### 步骤6: 修改系统提示
- 修改 `buildSystemPrompt` 函数
- 传入关系信息
- 根据关系调整语气指示

### 步骤7: 前端更新关系存储
- 处理后端返回的新关系

## 技术细节

### 关系提取正则
```javascript
const relationshipPatterns = [
  /我是你(?:的)?(.+)/,        // 我是你的老板
  /我是(.+)(?:的)?(?:主人|老板)/, // 我是主人的
  /以后我就是你的(.+)/,
];
```

### 系统提示增强
```
用户与你的关系：老板
称呼方式：使用"您"称呼，保持恭敬专业的语气
```

### 称呼规则
1. 有关系 → 按关系称呼（如"老板，您好"）
2. 无关系但有名称 → 按名称称呼（如"小明，你好"）
3. 无关系无名称 → 不特别称呼
