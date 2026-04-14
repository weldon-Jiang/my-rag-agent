---
name: activity-skill
description: 活动理解 - 检测户外活动并生成建议
trigger:
  - 徒步
  - 跑步
  - 骑行
  - 露营
  - 运动
  - 爬山
  - 登山
triggers:
  - 检测户外活动
  - 生成活动建议
  - 穿衣建议
---

# Activity-Skill

活动理解技能，检测用户提到的户外活动并生成相应建议。

## 支持的活动类型

| 活动 | 关键词 | 注意事项 |
|------|--------|----------|
| 徒步 | 徒步、爬山、登山、hiking、trekking | 防滑、登山鞋、饮用水、防晒 |
| 跑步 | 跑步、晨跑、夜跑、jogging、running | 合适时间、补水、运动服装 |
| 骑行 | 骑行、骑车、单车、cycling、bike | 交通安全、头盔、备胎工具 |
| 露营 | 露营、野营、camping | 防蚊虫、睡袋、天气变化 |
| 钓鱼 | 钓鱼、垂钓、fishing | 防晒、渔具、安全 |
| 约会 | 约会、date | 仪表、场所穿着 |
| 运动 | 运动、锻炼、gym、workout | 热身运动、毛巾、水 |

## 功能

- `detectActivities(query)`: 检测查询中的活动类型
- `detectClothingIntent(query)`: 检测穿衣询问意图
- `generateGuidance()`: 生成活动建议文本