from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib
import re


class KnowledgeProcessor:
    def __init__(self, vector_store=None):
        self.vector_store = vector_store
        self.chunk_size = 500
        self.chunk_overlap = 50

    def process_file(self, filepath: str) -> List[Dict[str, Any]]:
        path = Path(filepath)
        ext = path.suffix.lower()

        if ext == ".txt" or ext == ".md":
            return self._process_text_file(filepath)
        elif ext == ".pdf":
            return self._process_pdf_file(filepath)
        elif ext in [".jpg", ".jpeg", ".png"]:
            return self._process_image_file(filepath)
        return []

    def _process_text_file(self, filepath: str) -> List[Dict[str, Any]]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception as e:
            print(f"[Knowledge] 读取文件失败 {filepath}: {e}")
            return []

        if not content.strip():
            return []

        chunks = self._chunk_text(content)
        documents = []

        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            doc_id = self._generate_doc_id(filepath, i)
            documents.append({
                "id": doc_id,
                "content": chunk,
                "metadata": {
                    "source": str(filepath),
                    "filename": Path(filepath).name,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "file_type": Path(filepath).suffix
                }
            })

        return documents

    def _chunk_text(self, text: str) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size

            if end < len(text):
                boundary = max(
                    text.rfind('.', start, end),
                    text.rfind('。', start, end),
                    text.rfind('?', start, end),
                    text.rfind('？', start, end),
                    text.rfind('!', start, end),
                    text.rfind('！', start, end),
                    text.rfind('\n', start, end)
                )
                if boundary > start:
                    end = boundary + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - self.chunk_overlap

        return chunks

    def _process_pdf_file(self, filepath: str) -> List[Dict[str, Any]]:
        try:
            import pdfplumber
        except ImportError:
            return [{
                "id": f"error_{filepath}",
                "content": "PDF processing not available - pdfplumber not installed",
                "metadata": {"source": filepath, "error": "pdfplumber not installed"}
            }]

        try:
            documents = []
            with pdfplumber.open(filepath) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    if not text.strip():
                        continue

                    chunks = self._chunk_text(text)
                    for i, chunk in enumerate(chunks):
                        doc_id = self._generate_doc_id(filepath, page_num * 1000 + i)
                        documents.append({
                            "id": doc_id,
                            "content": chunk,
                            "metadata": {
                                "source": str(filepath),
                                "filename": Path(filepath).name,
                                "page": page_num + 1,
                                "chunk_index": i,
                                "file_type": ".pdf"
                            }
                        })
            return documents
        except Exception as e:
            return [{
                "id": f"error_{filepath}",
                "content": f"PDF processing failed: {str(e)}",
                "metadata": {"source": filepath, "error": str(e)}
            }]

    def _process_image_file(self, filepath: str) -> List[Dict[str, Any]]:
        return [{
            "id": self._generate_doc_id(filepath, 0),
            "content": f"[Image file: {Path(filepath).name}]",
            "metadata": {
                "source": str(filepath),
                "filename": Path(filepath).name,
                "file_type": Path(filepath).suffix,
                "note": "Image content recognition requires OCR processing"
            }
        }]

    def _generate_doc_id(self, filepath: str, index: int) -> str:
        try:
            size = Path(filepath).stat().st_size
        except:
            size = 0
        unique = f"{filepath}_{index}_{size}"
        return hashlib.md5(unique.encode()).hexdigest()[:16]

    async def index_directory(self, directory: str) -> Dict[str, Any]:
        dir_path = Path(directory)
        if not dir_path.exists():
            return {"success": False, "error": "Directory not found"}

        supported_extensions = {".txt", ".md", ".pdf"}
        files = []
        for ext in supported_extensions:
            files.extend(dir_path.rglob(f"*{ext}"))

        all_documents = []
        errors = []

        for filepath in files:
            try:
                documents = self.process_file(str(filepath))
                all_documents.extend(documents)
            except Exception as e:
                errors.append({"file": str(filepath), "error": str(e)})

        if all_documents and self.vector_store:
            try:
                self.vector_store.load_documents(all_documents)
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to index documents: {str(e)}",
                    "total_files": len(files),
                    "total_documents": len(all_documents),
                    "errors": errors
                }

        return {
            "success": True,
            "total_files": len(files),
            "total_documents": len(all_documents),
            "errors": errors
        }

    def search_with_filter(self, query: str, file_type: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.vector_store:
            return []

        results = self.vector_store.search(query, top_k * 2)

        if file_type:
            results = [r for r in results if r.get("metadata", {}).get("file_type", "").lower() == file_type.lower()]

        return results[:top_k]


_knowledge_processor: Optional[KnowledgeProcessor] = None


def get_knowledge_processor(vector_store=None) -> KnowledgeProcessor:
    global _knowledge_processor
    if _knowledge_processor is None:
        _knowledge_processor = KnowledgeProcessor(vector_store)
    return _knowledge_processor


def initialize_knowledge_processor(vector_store):
    global _knowledge_processor
    _knowledge_processor = KnowledgeProcessor(vector_store)
    return _knowledge_processor