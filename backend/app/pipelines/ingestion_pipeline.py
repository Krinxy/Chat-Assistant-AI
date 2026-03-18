import logging
import uuid
from typing import Any, Dict

import motor.motor_asyncio

from app.integrations.embedding import EmbeddingService
from app.integrations.vector_db import VectorDBClient
from app.utils.text_utils import clean_text, chunk_text

logger = logging.getLogger(__name__)


class DocumentIngestionPipeline:
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self._db = db
        self._embedding = EmbeddingService()
        self._vector_db = VectorDBClient()

    async def run(
        self, file_content: str, filename: str, user_id: str
    ) -> Dict[str, Any]:
        # Step 1: load (already provided as string)
        # Step 2: clean
        cleaned = clean_text(file_content)
        # Step 3: chunk
        chunks = chunk_text(cleaned)
        # Step 4: embed
        embeddings = self._embedding.embed_documents(chunks)
        # Step 5: store
        doc_id = str(uuid.uuid4())
        chunk_ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
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
        await self._db["documents"].insert_one(
            {
                "doc_id": doc_id,
                "filename": filename,
                "user_id": user_id,
                "chunk_count": len(chunks),
            }
        )
        return {"doc_id": doc_id, "filename": filename, "chunks": len(chunks)}
