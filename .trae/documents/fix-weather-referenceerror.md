# 修复天气工具 ReferenceError

## 问题
`ReferenceError: getWeatherInfo is not defined`

在 chat.js 第 295 行，`get_weather` 工具调用了 `getWeatherInfo()` 函数，但该函数未定义。

## 修复步骤

### Step 1: 添加 getWeatherInfo 函数
在 chat.js 中添加 `getWeatherInfo` 函数，使用 skillsCenter.executeTool 调用天气技能：

```javascript
async function getWeatherInfo(query, modelConfig) {
  try {
    const weatherSkill = skillsCenter.get('weather-skill');
    if (!weatherSkill) {
      return { success: false, error: '天气技能未注册' };
    }
    const result = await weatherSkill.process(query, modelConfig);
    return result;
  } catch (error) {
    console.error('[getWeatherInfo] 获取天气失败:', error);
    return { success: false, error: error.message };
  }
}
```

### Step 2: 验证修复
重启服务器并测试天气查询
