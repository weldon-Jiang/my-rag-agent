# 修复日期解析错误问题

## 问题描述
用户输入"齐齐哈尔今天温度多少"，大模型回答中日期显示为"2025年12月17日"，而系统当前时间是2026年3月25日。

## 问题分析
1. `parseWeatherDate` 函数解析"今天"时创建 Date 对象可能有时区问题
2. `formatChineseDate` 在处理 Date 对象时可能有偏差
3. 需要检查日期在整个调用链中的传递过程

## 修复方案

### Step 1: 修复 parseWeatherDate
确保使用本地时区创建 Date 对象：
```javascript
function parseWeatherDate(query) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 明确使用本地时区的日期计算
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // ... 匹配逻辑
  const d = new Date(localDate);
  d.setDate(d.getDate() + p.days);
  return d;
}
```

### Step 2: 修复 formatChineseDate
确保正确处理 Date 对象：
```javascript
function formatChineseDate(date) {
  // 确保输入是 Date 对象
  const d = date instanceof Date ? date : new Date(date);

  // 使用本地时区获取日期组件
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${month}月${day}日${weekday}`;
}
```

### Step 3: 添加调试日志
在关键步骤添加日志，确保可以追踪日期值：
```javascript
console.log(`[WeatherSkill] 解析日期: ${targetDate}, 格式化: ${formatChineseDate(targetDate)}`);
```

### Step 4: 验证测试
测试用例：
- 输入："齐齐哈尔今天温度多少" → 日期应为 "3月25日周三"
- 输入："深圳明天天气" → 日期应为 "3月26日周四"
- 输入："2024年1月15日天气" → 日期应为 "1月15日周一"
