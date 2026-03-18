from fastapi import APIRouter

from app.api.routes import (
    auth,
    chat,
    profile,
    behavior,
    recommendations,
    notifications,
    weather,
    documents,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(behavior.router, prefix="/behavior", tags=["Behavior"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
