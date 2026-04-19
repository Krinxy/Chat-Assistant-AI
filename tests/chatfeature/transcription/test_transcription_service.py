from __future__ import annotations

import builtins
import sys

import numpy as np
import pytest

import backend.app.services.core.chat.transcription.transcriber as transcription_module
from backend.app.services.core.chat.transcription.transcriber import (
    WhisperChunkTranscriber,
    WhisperDependenciesMissingError,
    WhisperInferenceError,
    WhisperRuntimeConfig,
)


class _FakePipeline:
    def __init__(
        self,
        response: dict[str, str] | None = None,
        should_raise: bool = False,
    ) -> None:
        self.response = response or {"text": " hello world "}
        self.should_raise = should_raise
        self.calls: list[tuple[object, dict[str, object]]] = []

    def __call__(self, audio_chunk: object, **kwargs: object) -> dict[str, str]:
        self.calls.append((audio_chunk, kwargs))
        if self.should_raise:
            raise RuntimeError("pipeline failure")
        return self.response


class _BytesFailingPipeline:
    def __init__(self) -> None:
        self.calls: list[tuple[object, dict[str, object]]] = []

    def __call__(self, audio_chunk: object, **kwargs: object) -> dict[str, str]:
        self.calls.append((audio_chunk, kwargs))

        if isinstance(audio_chunk, (bytes, bytearray)):
            raise RuntimeError("byte-decode-failed")

        return {"text": " recovered transcript "}


def test_transcribe_chunk_returns_stripped_text_and_language_kwargs() -> None:
    fake_pipeline = _FakePipeline()
    transcriber = WhisperChunkTranscriber(pipeline_factory=lambda: fake_pipeline)

    result = transcriber.transcribe_chunk(b"bytes", language="de-DE")

    assert result == "hello world"
    assert fake_pipeline.calls[0][1] == {
        "generate_kwargs": {"language": "de", "task": "transcribe"}
    }


def test_transcribe_chunk_short_circuits_empty_payload() -> None:
    fake_pipeline = _FakePipeline()
    transcriber = WhisperChunkTranscriber(pipeline_factory=lambda: fake_pipeline)

    assert transcriber.transcribe_chunk(b"") == ""
    assert fake_pipeline.calls == []


def test_transcribe_chunk_wraps_pipeline_failure() -> None:
    transcriber = WhisperChunkTranscriber(
        pipeline_factory=lambda: _FakePipeline(should_raise=True)
    )

    with pytest.raises(WhisperInferenceError):
        transcriber.transcribe_chunk(b"broken-audio")


def test_transcribe_chunk_uses_ffmpeg_decode_fallback_for_failed_byte_input(monkeypatch) -> None:
    fallback_pipeline = _FakePipeline(response={"text": " recovered transcript "})
    transcriber = WhisperChunkTranscriber(pipeline_factory=lambda: fallback_pipeline)

    monkeypatch.setattr(
        transcription_module,
        "_decode_audio_chunk_with_ffmpeg",
        lambda _chunk, mime_type, sampling_rate: np.array([0.1, -0.1], dtype=np.float32),
    )

    result = transcriber.transcribe_chunk(
        b"broken-audio",
        language="en-US",
        mime_type="audio/webm;codecs=opus",
    )

    assert result == "recovered transcript"
    assert len(fallback_pipeline.calls) == 1
    assert isinstance(fallback_pipeline.calls[0][0], dict)


def test_transcribe_chunk_falls_back_to_direct_bytes_when_predecode_fails(monkeypatch) -> None:
    fallback_pipeline = _FakePipeline(response={"text": " direct bytes transcript "})
    transcriber = WhisperChunkTranscriber(pipeline_factory=lambda: fallback_pipeline)

    def _raise_decode_error(_chunk: bytes, mime_type: str | None, sampling_rate: int):
        _ = mime_type
        _ = sampling_rate
        raise ValueError("decode failed")

    monkeypatch.setattr(
        transcription_module,
        "_decode_audio_chunk_with_ffmpeg",
        _raise_decode_error,
    )

    result = transcriber.transcribe_chunk(
        b"broken-audio",
        language="de-DE",
        mime_type="audio/webm;codecs=opus",
    )

    assert result == "direct bytes transcript"
    assert len(fallback_pipeline.calls) == 1
    assert isinstance(fallback_pipeline.calls[0][0], bytes)


def test_resolve_ffmpeg_input_format_maps_known_mime_types() -> None:
    assert transcription_module._resolve_ffmpeg_input_format("audio/webm;codecs=opus") == "webm"
    assert transcription_module._resolve_ffmpeg_input_format("audio/mp4") == "mp4"
    assert transcription_module._resolve_ffmpeg_input_format("audio/unknown") is None


def test_transcriber_initializes_pipeline_once() -> None:
    fake_pipeline = _FakePipeline()
    load_counter = {"count": 0}

    def _factory() -> _FakePipeline:
        load_counter["count"] += 1
        return fake_pipeline

    transcriber = WhisperChunkTranscriber(pipeline_factory=_factory)

    assert transcriber.transcribe_chunk(b"chunk-1") == "hello world"
    assert transcriber.transcribe_chunk(b"chunk-2") == "hello world"
    assert load_counter["count"] == 1


