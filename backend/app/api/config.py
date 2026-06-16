from __future__ import annotations

from fastapi import APIRouter

from ..services.utils.config import ConfigLoader

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
async def get_config() -> dict[str, object]:
    cfg = ConfigLoader.get_backend()
    return {
        "persist_token_in_browser": cfg.get("api", {}).get("session", {}).get("persist_token_in_browser", False),
    }
