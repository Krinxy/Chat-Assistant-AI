from typing import Optional
from services.api_client import post


def register(email: str, username: str, password: str) -> Optional[dict]:
    return post("/auth/register", json={"email": email, "username": username, "password": password})


def login(email: str, password: str) -> Optional[dict]:
    return post("/auth/login", json={"email": email, "password": password})
