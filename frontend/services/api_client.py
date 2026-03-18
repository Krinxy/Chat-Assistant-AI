import os
from typing import Any, Dict, Optional

import httpx
import streamlit as st

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
TIMEOUT = 30


def _get_headers() -> Dict[str, str]:
    token = st.session_state.get("token")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def get(endpoint: str, params: Optional[Dict] = None) -> Optional[Any]:
    try:
        response = httpx.get(
            f"{BACKEND_URL}{endpoint}",
            headers=_get_headers(),
            params=params,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def post(
    endpoint: str,
    json: Optional[Dict] = None,
    data: Optional[Dict] = None,
    files: Optional[Dict] = None,
) -> Optional[Any]:
    try:
        response = httpx.post(
            f"{BACKEND_URL}{endpoint}",
            headers=_get_headers(),
            json=json,
            data=data,
            files=files,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def put(endpoint: str, json: Optional[Dict] = None) -> Optional[Any]:
    try:
        response = httpx.put(
            f"{BACKEND_URL}{endpoint}",
            headers=_get_headers(),
            json=json,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def delete(endpoint: str) -> bool:
    try:
        response = httpx.delete(
            f"{BACKEND_URL}{endpoint}",
            headers=_get_headers(),
            timeout=TIMEOUT,
        )
        return response.status_code == 204
    except Exception:
        return False
