import chromadb
from chromadb.config import Settings
from pathlib import Path
from typing import List, Dict, Any, Optional
import hashlib
import httpx

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"
VECTOR_DB_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "vector_db"

_vector_store: Optional[chromadb.Client] = None
_collection = None

_embedding_function = None
_embedding_dimension = 384


def get_embedding_dimension() -> int:
    return _embedding_dimension


def get_embedding_model_config() -> Optional[dict]:
    try:
        from routers.model import MODELS
        from pathlib import Path

        settings_path = Path(__file__).resolve().parent.parent.parent / "data" / "settings.json"
        embedding_model_id = None

        if settings_path.exists():
            import json
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                embedding_model_id = settings.get("embedding_model_id")

        if embedding_model_id and embedding_model_id in MODELS:
            config = MODELS[embedding_model_id]
            if config.get("type") == "embedding":
                return config

        for model_id, config in MODELS.items():
            if config.get("type") == "embedding":
                return config
        return None
    except Exception as e:
        print(f"[VectorStore] 获取嵌入模型配置失败: {e}")
        return None


def get_embedding_function():
    global _embedding_function, _embedding_dimension

    if _embedding_function is not None:
        return _embedding_function

    print("[VectorStore] 初始化嵌入函数...")

    embedding_model = get_embedding_model_config()

    if embedding_model:
        model_id = embedding_model.get("modelId", embedding_model.get("id", ""))
        api_url = embedding_model.get("url", "")
        api_key = embedding_model.get("apiKey", "")

        if api_url and api_key:
            def openai_embed(texts: List[str]) -> List[List[float]]:
                import asyncio
                async def _do_embed():
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        response = await client.post(
                            f"{api_url.rstrip('/')}/embeddings",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "input": texts,
                                "model": model_id
                            }
                        )
                        response.raise_for_status()
                        result = response.json()
                        embeddings = result.get("data", [])
                        embeddings = sorted(embeddings, key=lambda x: x.get("index", 0))
                        return [item["embedding"] for item in embeddings]

                try:
                    return asyncio.run(_do_embed())
                except Exception as e:
                    print(f"[VectorStore] API嵌入失败: {e}，尝试备用方案...")
                    raise

            print(f"[VectorStore] 使用配置的嵌入模型API: {model_id}")
            _embedding_function = openai_embed
            return _embedding_function

    try:
        from sentence_transformers import SentenceTransformer
        import os
        os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
        model = SentenceTransformer('all-MiniLM-L6-v2', use_auth_token=False)
        _embedding_dimension = model.get_sentence_embedding_dimension()

        def local_embed(texts: List[str]) -> List[List[float]]:
            embeddings = model.encode(texts)
            return embeddings.tolist()

        _embedding_function = local_embed
        print("[VectorStore] 使用本地嵌入模型: all-MiniLM-L6-v2")
        return local_embed
    except Exception as e:
        print(f"[VectorStore] 本地模型加载失败: {e}")

    def simple_embed(texts: List[str]) -> List[List[float]]:
        result = []
        for text in texts:
            h = hashlib.md5(text.encode()).digest()
            vec = [float(b) / 255.0 for b in h[:32]]
            while len(vec) < 384:
                vec.extend(vec[:32])
            result.append(vec[:384])
        return result

    _embedding_function = simple_embed
    print("[VectorStore] 使用简单hash作为嵌入（效果有限，仅供测试）")
    return simple_embed


def reset_embedding_function():
    global _embedding_function, _embedding_dimension
    _embedding_function = None
    _embedding_dimension = 384
    print("[VectorStore] 嵌入函数已重置")


def init_vector_store():
    global _vector_store, _collection
    try:
        VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)
        _vector_store = chromadb.Client(Settings(
            persist_directory=str(VECTOR_DB_DIR),
            anonymized_telemetry=False
        ))
        _collection = _vector_store.get_or_create_collection(
            name="knowledge_base",
            metadata={"description": "知识库向量存储"}
        )
        print(f"[VectorStore] ChromaDB 初始化完成，collection: {_collection.name}")
        return True
    except Exception as e:
        print(f"[VectorStore] ChromaDB 初始化失败: {e}")
        return False


def get_collection():
    global _collection
    if _collection is None:
        init_vector_store()
    return _collection


def delete_collection():
    global _vector_store, _collection
    try:
        if _vector_store:
            _vector_store.delete_collection(name="knowledge_base")
            print("[VectorStore] 已删除旧collection")
        _collection = None
        init_vector_store()
        return True
    except Exception as e:
        print(f"[VectorStore] 删除collection失败: {e}")
        return False


async def index_file(file_path: Path, group_id: str = None) -> int:
    """索引单个文件，返回索引的块数"""
    collection = get_collection()
    if collection is None:
        return 0

    embed_func = get_embedding_function()
    indexed_count = 0

    try:
        content = file_path.read_text(encoding='utf-8')
        doc_id = f"doc_{file_path.stem}"

        collection.delete(where={"doc_id": doc_id})

        chunks = split_into_chunks(content, chunk_size=500)
        if not chunks:
            return 0

        print(f"[VectorStore] 开始索引: {file_path.name}, {len(chunks)} 个文本块")

        embeddings = embed_func(chunks)

        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{
            "file": file_path.name,
            "path": str(file_path),
            "chunk_index": i,
            "doc_id": doc_id,
            "group_id": group_id if group_id else "ALL"
        } for i in range(len(chunks))]

        collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas
        )

        indexed_count = len(chunks)
        print(f"[VectorStore] 完成索引: {file_path.name}, {indexed_count} 个文本块")

    except Exception as e:
        print(f"[VectorStore] 索引文件失败 {file_path.name}: {e}")

    return indexed_count


