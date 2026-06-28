from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException

from .....config import cfg as _cfg
from ....dependency.auth import verify_ws_token
from .handler import LiveTranscriptionHandler

router = APIRouter()
session_handler = LiveTranscriptionHandler()


def _resolve_int_env(
    name: str,
    default_value: int,
    *,
    min_value: int,
    max_value: int,
) -> int:
    raw_value = os.getenv(name, "").strip()
    if len(raw_value) == 0:
        return default_value

    try:
        parsed = int(raw_value)
    except ValueError:
        return default_value

    if parsed < min_value:
        return min_value

    if parsed > max_value:
        return max_value

    return parsed


@dataclass
class _WsState:
    websocket: WebSocket
    session_id: str
    max_chunk_bytes: int
    disconnected: bool = False
    chunk_index: int = 0
    next_emit_index: int = 0
    active_language: str | None = None
    active_mime_type: str | None = None
    pending_tasks: dict[int, asyncio.Task[dict[str, Any]]] = field(default_factory=dict)
    completed_payloads: dict[int, dict[str, Any]] = field(default_factory=dict)


async def _authenticate_ws(websocket: WebSocket, timeout: float) -> bool:
    """Validate the first frame as a JWT auth payload. Closes the socket on failure."""
    try:
        auth_frame = await asyncio.wait_for(websocket.receive(), timeout=timeout)
    except asyncio.TimeoutError:
        await websocket.close(code=1008)
        return False
    except WebSocketDisconnect:
        return False

    if auth_frame.get("type") == "websocket.disconnect":
        return False

    auth_text = auth_frame.get("text")
    if not isinstance(auth_text, str):
        await websocket.close(code=1008)
        return False

    try:
        auth_data = json.loads(auth_text)
    except json.JSONDecodeError:
        await websocket.close(code=1008)
        return False

    if auth_data.get("type") != "auth":
        await websocket.close(code=1008)
        return False

    try:
        verify_ws_token(auth_data.get("token"))
    except WebSocketException:
        await websocket.close(code=1008)
        return False

    return True


async def _send(state: _WsState, payload: dict[str, Any]) -> None:
    if state.disconnected:
        return
    try:
        await state.websocket.send_json(payload)
    except (RuntimeError, WebSocketDisconnect):
        state.disconnected = True


async def _flush(state: _WsState) -> None:
    while state.next_emit_index in state.completed_payloads:
        payload = state.completed_payloads.pop(state.next_emit_index)
        if payload.get("type") != "empty":
            await _send(state, payload)
        state.next_emit_index += 1


async def _collect(state: _WsState, *, wait_for_one: bool) -> None:
    if wait_for_one and state.pending_tasks:
        await asyncio.wait(list(state.pending_tasks.values()), return_when=asyncio.FIRST_COMPLETED)

    for idx, task in list(state.pending_tasks.items()):
        if not task.done():
            continue
        try:
            state.completed_payloads[idx] = task.result()
        except Exception:  # noqa: BLE001
            state.completed_payloads[idx] = {
                "type": "chunk_error",
                "message": "Chunk transcription failed",
                "chunk_index": idx,
            }
        del state.pending_tasks[idx]

    await _flush(state)


async def _handle_control(
    state: _WsState,
    payload: dict[str, Any],
    max_inflight_chunks: int,
) -> bool:
    """Dispatch a text-frame control message. Returns True when the loop should stop."""
    payload_type = payload.get("type")

    if payload_type == "start":
        language = payload.get("language")
        state.active_language = session_handler.normalize_language(language if isinstance(language, str) else None)
        mime_type = payload.get("mime_type")
        if isinstance(mime_type, str) and mime_type.strip():
            state.active_mime_type = mime_type.strip().lower()
        else:
            state.active_mime_type = None

        await _send(
            state,
            {
                "type": "started",
                "language": state.active_language,
                "mime_type": state.active_mime_type,
                "max_inflight_chunks": max_inflight_chunks,
            },
        )
        return False

    if payload_type == "stop":
        await _send(state, {"type": "stopped"})
        return True

    return False


async def _handle_audio(
    state: _WsState,
    audio_data: bytes,
    max_inflight_chunks: int,
) -> None:
    if len(audio_data) == 0:
        return

    if len(audio_data) > state.max_chunk_bytes:
        await _send(state, {"type": "error", "message": "Audio chunk too large"})
        return

    current_index = state.chunk_index
    state.chunk_index += 1
    state.pending_tasks[current_index] = asyncio.create_task(
        session_handler.transcribe_chunk(
            session_id=state.session_id,
            audio_chunk=audio_data,
            chunk_index=current_index,
            language=state.active_language,
            mime_type=state.active_mime_type,
        )
    )

    if len(state.pending_tasks) >= max_inflight_chunks:
        await _collect(state, wait_for_one=True)


@router.websocket("/ws/transcribe")
async def transcribe_audio(websocket: WebSocket) -> None:
    await websocket.accept()

    if os.getenv("AUTH_MODE", "").lower() != "mock":
        if not await _authenticate_ws(websocket, _cfg.api.ws_auth_timeout_seconds):
            return

    session_id = session_handler.open_session()

    receive_poll_ms = _resolve_int_env(
        "TRANSCRIPTION_RECEIVE_POLL_MS",
        _cfg.transcription.receive_poll_ms,
        min_value=_cfg.transcription.receive_poll_ms_min,
        max_value=_cfg.transcription.receive_poll_ms_max,
    )
    max_inflight_chunks = _resolve_int_env(
        "TRANSCRIPTION_MAX_INFLIGHT_CHUNKS",
        session_handler.recommended_max_inflight_chunks(),
        min_value=_cfg.transcription.max_inflight_chunks_min,
        max_value=_cfg.transcription.max_inflight_chunks_max,
    )

    state = _WsState(
        websocket=websocket,
        session_id=session_id,
        max_chunk_bytes=_cfg.api.max_audio_chunk_bytes,
    )

    await _send(
        state,
        {
            "type": "ready",
            "message": "socket-connected",
            "session_id": session_id,
            "max_inflight_chunks": max_inflight_chunks,
        },
    )

    try:
        while True:
            await _collect(state, wait_for_one=False)

            try:
                frame = await asyncio.wait_for(websocket.receive(), timeout=receive_poll_ms / 1000)
            except asyncio.TimeoutError:
                continue

            if frame.get("type") == "websocket.disconnect":
                state.disconnected = True
                break

            text_data = frame.get("text")
            bytes_data = frame.get("bytes")

            if isinstance(text_data, str):
                try:
                    payload = json.loads(text_data)
                except json.JSONDecodeError:
                    await _send(state, {"type": "error", "message": "Invalid control payload"})
                    continue

                if await _handle_control(state, payload, max_inflight_chunks):
                    break
                continue

            if isinstance(bytes_data, (bytes, bytearray)):
                await _handle_audio(state, bytes(bytes_data), max_inflight_chunks)

    except WebSocketDisconnect:
        state.disconnected = True
    finally:
        while state.pending_tasks:
            await _collect(state, wait_for_one=True)

        session_handler.close_session(session_id)
