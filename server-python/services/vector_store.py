import chromadb
from chromadb.config import Settings
from pathlib import Path
from typing import List, Dict, Any, Optional
import hashlib

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"
VECTOR_DB_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "vector_db"

_vector_store: Optional[chromadb.Client] = None
_collection = None


_embedding_function = None


def get_embedding_function():
    global _embedding_function
    if _embedding_function is not None:
        return _embedding_function

    def simple_embed(texts: List[str]) -> List[List[float]]:
        result = []
        for text in texts:
            h = hashlib.md5(text.encode()).digest()
            vec = [float(b) / 255.0 for b in h[:32]]
            while len(vec) < 384:
                vec.extend(vec[:32])
            result.append(vec[:384])
        return result

    try:
        from sentence_transformers import SentenceTransformer
        import os
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        model = SentenceTransformer('all-MiniLM-L6-v2', use_auth_token=False)
        def embed(texts: List[str]) -> List[List[float]]:
            embeddings = model.encode(texts)
            return embeddings.tolist()
        _embedding_function = embed
        print("[VectorStore] SentenceTransformer 模型已加载")
        return embed
    except Exception as e:
        print(f"[VectorStore] SentenceTransformer 加载失败: {e}")
        print("[VectorStore] 使用简单hash作为占位符嵌入")
        _embedding_function = simple_embed
        return simple_embed


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


async def index_knowledge_base(group_id: str = None):
    """索引知识库文件，可选按分组索引"""
    collection = get_collection()
    if collection is None:
        return {"success": False, "error": "向量存储未初始化"}

    indexed_count = 0
    indexed_files = 0

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

        print(f"[VectorStore] 开始索引 {len(files_to_index)} 个文件")

        for file_path, g_id in files_to_index:
            count = await index_file(file_path, g_id)
            indexed_count += count
            indexed_files += 1

        return {
            "success": True,
            "indexed_chunks": indexed_count,
            "indexed_files": indexed_files,
            "message": f"索引完成，共 {indexed_count} 个文本块，{indexed_files} 个文件"
        }

    except Exception as e:
        print(f"[VectorStore] 索引知识库失败: {e}")
        return {"success": False, "error": str(e)}


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
