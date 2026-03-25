# Skill 渐进式披露与 Tools 机制整合计划

## 需求分析

当前系统的局限性：
- 每次查询都调用所有技能处理所有文件
- 没有根据查询内容智能判断需要使用哪些技能
- 缺乏函数调用（Function Calling）能力

## 目标

将 Skills 与 OpenAI Function Calling / Tools 机制结合：

1. **渐进式披露**：根据查询意图动态决定使用哪些技能
2. **Tool 机制**：让 AI 能够主动调用技能获取信息
3. **智能调度**：只处理与查询相关的文件类型

## 实施步骤

### 阶段一：工具定义系统
1. 定义 Skills 工具规范（Tool Schema）
2. 创建技能注册为 Tool 的机制
3. 实现工具调用路由

### 阶段二：Tool 调用实现
4. 实现 `callTool` 函数处理工具调用
5. 修改 `callAI` 支持 `tools` 参数
6. 实现多轮工具调用循环

### 阶段三：渐进式披露逻辑
7. 实现查询意图分析
8. 根据意图选择相关技能
9. 过滤不相关的文件类型

### 阶段四：测试验证
10. 测试工具调用流程
11. 测试渐进式披露效果
12. 验证功能正常

## 技术方案

### 工具定义示例
```json
{
  "type": "function",
  "function": {
    "name": "search_knowledge_base",
    "description": "搜索本地知识库中的文档内容",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "用户查询内容"
        },
        "file_types": {
          "type": "array",
          "items": {"type": "string"},
          "description": "限定搜索的文件类型"
        }
      }
    }
  }
}
```

### 技能到工具的映射
- `images-skill` → `recognize_image` 工具
- `videos-skill` → `analyze_video` 工具
- `pdfs-skill` → `extract_pdf_content` 工具