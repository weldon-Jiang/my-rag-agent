# 语义匹配模型安装说明

## 概述

语义匹配使用 `sentence-transformers` 库进行文本语义相似度计算，提供更智能的技能匹配能力。

## 安装步骤

### 方式一：使用 pip 安装

```bash
# 安装 sentence-transformers
pip install sentence-transformers

# 安装依赖
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### 方式二：使用 requirements.txt

在 `requirements.txt` 中添加：

```txt
sentence-transformers>=2.2.2
torch>=2.0.0
```

然后执行：

```bash
pip install -r requirements.txt
```

## 模型说明

系统默认使用 `all-MiniLM-L6-v2` 模型，具有以下特点：

- **模型大小**: ~80MB
- **性能**: 快速推理，适合实时应用
- **语言支持**: 多语言（包括中文）

## 验证安装

```bash
python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('all-MiniLM-L6-v2'); print('✓ 语义匹配模型安装成功')"
```

## 注意事项

1. **首次运行**：首次使用时会自动下载模型（约80MB），请确保网络连接正常
2. **离线环境**：可预先下载模型并设置环境变量 `SENTENCE_TRANSFORMERS_HOME`
3. **CPU/GPU**：模型支持 CPU 和 GPU 运行，GPU 可显著提升性能

## 配置

在 `config.yaml` 中可以配置：

```yaml
skills:
  semantic_matching:
    enabled: true
    model_name: all-MiniLM-L6-v2
    threshold: 0.3
```
