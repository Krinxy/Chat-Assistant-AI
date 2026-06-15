from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter

from ..models.user import User
from ..services.dependency.authtoken import authtoken

router = APIRouter(prefix="/documents", tags=["documents"])


@dataclass
class StubResponse:
    status: str


@router.get("", response_model=list[StubResponse])
@authtoken
async def list_documents(current_user: User) -> list[StubResponse]:
    # Stub — RAG implementation replaces this body in a later ticket
    return [StubResponse(status="stub")]


@router.post("", response_model=StubResponse, status_code=201)
@authtoken(role="admin")
async def upload_document(current_user: User) -> StubResponse:
    return StubResponse(status="stub")


@router.delete("/{doc_id}", response_model=StubResponse)
@authtoken(role="admin")
async def delete_document(doc_id: str, current_user: User) -> StubResponse:
    return StubResponse(status="stub")
