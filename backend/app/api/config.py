from __future__ import annotations

from fastapi import APIRouter

from ..config import cfg

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def get_config() -> dict[str, object]:
    return {
        "persist_token_in_browser": cfg.api.persist_token_in_browser,
    }
