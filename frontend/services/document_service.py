from typing import Any, Dict, List, Optional
from services.api_client import get, post, delete


def list_documents() -> List[dict]:
    result = get("/documents")
    return result or []


def ingest_document(filename: str, content: str) -> Optional[Dict[str, Any]]:
    files = {"file": (filename, content.encode("utf-8"), "text/plain")}
    try:
        import httpx
        import os
        import streamlit as st
        token = st.session_state.get("token")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        response = httpx.post(
            f"{backend_url}/documents/ingest",
            headers=headers,
            files=files,
            timeout=60,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def delete_document(doc_id: str) -> bool:
    return delete(f"/documents/{doc_id}")