def test_transcriber_uses_fake_fallback_when_dependencies_are_missing(monkeypatch) -> None:
    original_import = builtins.__import__

    def _failing_import(name: str, *args: object, **kwargs: object):
        root_name = name.split(".", maxsplit=1)[0]
        if root_name in {"torch", "transformers"}:
            raise ImportError("missing optional deps")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _failing_import)

    transcriber = WhisperChunkTranscriber(
        config=WhisperRuntimeConfig(
            enable_fake_fallback=True,
            fake_transcript_text="fallback transcript",
        )
    )

    assert transcriber.transcribe_chunk(b"audio") == "fallback transcript"


def test_transcriber_raises_when_dependencies_missing_and_fallback_disabled(monkeypatch) -> None:
    original_import = builtins.__import__

    def _failing_import(name: str, *args: object, **kwargs: object):
        root_name = name.split(".", maxsplit=1)[0]
        if root_name in {"torch", "transformers"}:
            raise ImportError("missing optional deps")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _failing_import)

    transcriber = WhisperChunkTranscriber(
        config=WhisperRuntimeConfig(enable_fake_fallback=False)
    )

    with pytest.raises(WhisperDependenciesMissingError):
        transcriber.transcribe_chunk(b"audio")


def test_resolve_ffmpeg_binary_path_prefers_system_path(monkeypatch) -> None:
    transcription_module._resolve_ffmpeg_binary_path.cache_clear()
    monkeypatch.setattr(transcription_module.shutil, "which", lambda _name: "C:/ffmpeg/bin/ffmpeg.exe")

    assert transcription_module._resolve_ffmpeg_binary_path() == "C:/ffmpeg/bin/ffmpeg.exe"


def test_resolve_ffmpeg_binary_path_uses_imageio_fallback(monkeypatch) -> None:
    transcription_module._resolve_ffmpeg_binary_path.cache_clear()
    monkeypatch.setattr(transcription_module.shutil, "which", lambda _name: None)

    class _ImageioFfmpegModule:
        @staticmethod
        def get_ffmpeg_exe() -> str:
            return "D:/cache/imageio/ffmpeg.exe"

    monkeypatch.setitem(sys.modules, "imageio_ffmpeg", _ImageioFfmpegModule())

    assert transcription_module._resolve_ffmpeg_binary_path() == "D:/cache/imageio/ffmpeg.exe"


def test_resolve_torch_runtime_prefers_cuda() -> None:
    class _CudaModule:
        @staticmethod
        def is_available() -> bool:
            return True

    class _TorchModule:
        float16 = "float16"
        float32 = "float32"
        bfloat16 = "bfloat16"
        cuda = _CudaModule()
        xpu = None
        backends = type("_Backends", (), {"mps": None})

    runtime = transcription_module._resolve_torch_runtime(_TorchModule())

    assert runtime.device == "cuda:0"
    assert runtime.dtype == "float16"


def test_resolve_torch_runtime_uses_mps_when_available() -> None:
    class _CudaModule:
        @staticmethod
        def is_available() -> bool:
            return False

    class _MpsModule:
        @staticmethod
        def is_available() -> bool:
            return True

    class _TorchModule:
        float16 = "float16"
        float32 = "float32"
        bfloat16 = "bfloat16"
        cuda = _CudaModule()
        xpu = None
        backends = type("_Backends", (), {"mps": _MpsModule()})

    runtime = transcription_module._resolve_torch_runtime(_TorchModule())

    assert runtime.device == "mps"
    assert runtime.dtype == "float16"


def test_resolve_dtype_kwarg_name_prefers_dtype_when_supported() -> None:
    def _call_with_dtype(*, dtype: object) -> None:
        _ = dtype

    resolved = transcription_module._resolve_dtype_kwarg_name(_call_with_dtype)

    assert resolved == "dtype"


def test_resolve_dtype_kwarg_name_uses_torch_dtype_for_legacy_signatures() -> None:
    def _legacy_call(*, torch_dtype: object) -> None:
        _ = torch_dtype

    resolved = transcription_module._resolve_dtype_kwarg_name(_legacy_call)

    assert resolved == "torch_dtype"


def test_load_model_with_dtype_prefers_new_kwarg_when_supported() -> None:
    observed_kwargs: dict[str, object] = {}

    def _loader(_model_id: str, **kwargs: object) -> object:
        observed_kwargs.update(kwargs)
        return object()

    _ = transcription_module._load_model_with_dtype(
        _loader,
        model_id="openai/whisper-large-v3-turbo",
        runtime_dtype="float16",
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )

    assert observed_kwargs["dtype"] == "float16"
    assert "torch_dtype" not in observed_kwargs


def test_load_model_with_dtype_falls_back_to_legacy_kwarg() -> None:
    observed_calls: list[dict[str, object]] = []

    def _legacy_loader(_model_id: str, **kwargs: object) -> object:
        observed_calls.append(kwargs)
        if "dtype" in kwargs:
            raise TypeError("unexpected dtype kwarg")
        return object()

    _ = transcription_module._load_model_with_dtype(
        _legacy_loader,
        model_id="openai/whisper-large-v3-turbo",
        runtime_dtype="float16",
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )

    assert len(observed_calls) == 2
    assert "dtype" in observed_calls[0]
    assert "torch_dtype" in observed_calls[1]


def test_reset_pipeline_call_count_resets_after_threshold() -> None:
    pipeline = type("_Pipeline", (), {"call_count": 12})()

    transcription_module._reset_pipeline_call_count(pipeline)

    assert pipeline.call_count == 0
