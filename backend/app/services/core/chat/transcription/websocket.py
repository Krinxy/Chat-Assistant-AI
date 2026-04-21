from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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


@router.websocket("/ws/transcribe")
async def transcribe_audio(websocket: WebSocket) -> None:
    session_id = session_handler.open_session()

    receive_poll_ms = _resolve_int_env(
        "TRANSCRIPTION_RECEIVE_POLL_MS",
        120,
        min_value=40,
        max_value=1000,
    )
    max_inflight_chunks = _resolve_int_env(
        "TRANSCRIPTION_MAX_INFLIGHT_CHUNKS",
        session_handler.recommended_max_inflight_chunks(),
        min_value=1,
        max_value=8,
    )

    await websocket.accept()

    disconnected = False
    chunk_index = 0
    next_emit_index = 0
    active_language: str | None = None
    active_mime_type: str | None = None
    pending_tasks: dict[int, asyncio.Task[dict[str, Any]]] = {}
    completed_payloads: dict[int, dict[str, Any]] = {}

    async def _send_payload(payload: dict[str, Any]) -> None:
        nonlocal disconnected
        if disconnected:
            return

        try:
            await websocket.send_json(payload)
        except (RuntimeError, WebSocketDisconnect):
            disconnected = True

    async def _flush_completed_payloads() -> None:
        nonlocal next_emit_index

        while next_emit_index in completed_payloads:
            payload = completed_payloads.pop(next_emit_index)
            if payload.get("type") != "empty":
                await _send_payload(payload)
            next_emit_index += 1

    async def _collect_finished_tasks(wait_for_one: bool) -> None:
        if wait_for_one and len(pending_tasks) > 0:
            await asyncio.wait(
                list(pending_tasks.values()),
                return_when=asyncio.FIRST_COMPLETED,
            )

        for current_index, current_task in list(pending_tasks.items()):
            if not current_task.done():
                continue

            try:
                completed_payloads[current_index] = current_task.result()
            except Exception:  # noqa: BLE001
                completed_payloads[current_index] = {
                    "type": "chunk_error",
                    "message": "Chunk transcription failed",
                    "chunk_index": current_index,
                }

            del pending_tasks[current_index]

        await _flush_completed_payloads()

    async def _run_chunk_transcription(
        current_chunk_index: int,
        audio_chunk: bytes,
        language: str | None,
        mime_type: str | None,
    ) -> dict[str, Any]:
        return await session_handler.transcribe_chunk(
            session_id=session_id,
            audio_chunk=audio_chunk,
            chunk_index=current_chunk_index,
            language=language,
            mime_type=mime_type,
        )

    await _send_payload(
        {
            "type": "ready",
            "message": "socket-connected",
            "session_id": session_id,
            "max_inflight_chunks": max_inflight_chunks,
        }
    )

    try:
        while True:
            await _collect_finished_tasks(wait_for_one=False)

            try:
                frame = await asyncio.wait_for(
                    websocket.receive(),
                    timeout=receive_poll_ms / 1000,
                )
            except asyncio.TimeoutError:
                continue

            if frame.get("type") == "websocket.disconnect":
                disconnected = True
                break

            text_data = frame.get("text")
            bytes_data = frame.get("bytes")

            if isinstance(text_data, str):
                try:
                    payload = json.loads(text_data)
                except json.JSONDecodeError:
                    await _send_payload(
                        {
                            "type": "error",
                            "message": "Invalid control payload",
                        }
                    )
                    continue

                payload_type = payload.get("type")
                if payload_type == "start":
                    language = payload.get("language")
                    active_language = session_handler.normalize_language(language if isinstance(language, str) else None)

                    mime_type = payload.get("mime_type")
                    if isinstance(mime_type, str) and len(mime_type.strip()) > 0:
                        active_mime_type = mime_type.strip().lower()
                    else:
                        active_mime_type = None

                    await _send_payload(
                        {
                            "type": "started",
                            "language": active_language,
                            "mime_type": active_mime_type,
                            "max_inflight_chunks": max_inflight_chunks,
                        }
                    )
                    continue

                if payload_type == "stop":
                    await _send_payload({"type": "stopped"})
                    break

                continue

            if not isinstance(bytes_data, (bytes, bytearray)):
                continue

            audio_chunk = bytes(bytes_data)
            if len(audio_chunk) == 0:
                continue

            current_chunk_index = chunk_index
            chunk_index += 1
            pending_tasks[current_chunk_index] = asyncio.create_task(
                _run_chunk_transcription(
                    current_chunk_index,
                    audio_chunk,
                    active_language,
                    active_mime_type,
                )
            )

            if len(pending_tasks) >= max_inflight_chunks:
                await _collect_finished_tasks(wait_for_one=True)
    except WebSocketDisconnect:
        disconnected = True
    finally:
        while len(pending_tasks) > 0:
            await _collect_finished_tasks(wait_for_one=True)

        session_handler.close_session(session_id)
