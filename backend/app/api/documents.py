from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.document import Document
from ..models.user import User
from ..services.core.ingestion.chunker import DocumentChunker
from ..services.core.ingestion.embedder import DocumentEmbedder, EmbeddingService
from ..services.core.ingestion.loader import DocumentLoader, UnsupportedDocumentError
from ..services.dependency.authtoken import authtoken
from ..services.dependency.vectordb import get_vector_db_client

router = APIRouter(prefix="/documents", tags=["documents"])
_logger = logging.getLogger(__name__)


class DocumentResponse(BaseModel):
    id: str
    filename: str
    chunk_count: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


def _get_document_embedder() -> DocumentEmbedder:
    try:
        collection = get_vector_db_client().get_collection()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector database is temporarily unavailable.",
        ) from exc
    return DocumentEmbedder(collection, EmbeddingService())


@router.get("", response_model=list[DocumentResponse])
@authtoken
async def list_documents(
    current_user: User,
    db: AsyncSession = Depends(get_db),
) -> list[Document]:
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    return list(result.scalars().all())


@router.post("/upload", response_model=DocumentResponse, status_code=201)
@authtoken(role="admin")
async def upload_document(
    current_user: User,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    embedder: DocumentEmbedder = Depends(_get_document_embedder),
) -> Document:
    data = await file.read()
    filename = file.filename or "upload"

    try:
        text = DocumentLoader.extract_text(filename, data)
    except UnsupportedDocumentError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: '{filename}'",
        )

    content_hash = hashlib.sha256(data).hexdigest()
    doc_id = str(uuid.uuid4())

    chunks = DocumentChunker().chunk_document(doc_id, text)
    try:
        result = embedder.upsert_chunks(chunks)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service unavailable — please retry.",
        ) from exc

    doc = Document(
        id=doc_id,
        filename=filename,
        content_hash=content_hash,
        chunk_count=result.embedded_count,
    )
    db.add(doc)
    try:
        await db.commit()
        await db.refresh(doc)
    except IntegrityError:
        await db.rollback()
        embedder.delete_by_source(doc_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A document with identical content already exists.",
        )

    return doc


@router.delete("/{doc_id}", status_code=204)
@authtoken(role="admin")
async def delete_document(
    doc_id: str,
    current_user: User,
    db: AsyncSession = Depends(get_db),
    embedder: DocumentEmbedder = Depends(_get_document_embedder),
) -> None:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    try:
        embedder.delete_by_source(doc_id)
    except Exception:
        _logger.warning("ChromaDB delete_by_source failed for doc %s — orphaned chunks may remain", doc_id)
    await db.delete(doc)
    await db.commit()
