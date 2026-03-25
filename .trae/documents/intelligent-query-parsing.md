# 优化用户输入智能拆分

## 问题
当前用户输入解析不够智能，例如：
- `今天乌鲁木齐天气怎么样` → 地名提取错误
- `乌鲁木齐今天天气` → 同样存在问题
- `深圳明天会不会下雨` → 日期和地点可能混淆

## 根因分析
1. `parseQueryStructure` 依赖简单的正则匹配
2. 没有语义理解，只是机械地提取中文字符
3. 日期、天气词、疑问词混淆导致提取失败
4. 没有考虑中文语序的灵活性

## 优化方案

### Step 1: 增强 `extractEntities` 函数
创建智能分词和实体识别：
```javascript
function extractEntities(query) {
  // 1. 先去除无意义字符
  // 2. 识别日期词汇（今天、明天、周一、3月15日等）
  // 3. 识别地点词汇（城市名、省市县等）
  // 4. 识别天气相关词
  // 5. 识别疑问词（吗、怎么样、会不会等）
  // 6. 清理后的地点名才是有效实体
}
```

### Step 2: 创建 `normalizeQuery` 函数
统一不同语序的表达：
```javascript
function normalizeQuery(query) {
  // 输入: "今天乌鲁木齐天气怎么样"
  // 输出: { location: "乌鲁木齐", date: "今天", weather: "天气", question: "怎么样" }
}
```

### Step 3: 重构 `parseQueryStructure`
- 使用 `normalizeQuery` 解析输入
- 根据实体类型（地点、日期、意图）智能拆分
- 支持多种语序表达

### Step 4: 支持更多日期表达
- `周一`/`周一` → 本周一
- `3月15日` → 具体日期
- `下周`/`上周`
- `这个月`/`那个月`

### Step 5: 优化天气技能的地名提取
weather-skill.js 的 `extractLocationFromQuery` 已经优化，但可以进一步改进：
- 利用已有 normalizeQuery 的结果
- 直接接收已识别的地点，而不是重新提取

## 实现细节

### 关键函数设计
```javascript
function normalizeChineseQuery(query) {
  const datePatterns = [...];
  const locationPatterns = [...];
  const weatherPatterns = [...];
  const questionPatterns = [...];

  // 返回结构化结果
  return {
    original: query,
    location: extractedLocation,
    date: extractedDate,
    intent: determinedIntent,
    cleanedQuery: remainingText
  };
}
```

### 日期识别增强
- `今天` → 今天
- `明天` → 明天
- `后天` → 后天
- `周一`/`周一` → 本周一
- `2024年3月15日` → 2024-03-15
- `下周二` → 下一个周二

### 地点识别增强
- 匹配 Open-Meteo 支持的中文城市
- 支持带行政后缀的地点（深圳市、北京市）
- 支持简称（深 = 深圳）

## 验证用例
1. `今天乌鲁木齐天气怎么样` → {地点: 乌鲁木齐, 日期: 今天, 意图: 天气}
2. `乌鲁木齐今天天气` → {地点: 乌鲁木齐, 日期: 今天, 意图: 天气}
3. `深圳明天会不会下雨` → {地点: 深圳, 日期: 明天, 意图: 降水}
4. `上海今天气温多少度` → {地点: 上海, 日期: 今天, 意图: 温度}
5. `北京后天风大吗` → {地点: 北京, 日期: 后天, 意图: 风速}
