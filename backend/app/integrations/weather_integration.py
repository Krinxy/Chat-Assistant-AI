import logging
from typing import Any, Dict

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


class WeatherClient:
    def __init__(self):
        self._api_key = settings.WEATHER_API_KEY

    async def get_weather(self, city: str) -> Dict[str, Any]:
        if not self._api_key:
            raise ValueError("WEATHER_API_KEY is not configured.")

        params = {
            "q": city,
            "appid": self._api_key,
            "units": "metric",
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(_BASE_URL, params=params)

        if response.status_code == 404:
            raise ValueError(f"City '{city}' not found.")
        response.raise_for_status()

        data = response.json()
        return {
            "city": data["name"],
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "description": data["weather"][0]["description"],
            "humidity": data["main"]["humidity"],
            "wind_speed": data["wind"]["speed"],
            "icon": data["weather"][0].get("icon"),
        }
