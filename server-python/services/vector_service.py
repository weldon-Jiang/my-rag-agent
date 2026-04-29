import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import os

class VectorStore:
    def __init__(self, persist_dir: str = None):
        from config import DATA_DIR
        if persist_dir is None:
            persist_dir = str(DATA_DIR / "chroma_db")
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        self.collection_name = "knowledge_base"
        self._init_collection()

    def _init_collection(self):
        try:
            self.collection = self.client.get_collection(name=self.collection_name)
            print(f"[Chroma] 连接到现有集合: {self.collection_name}, 文档数: {self.collection.count()}")
        except Exception as e:
            print(f"[Chroma] 创建新集合: {self.collection_name}")
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "知识库向量存储"}
            )

    def load_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        print(f"[Chroma] 准备加载 {len(documents)} 个文档...")

        try:
            self.collection.delete(where={})
        except Exception as e:
            print(f"[Chroma] 清空集合失败: {e}")

        ids = []
        documents_content = []
        metadatas = []

        for i, doc in enumerate(documents):
            doc_id = str(doc.get('id', f'doc_{i}'))
            content = doc.get('content', '')

            if content is None or content == '':
                print(f"[Chroma] 跳过空内容文档: {doc_id}")
                continue

            if not isinstance(content, str):
                content = str(content)
            content = content.strip()

            if not content:
                print(f"[Chroma] 跳过空文档: {doc_id}")
                continue

            ids.append(doc_id)
            documents_content.append(content)
            metadatas.append(doc.get('metadata', {}))

            if i < 2:
                print(f"[Chroma] 文档 {i+1}: id={doc_id}, length={len(content)}, type={type(content)}")

        print(f"[Chroma] 实际添加 {len(ids)} 个文档到向量库...")

        if ids:
            self.collection.add(
                ids=ids,
                documents=documents_content,
                metadatas=metadatas
            )
            print(f"[Chroma] 成功添加 {len(ids)} 个文档")

        return {"success": True, "count": len(ids)}

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_str = str(query).strip()
        if not query_str:
            return []

        try:
            results = self.collection.query(
                query_texts=[query_str],
                n_results=top_k
            )

            search_results = []
            if results['ids'] and len(results['ids']) > 0:
                for i in range(len(results['ids'][0])):
                    search_results.append({
                        'id': results['ids'][0][i],
                        'content': results['documents'][0][i] if results['documents'] else '',
                        'metadata': results['metadatas'][0][i] if results.get('metadatas') and results['metadatas'] else {},
                        'score': 1 - results['distances'][0][i] if results.get('distances') and results['distances'] else 0
                    })

            return search_results
        except Exception as e:
            print(f"[Chroma] 搜索错误: {e}")
            raise

    def get_count(self) -> int:
        return self.collection.count()

    def reset(self):
        self.collection.delete(where={})
        print("[Chroma] 集合已重置")


_vector_store: Optional[VectorStore] = None

def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        from config import CHROMA_DB_PATH
        _vector_store = VectorStore(CHROMA_DB_PATH)
    return _vector_store

def initialize_vector_store() -> VectorStore:
    vector_store = get_vector_store()
    print(f"[VectorStore] 初始化完成, 文档数: {vector_store.get_count()}")
    return vector_store

def semantic_search(query: str, top_k: int = 5) -> Dict[str, Any]:
    try:
        vector_store = get_vector_store()
        results = vector_store.search(query, top_k)
        return {
            "success": True,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        print(f"[VectorStore] 语义搜索失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": [],
            "count": 0
        }

def add_document(doc_id: str, content: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    try:
        vector_store = get_vector_store()
        vector_store.collection.add(
            ids=[doc_id],
            documents=[content],
            metadatas=[metadata or {}]
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_document(doc_id: str) -> Dict[str, Any]:
    try:
        vector_store = get_vector_store()
        vector_store.collection.delete(ids=[doc_id])
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_stats() -> Dict[str, Any]:
    try:
        vector_store = get_vector_store()
        return {
            "success": True,
            "documentCount": vector_store.get_count(),
            "collectionName": vector_store.collection_name
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "documentCount": 0,
            "collectionName": "knowledge_base"
        }

def shutdown():
    global _vector_store
    if _vector_store:
        print("[VectorStore] 关闭")
        _vector_store = None