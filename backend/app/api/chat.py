from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter

from ..models.user import User
from ..services.dependency.authtoken import authtoken

router = APIRouter(prefix="/chat", tags=["chat"])


@dataclass
class ChatRequest:
    message: str


@dataclass
class ChatResponse:
    status: str
    user: str
    message: str


@router.post("", response_model=ChatResponse)
@authtoken
async def chat(body: ChatRequest, current_user: User) -> ChatResponse:
    # Stub — RAG implementation replaces this body in a later ticket
    return ChatResponse(status="stub", user=current_user.email, message=body.message)
