from typing import Optional

from pydantic import BaseModel


class WeatherRequest(BaseModel):
    city: str


class WeatherResponse(BaseModel):
    city: str
    temperature: float
    feels_like: float
    description: str
    humidity: int
    wind_speed: float
    icon: Optional[str] = None
