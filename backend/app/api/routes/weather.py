from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
import motor.motor_asyncio

from app.core.dependencies import get_db, get_current_user
from app.schemas.weather import WeatherResponse
from app.services.weather_service import WeatherService

router = APIRouter()


@router.get("", response_model=WeatherResponse)
async def get_weather(
    city: str = Query(..., description="City name"),
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = WeatherService(db)
    try:
        data = await service.get_weather(city)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return WeatherResponse(**data)


@router.get("/locations", response_model=List[str])
async def get_locations(
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = WeatherService(db)
    return await service.get_saved_locations(str(current_user["_id"]))


@router.post("/locations", status_code=201)
async def add_location(
    city: str = Query(..., description="City to save"),
    current_user: dict = Depends(get_current_user),
    db: motor.motor_asyncio.AsyncIOMotorDatabase = Depends(get_db),
):
    service = WeatherService(db)
    await service.add_location(str(current_user["_id"]), city)
    return {"message": f"Location '{city}' added."}
