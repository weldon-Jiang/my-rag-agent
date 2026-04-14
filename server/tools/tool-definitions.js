/**
 * 工具定义
 * @description LLM 可调用的工具列表，包含描述和参数说明
 */
const tools = [
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: `搜索本地知识库中的文档内容。

【使用场景】
- 用户询问知识库中的内容
- 搜索本地文件、文档、资料
- 查找历史信息或文档内容

【触发示例】
- "搜索知识库"
- "帮我找一下..."
- "查询文档"
- "关于xxx的信息"

【参数说明】
- query: 搜索关键词（必填）
- max_results: 最大结果数（可选，默认5）`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词"
          },
          max_results: {
            type: "integer",
            description: "最大结果数（可选，默认5）"
          },
          description: {
            type: "string",
            description: "简短说明搜索目的"
          }
        },
        required: ["query", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: `查询指定城市的天气预报信息。

【使用场景】
- 用户询问天气情况
- 查询温度、湿度、空气质量
- 需要根据天气给出穿衣建议

【触发示例】
- "北京天气怎么样"
- "明天上海气温"
- "深圳下雨吗"
- "广州空气质量"

【注意】
- 如果用户未指定城市，需要追问
- 如果询问明天或未来天气，需要先获取今天日期再计算`,
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "城市名称（必填）"
          },
          description: {
            type: "string",
            description: "简短说明查询目的"
          }
        },
        required: ["city", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_location",
      description: `查询地理位置和行政区划信息。

【使用场景】
- 查询城市、省份、国家的位置
- 获取经纬度坐标
- 了解地点归属关系

【触发示例】
- "深圳在哪个省"
- "北京是中国的首都"
- "上海的位置"
- "杭州属于哪个城市"`,
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "地名（城市、地址等）"
          },
          description: {
            type: "string",
            description: "简短说明查询目的"
          }
        },
        required: ["location", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bash",
      description: `执行 Shell 命令（Windows CMD 或 Linux Bash）。

【使用场景】
- 列出目录内容
- 运行脚本或程序
- 查询系统信息
- 文件操作

【示例】
- 列出目录: dir C:\\Users 或 ls -la
- 查看进程: tasklist
- 执行脚本: node script.js`,
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "要执行的完整命令"
          },
          description: {
            type: "string",
            description: "简短说明执行目的"
          }
        },
        required: ["command", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "python",
      description: `在沙盒环境中执行 Python 代码。

【使用场景】
- 数据处理和分析
- 文本处理和转换
- 数学计算
- JSON 数据处理

【示例】
- 计算: print(1+1)
- 处理数据: import pandas as pd
- 解析JSON: json.loads('{}')`,
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "完整的 Python 代码"
          },
          description: {
            type: "string",
            description: "简短说明代码目的"
          }
        },
        required: ["code", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ls",
      description: `列出指定目录的文件和文件夹。

【使用场景】
- 查看目录内容
- 浏览文件夹结构
- 确认文件是否存在`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "目录路径"
          },
          description: {
            type: "string",
            description: "简短说明目的"
          }
        },
        required: ["path", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: `读取文本文件的内容。

【使用场景】
- 查看代码文件
- 读取配置文件
- 查看文档内容

【参数说明】
- path: 文件完整路径（必填）
- start_line: 起始行号（可选）
- end_line: 结束行号（可选）`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "文件路径"
          },
          start_line: {
            type: "integer",
            description: "起始行号（可选）"
          },
          end_line: {
            type: "integer",
            description: "结束行号（可选）"
          },
          description: {
            type: "string",
            description: "简短说明目的"
          }
        },
        required: ["path", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: `创建新文件或追加内容到已有文件。

【使用场景】
- 创建代码文件
- 保存配置
- 写入数据

【参数说明】
- path: 文件路径（必填）
- content: 文件内容（必填）
- append: 是否追加模式（可选，默认false）`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "文件路径"
          },
          content: {
            type: "string",
            description: "文件内容"
          },
          append: {
            type: "boolean",
            description: "追加模式（可选，默认false）"
          },
          description: {
            type: "string",
            description: "简短说明目的"
          }
        },
        required: ["path", "content", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "str_replace",
      description: `替换文件中的指定字符串。

【使用场景】
- 修改代码中的变量名
- 更新配置文件
- 编辑文档内容

【参数说明】
- path: 文件路径（必填）
- old_str: 要替换的原始字符串（必填）
- new_str: 替换后的新字符串（必填）
- replace_all: 是否替换所有匹配（可选，默认false）`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "文件路径"
          },
          old_str: {
            type: "string",
            description: "要替换的原始字符串"
          },
          new_str: {
            type: "string",
            description: "替换后的新字符串"
          },
          replace_all: {
            type: "boolean",
            description: "是否替换所有匹配项（可选，默认false）"
          },
          description: {
            type: "string",
            description: "简短说明目的"
          }
        },
        required: ["path", "old_str", "new_str", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description: `当用户问题模糊或缺少关键信息时，向用户追问确认。

【使用场景】
- 问题缺少必要信息（如：天气查询没有城市）
- 问题有歧义需要澄清
- 需要用户确认具体需求

【输出格式】
{
  "question": "追问问题",
  "options": ["选项1", "选项2", "其他"]
}`,
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "追问问题"
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "选项列表"
          },
          description: {
            type: "string",
            description: "简短说明追问原因"
          }
        },
        required: ["question", "options", "description"]
      }
    }
  }
];

module.exports = tools;