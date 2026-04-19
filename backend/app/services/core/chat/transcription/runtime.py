from __future__ import annotations

from dataclasses import dataclass
from threading import Lock

from .transcriber import WhisperChunkTranscriber


@dataclass(frozen=True)
class TranscriptionInvokeEvent:
    audio_chunk: bytes
    language: str | None = None
    mime_type: str | None = None


class TranscriptionRuntimeService:
    """Runtime service that behaves like a local lambda invocation target."""

    def __init__(self, transcriber: WhisperChunkTranscriber | None = None) -> None:
        self._transcriber = transcriber or WhisperChunkTranscriber()
        self._accelerated_invoke_lock = Lock()

    def preload(self) -> None:
        self._transcriber.ensure_loaded()

    @property
    def runtime_device(self) -> str | None:
        runtime_device = getattr(self._transcriber, "runtime_device", None)
        return runtime_device if isinstance(runtime_device, str) else None

    def recommended_max_inflight_chunks(self) -> int:
        device = self.runtime_device
        if device is None:
            return 1

        normalized = device.lower()
        if normalized.startswith("cuda") or normalized.startswith("mps") or normalized.startswith("xpu"):
            return 1

        return 2

    def invoke(self, event: TranscriptionInvokeEvent) -> str:
        # Accelerated backends can be unstable when sharing one pipeline instance across threads.
        device = self.runtime_device
        if device is not None:
            normalized = device.lower()
            if normalized.startswith("cuda") or normalized.startswith("mps") or normalized.startswith("xpu"):
                with self._accelerated_invoke_lock:
                    return self._transcriber.transcribe_chunk(
                        audio_chunk=event.audio_chunk,
                        language=event.language,
                        mime_type=event.mime_type,
                    )

        return self._transcriber.transcribe_chunk(
            audio_chunk=event.audio_chunk,
            language=event.language,
            mime_type=event.mime_type,
        )


runtime_service = TranscriptionRuntimeService()


def invoke_local_transcription_lambda(
    audio_chunk: bytes,
    language: str | None = None,
    mime_type: str | None = None,
) -> str:
    event = TranscriptionInvokeEvent(
        audio_chunk=audio_chunk,
        language=language,
        mime_type=mime_type,
    )
    return runtime_service.invoke(event)
