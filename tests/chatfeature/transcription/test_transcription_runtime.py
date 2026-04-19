from __future__ import annotations

from backend.app.services.transcription_runtime import (
    TranscriptionInvokeEvent,
    TranscriptionRuntimeService,
)


class _FakeTranscriber:
    def __init__(self) -> None:
        self.calls: list[tuple[bytes, str | None, str | None]] = []

    def transcribe_chunk(
        self,
        audio_chunk: bytes,
        language: str | None = None,
        mime_type: str | None = None,
    ) -> str:
        self.calls.append((audio_chunk, language, mime_type))
        return "ok"


def test_runtime_service_invokes_underlying_transcriber() -> None:
    fake_transcriber = _FakeTranscriber()
    runtime_service = TranscriptionRuntimeService(transcriber=fake_transcriber)  # type: ignore[arg-type]

    response = runtime_service.invoke(
        TranscriptionInvokeEvent(
            audio_chunk=b"abc",
            language="de",
            mime_type="audio/webm;codecs=opus",
        )
    )

    assert response == "ok"
    assert fake_transcriber.calls == [(b"abc", "de", "audio/webm;codecs=opus")]
