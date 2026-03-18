from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.services.document_service import DocumentService

router = APIRouter()


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400, detail="File must be UTF-8 encoded text."
        )
    service = DocumentService(db)
    result = await service.ingest_document(
        file_content=content,
        filename=file.filename or "unknown",
        user_id=str(current_user["_id"]),
    )
    return result


@router.get("", response_model=List[Dict[str, Any]])
async def list_documents(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = DocumentService(db)
    return await service.list_documents(str(current_user["_id"]))


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = DocumentService(db)
    deleted = await service.delete_document(doc_id, str(current_user["_id"]))
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
