import logging
import uuid
from typing import Any, Dict, List

import motor.motor_asyncio

from app.integrations.embedding import EmbeddingService
from app.integrations.vector_db import VectorDBClient
from app.utils.text_utils import clean_text, chunk_text

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._db = db
        self._embedding = EmbeddingService()
        self._vector_db = VectorDBClient()

    async def ingest_document(
        self, file_content: str, filename: str, user_id: str
    ) -> Dict[str, Any]:
        doc_id = str(uuid.uuid4())
        cleaned = clean_text(file_content)
        chunks = chunk_text(cleaned)

        chunk_ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        embeddings = self._embedding.embed_documents(chunks)
        metadatas = [
            {"user_id": user_id, "doc_id": doc_id, "filename": filename, "chunk": i}
            for i in range(len(chunks))
        ]

        self._vector_db.add_documents(
            ids=chunk_ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        record = {
            "doc_id": doc_id,
            "filename": filename,
            "user_id": user_id,
            "chunk_count": len(chunks),
        }
        await self._db["documents"].insert_one(record)
        return {"doc_id": doc_id, "filename": filename, "chunks": len(chunks)}

    async def list_documents(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self._db["documents"].find({"user_id": user_id}, {"_id": 0})
        return [doc async for doc in cursor]

    async def delete_document(self, doc_id: str, user_id: str) -> bool:
        result = await self._db["documents"].delete_one(
            {"doc_id": doc_id, "user_id": user_id}
        )
        if result.deleted_count > 0:
            self._vector_db.delete_where({"doc_id": doc_id, "user_id": user_id})
            return True
        return False
