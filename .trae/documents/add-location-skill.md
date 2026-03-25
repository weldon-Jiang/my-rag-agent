# 添加城市/行政区划查询技能

## 目标
创建 `location-skill` 或 `geo-skill`，能够根据关键字查询地理位置信息，包括：
- 省、市、区、县、镇、村
- 行政区划信息
- 地理位置相关数据

## 功能设计

### 触发关键词
- 省份相关：省、人口、经济
- 城市相关：城市、市区、县、区
- 地理相关：位置、面积、海拔、经纬度
- 直接地名：任意省、市、区、县、镇名称

### API 选择
使用免费的地理编码 API：
- **Open-Meteo Geocoding API**（已有，无需额外配置）
- 端点: `https://geocoding-api.open-meteo.com/v1/search`

## 实现文件

### 1. 创建 `server/skills/location-skill.js`
- 继承 BaseSkill
- 使用 Open-Meteo Geocoding API
- 返回行政区划详细信息

### 2. 修改 `server/skills/index.js`
- 注册 location-skill
- 添加 toolDefinitions
- 添加到 INTENT_KEYWORDS

### 3. 修改 `server/routes/chat.js`
- 在 INTENT_KEYWORDS 添加 location 意图
- 在 INTENT_TO_TOOLS 添加映射

## 数据结构

```javascript
{
  name: 'location-skill',
  description: '查询省、市、区、县等行政区划信息',
  supportedTypes: ['.location', '.geo']
}
```

## 意图关键词
- 省份：省、人口、GDP、省份
- 城市：城市、市区、县、区
- 地理：位置、面积、海拔、经纬度
- 通用：某地信息、某地怎么样

## 返回信息
- 地名（中英文）
- 经纬度
- 国家/地区
- 行政区划类型（省/市/区/县）
- 人口（如果有）
- 时区
