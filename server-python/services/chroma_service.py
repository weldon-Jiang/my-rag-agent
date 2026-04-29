#!/usr/bin/env python3
import sys
import json
from chromadb import PersistentClient
from chromadb.config import Settings
import os
import io
from pathlib import Path

sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

class VectorStore:
    def __init__(self, persist_dir=None):
        from config import DATA_DIR
        if persist_dir is None:
            persist_dir = str(Path(DATA_DIR) / "chroma_db")
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        self.client = PersistentClient(
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
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "知识库向量存储"}
            )
            print(f"[Chroma] 创建新集合: {self.collection_name}")

    def load_documents(self, documents):
        print(f"[Chroma] 准备加载 {len(documents)} 个文档...")

        try:
            self.collection.delete(where={})
        except:
            pass

        ids = []
        documents_content = []
        metadatas = []

        for i, doc in enumerate(documents):
            doc_id = str(doc['id'])
            content = doc['content']

            if content is None:
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
            for j, c in enumerate(documents_content):
                if not isinstance(c, str):
                    print(f"[Chroma] 错误: documents_content[{j}] 类型是 {type(c)}, 值是 {repr(c)[:100]}")
                    raise TypeError(f"documents_content[{j}] must be str, got {type(c)}")

            self.collection.add(
                ids=ids,
                documents=documents_content,
                metadatas=metadatas
            )
            print(f"[Chroma] 成功添加 {len(ids)} 个文档")

    def search(self, query, top_k=5):
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

    def get_count(self):
        return self.collection.count()

def main():
    vector_store = None

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            action = request.get('action')

            if action == 'init':
                from config import DATA_DIR
                persist_dir = request.get('persist_dir', str(Path(DATA_DIR) / "chroma_db"))
                vector_store = VectorStore(persist_dir)
                print(json.dumps({'status': 'ok', 'message': '初始化完成'}), flush=True)

            elif action == 'load':
                documents = request.get('documents', [])
                print(f"[Chroma] 收到load请求，文档数: {len(documents)}")
                if documents:
                    print(f"[Chroma] 第一个文档类型: id={type(documents[0].get('id'))}, content={type(documents[0].get('content'))}")
                vector_store.load_documents(documents)
                print(json.dumps({'status': 'ok', 'count': len(documents)}), flush=True)

            elif action == 'search':
                query = request.get('query', '')
                top_k = request.get('top_k', 5)
                results = vector_store.search(query, top_k)
                print(json.dumps({'status': 'ok', 'results': results, 'count': len(results)}), flush=True)

            elif action == 'count':
                count = vector_store.get_count()
                print(json.dumps({'status': 'ok', 'count': count}), flush=True)

            elif action == 'quit':
                print(json.dumps({'status': 'ok', 'message': '退出'}), flush=True)
                break

            else:
                print(json.dumps({'status': 'error', 'message': f'未知动作: {action}'}), flush=True)

        except Exception as e:
            error_msg = str(e)
            import traceback
            traceback.print_exc()
            print(json.dumps({'status': 'error', 'message': error_msg}), flush=True)

if __name__ == '__main__':
    main()