async def index_knowledge_base(group_id: str = None, progress_callback=None):
    """索引知识库文件，可选按分组索引"""
    collection = get_collection()
    if collection is None:
        return {"success": False, "error": "向量存储未初始化"}

    indexed_count = 0
    indexed_files = 0
    failed_files = 0

    def update_progress(msg):
        if progress_callback:
            progress_callback(msg)

    try:
        files_to_index = []

        if group_id:
            from services.knowledge_db import get_files_by_group
            files = get_files_by_group(group_id)
            for f in files:
                file_path = Path(f['file_path'])
                if file_path.exists():
                    files_to_index.append((file_path, group_id))
        else:
            for file_path in KNOWLEDGE_DIR.glob("*"):
                if file_path.is_file() and file_path.suffix.lower() in ['.txt', '.md']:
                    files_to_index.append((file_path, "default"))

        total_files = len(files_to_index)
        update_progress(f"准备索引 {total_files} 个文件...")

        semaphore = asyncio.Semaphore(3)
        results = []

        async def process_file_with_semaphore(file_info):
            async with semaphore:
                result = await process_single_file(file_info)
                current = results.count(None) + 1
                update_progress(f"正在索引... ({current}/{total_files})")
                return result

        tasks = [process_file_with_semaphore(f) for f in files_to_index]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"[VectorStore] 文件处理失败: {files_to_index[i][0].name}, {result}")
                failed_files += 1
            else:
                indexed_count += result
                indexed_files += 1

        return {
            "success": True,
            "indexed_chunks": indexed_count,
            "indexed_files": indexed_files,
            "failed_files": failed_files,
            "message": f"索引完成，共 {indexed_count} 个文本块，{indexed_files} 个文件"
        }

    except Exception as e:
        print(f"[VectorStore] 索引知识库失败: {e}")
        return {"success": False, "error": str(e)}


async def process_single_file(file_info):
    """处理单个文件的索引"""
    file_path, g_id = file_info
    collection = get_collection()
    if collection is None:
        return 0

    embed_func = get_embedding_function()
    indexed_count = 0

    try:
        content = file_path.read_text(encoding='utf-8')
        doc_id = f"doc_{file_path.stem}"

        collection.delete(where={"doc_id": doc_id})

        chunks = split_into_chunks(content, chunk_size=800)
        if not chunks:
            return 0

        print(f"[VectorStore] 索引中: {file_path.name}, {len(chunks)} 个文本块")

        embeddings = embed_func(chunks)

        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{
            "file": file_path.name,
            "path": str(file_path),
            "chunk_index": i,
            "doc_id": doc_id,
            "group_id": g_id if g_id else "ALL"
        } for i in range(len(chunks))]

        collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas
        )

        indexed_count = len(chunks)
        print(f"[VectorStore] 完成: {file_path.name}, {indexed_count} 个文本块")

    except Exception as e:
        print(f"[VectorStore] 索引失败 {file_path.name}: {e}")
        raise

    return indexed_count


async def reindex_all():
    """删除所有索引并重建"""
    delete_collection()
    return await index_knowledge_base()


def split_into_chunks(text: str, chunk_size: int = 500) -> List[str]:
    """将文本分割成块"""
    sentences = text.replace('\n', ' ').split('。')
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        sentence = sentence.strip() + '。'
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:chunk_size]]


async def semantic_search(query: str, top_k: int = 5, group_id: str = None) -> List[Dict[str, Any]]:
    """语义搜索知识库，可按分组过滤"""
    collection = get_collection()
    if collection is None:
        return []

    try:
        embed_func = get_embedding_function()
        query_embedding = embed_func([query])[0]

        if group_id:
            where_filter = {"group_id": group_id}
        else:
            where_filter = {"group_id": "ALL"}

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        search_results = []
        if results and results.get('ids') and len(results['ids']) > 0:
            for i in range(len(results['ids'][0])):
                search_results.append({
                    "content": results['documents'][0][i],
                    "distance": results['distances'][0][i],
                    "metadata": results['metadatas'][0][i]
                })

        return search_results

    except Exception as e:
        print(f"[VectorStore] 语义搜索失败: {e}")
        return []


def get_index_stats() -> Dict[str, Any]:
    """获取索引统计信息"""
    collection = get_collection()
    if collection is None:
        return {"success": False, "error": "向量存储未初始化"}

    try:
        data = collection.get()
        chunks = []
        if data.get('ids') and len(data['ids']) > 0:
            for i in range(len(data['ids'])):
                chunks.append({
                    "id": data['ids'][i],
                    "content": data.get('documents', [''])[i] if data.get('documents') else '',
                    "metadata": data.get('metadatas', [{}])[i] if data.get('metadatas') else {}
                })

        return {
            "success": True,
            "total_chunks": len(data.get('ids', [])),
            "collection_name": collection.name,
            "chunks": chunks
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
