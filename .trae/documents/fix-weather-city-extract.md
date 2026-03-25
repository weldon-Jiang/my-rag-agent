# 修复天气城市名提取问题

## 问题
`extractCity` 函数无法正确从"今天深圳天气怎么样"中提取"深圳"，导致 API 请求失败。

当前正则 `/(.+)天气/` 匹配到的是"今天深圳"而不是"深圳"。

## 修复方案

修改 `extractCity` 函数的正则表达式，更精确地提取城市名：

### 新正则逻辑
```javascript
extractCity(query) {
  // 常见城市名列表
  const cities = ['北京', '上海', '深圳', '广州', '杭州', '南京', '武汉', '成都', '重庆', '西安', '苏州', '天津', '长沙', '郑州', '青岛', '沈阳', '大连', '厦门', '宁波', '济南', '哈尔滨', '长春', '福州', '合肥', '昆明', '南昌', '贵阳', '南宁', '石家庄', '太原', '呼和浩特', '乌鲁木齐', '兰州', '银川', '西宁', '拉萨', '海口', '三亚', '东莞', '佛山', '无锡', '苏州', '温州', '金华', '嘉兴', '绍兴', '扬州', '烟台', '威海', '珠海', '中山', '惠州', '汕头', '泉州', '漳州', '唐山', '秦皇岛', '保定', '廊坊', '沧州', '邯郸', '邢台', '衡水', '张家口', '承德'];
  const lowerQuery = query.toLowerCase();

  // 检查是否包含天气关键词
  if (!lowerQuery.includes('天气')) {
    return null;
  }

  // 尝试从常见城市中匹配
  for (const city of cities) {
    if (lowerQuery.includes(city) || query.includes(city)) {
      return city;
    }
  }

  // 回退：提取"X天气"前面的单个城市词
  const pattern = /([\u4e00-\u9fa5]{2,6})天气/;
  const match = query.match(pattern);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}
```

## 修改文件
- `d:\chinatravel\my-rag-agent\server\skills\weather-skill.js`
