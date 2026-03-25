# 添加天气工具和技能计划

## 目标
为系统添加天气查询功能，用户可以询问天气相关信息。

## 修改文件
1. `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js` (新建)
2. `d:\chinatravel\my-rag-agent\server\skills\index.js` (修改)
3. `d:\chinatravel\my-rag-agent\server\routes\chat.js` (修改)

## 实现步骤

### Step 1: 创建天气技能文件
创建 `server/skills/weather-skill.js`，实现以下功能：
- 继承 BaseSkill
- 支持天气查询
- 使用免费天气 API（如 wttr.in 或 open-meteo）

### Step 2: 在 SkillsCenter 注册天气技能
修改 `server/skills/index.js`：
- 添加 `require('./weather-skill')`
- 在 toolDefinitions 添加 `get_weather` 工具定义
- 在 intentKeywords 添加 `weather` 关键词
- 在 skillExtensions 添加天气相关扩展名
- 在 registerBuiltInSkills 中注册 WeatherSkill
- 在 executeTool 中添加 `get_weather` case

### Step 3: 在 Router 中添加天气意图
修改 `server/routes/chat.js`：
- 在 INTENT_KEYWORDS 添加 `get_weather` 意图的关键词
- 在 INTENT_TO_TOOLS 添加天气意图到工具的映射

### Step 4: 测试验证
- 重启服务器
- 测试天气查询功能

## 天气工具规格

### 工具名称
`get_weather`

### 工具描述
查询指定城市的天气信息

### 参数
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| city | string | 是 | 城市名称 |

### 触发关键词
天气、气温、湿度、下雨、晴天、多云、冷、热、温度

### API 选择
使用 wttr.in 免费天气 API，无需 API key
- URL: `https://wttr.in/{city}?format=j1`
- 返回 JSON 格式天气数据
