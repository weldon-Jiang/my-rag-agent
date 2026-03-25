# 重构天气技能 - 依赖外部工具获取位置

## 目标
重构天气技能，不再存储城市坐标数据，改为：
1. 依赖 `location-skill` 获取位置信息
2. 如果其他工具未返回位置信息，先调用 location-skill
3. 使用获取到的经纬度查询天气

## 当前问题
- 天气技能存储了大量城市坐标数据
- 没有利用已实现的 location-skill
- 县级城市可能不在数据库中

## 新架构

### 流程1：用户直接提供位置
```
用户: "北京天气怎么样"
  ↓
location-skill 已缓存/返回 { lat: 39.9, lon: 116.4 }
  ↓
weather-skill 使用坐标查询天气
```

### 流程2：需要先获取位置
```
用户: "阜宁天气怎么样"
  ↓
location-skill 查询阜宁坐标 { lat: 33.7, lon: 119.8 }
  ↓
weather-skill 使用坐标查询天气
```

### 流程3：知识库模式
```
用户: "xxx天气" (仅知识库模式)
  ↓
location-skill 无法使用 → 提示需要AI模式
  ↓
大模型上网检索城市信息
  ↓
返回给用户
```

## 实现步骤

### Step 1: 修改 weather-skill.js
- 移除 CITY_COORDS 常量
- 添加 locationSkill 依赖
- 接收外部传入的位置信息

### Step 2: 修改 chat.js 主流程
- 先执行 location-skill 获取位置
- 将位置信息传递给 weather-skill
- 按依赖顺序执行任务

## 关键代码设计

### weather-skill.process()
```javascript
async process(query, context = {}) {
  // 从 context 中获取位置信息
  let { latitude, longitude, cityName } = context.location || {};
  
  // 如果没有位置信息，先查询位置
  if (!latitude || !longitude) {
    const locationResult = await getLocationInfo(query);
    if (locationResult.success && locationResult.data) {
      latitude = locationResult.data.latitude;
      longitude = locationResult.data.longitude;
      cityName = locationResult.data.name;
    }
  }
  
  // 使用坐标查询天气
  const weather = await this.getWeatherByCoords(latitude, longitude, cityName);
  return weather;
}
```
