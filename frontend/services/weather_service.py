from typing import List, Optional
from services.api_client import get, post


def get_weather(city: str) -> Optional[dict]:
    return get("/weather", params={"city": city})


def get_saved_locations() -> List[str]:
    result = get("/weather/locations")
    return result or []


def add_location(city: str) -> Optional[dict]:
    return post(f"/weather/locations?city={city}")
