from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.chat import ChatRequest, ChatResponse, MessageSchema
from app.services.orchestrator_service import OrchestratorService
from app.services.chat_service import ChatService

router = APIRouter()


@router.post("/session", status_code=status.HTTP_201_CREATED)
async def create_session(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = ChatService(db)
    session = await service.create_session(str(current_user["_id"]))
    return {"session_id": str(session["_id"])}


@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = OrchestratorService(db)
    result = await service.process(
        user_id=str(current_user["_id"]),
        message=payload.message,
        session_id=payload.session_id,
    )
    return ChatResponse(
        session_id=result["session_id"],
        message=result["message"],
        role=result.get("role", "assistant"),
    )


@router.get("/history/{session_id}", response_model=List[MessageSchema])
async def get_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = ChatService(db)
    messages = await service.get_chat_history(
        user_id=str(current_user["_id"]), session_id=session_id
    )
    return [
        MessageSchema(role=m["role"], content=m["content"], created_at=m.get("created_at"))
        for m in messages
    ]
