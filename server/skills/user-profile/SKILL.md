---
name: user-profile-skill
description: 用户画像 - 提取用户信息、名称、关系等
trigger:
  - 我叫
  - 我是
  - 你叫我
  - 以后叫我
  - 称呼我
triggers:
  - 提取用户名
  - 识别关系
  - 用户改名
  - 设定关系
---

# UserProfile-Skill

用户画像技能，从对话中提取和管理用户信息。

## 支持的功能

### 用户名提取
- 模式匹配：`我叫`、`我是`、`我的名字是`、`以后叫我`等
- 返回：用户名（1-10字符）

### 关系识别
- 支持的关系：爸爸、妈妈、老公、老婆、儿子、女儿、哥哥、姐姐、弟弟、妹妹、老板、上司、同事、朋友、闺蜜、兄弟、老师、学生等
- 模式匹配：`你叫我`、`我是你的`、`称呼我为`等

### 意图检测
- `isRenameUserIntent`: 检测用户改名意图
- `isSetRelationshipIntent`: 检测设定关系意图

## 使用方式

```javascript
const userProfileSkill = skillsCenter.get('user-profile-skill');
const profile = await userProfileSkill.process(query);
// 返回 { userName, relationship, isRenameIntent, isSetRelationshipIntent }
```