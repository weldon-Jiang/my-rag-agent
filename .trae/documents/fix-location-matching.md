# 修复地点技能匹配问题

## 问题

齐齐哈尔等不带省市区县后缀的地名无法命中 location\_skill。例如：

* "齐齐哈尔在哪里" → 能命中（因为有"在哪里"）

* "齐齐哈尔" → 无法命中（没有关键词）

## 解决方案

### 方案分析

问题是当前依赖关键词匹配，但"齐齐哈尔"这类纯地名没有触发词。有两个解决思路：

1. **扩展关键词** - 添加更多触发词，但这无法覆盖所有地名
2. **智能判断** - 如果提取到了地名但没有明确意图，优先调用 location\_skill

### 实现方案（采用方案2）

#### Step 1: 修改 INTENT\_KEYWORDS

添加更多触发词：

```javascript
get_location: [
  '省', '市', '县', '区', '镇', '村',
  '位置', '在哪里', '经纬度', '海拔', '行政区划', '的人口', '面积',
  '哪个省', '属于哪个', '位于', '位置在哪'
]
```

#### Step 2: 在 extractMatchedIntents 后增加地名检测

当没有匹配到任何意图时，检测是否包含地名：

```javascript
function extractMatchedIntents(query) {
  // ... 原有逻辑

  // 如果没有匹配到特定意图，检测是否包含地名
  if (matchedIntents.length === 0) {
    const hasLocation = detectLocationInQuery(query);
    if (hasLocation) {
      matchedIntents.push('get_location');
    }
  }

  return matchedIntents;
}
```

#### Step 3: 实现 detectLocationInQuery 函数

检测查询中是否包含地名（2-6个中文字符且非日期/天气词）：

```javascript
function detectLocationInQuery(query) {
  const locationIndicators = ['省', '市', '县', '区', '镇', '村', '街', '路', '道'];
  for (const indicator of locationIndicators) {
    if (query.includes(indicator)) return true;
  }

  // 常见城市名列表
  const commonCities = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉',
    '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛',
    '沈阳', '宁波', '昆明', '大连', '厦门', '福州', '无锡', '合肥',
    '济南', '唐山', '保定', '沧州', '邯郸', '秦皇岛', '张家口', '廊坊',
    '齐齐哈尔', '哈尔滨', '长春', '吉林', '大庆', '牡丹江', '佳木斯',
    // ... 更多城市
  ];

  for (const city of commonCities) {
    if (query.includes(city)) return true;
  }

  // 通用城市名检测（2-6个汉字，可能是城市名）
  const chineseCities = query.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  for (const word of chineseCities) {
    if (!DATE_WORDS.includes(word) && !WEATHER_WORDS.includes(word)) {
      return true; // 假设是地名
    }
  }

  return false;
}
```

#### Step 4: 在 router 中也添加地名检测

确保在 tool 选择时也能检测到地名。

## 改动文件

* `server/routes/chat.js` - 添加 detectLocationInQuery 函数并修改 extractMatchedIntents

