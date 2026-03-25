# 添加盐城天气支持

## 问题
盐城不在城市坐标映射中，导致天气查询失败。

## 解决方案
在 `CITY_COORDS` 中添加盐城的经纬度坐标。

## 盐城坐标
- 纬度: 33.3475
- 经度: 120.1618

## 修改文件
- `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js`

## 修改内容
在 `CITY_COORDS` 对象中添加：
```javascript
'盐城': { lat: 33.3475, lon: 120.1618 },
```
