from __future__ import annotations

import inspect
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from functools import lru_cache
from threading import Lock
from typing import Any, Callable

import numpy as np


class WhisperDependenciesMissingError(RuntimeError):
    """Raised when optional Whisper runtime dependencies are unavailable."""


class WhisperInferenceError(RuntimeError):
    """Raised when Whisper fails to transcribe a provided chunk."""


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}


def _resolve_fake_transcript_text() -> str:
    return os.getenv("WHISPER_FAKE_TRANSCRIPT_TEXT", "").strip()


def _resolve_model_revision() -> str:
    raw_revision = os.getenv("WHISPER_MODEL_REVISION", "main").strip()
    return raw_revision if len(raw_revision) > 0 else "main"


@lru_cache(maxsize=1)
def _resolve_ffmpeg_binary_path() -> str | None:
    resolved_from_path = shutil.which("ffmpeg")
    if resolved_from_path is not None:
        return resolved_from_path

    try:
        import imageio_ffmpeg
    except ImportError:
        return None

    try:
        resolved_from_imageio = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        return None

    if not isinstance(resolved_from_imageio, str):
        return None

    normalized = resolved_from_imageio.strip()
    return normalized if len(normalized) > 0 else None


def _normalize_mime_type(mime_type: str | None) -> str | None:
    if mime_type is None:
        return None

    normalized = mime_type.strip().lower()
    if len(normalized) == 0:
        return None

    return normalized.split(";", maxsplit=1)[0]


def _resolve_ffmpeg_input_format(mime_type: str | None) -> str | None:
    normalized = _normalize_mime_type(mime_type)
    if normalized is None:
        return None

    mime_to_format = {
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
    }
    return mime_to_format.get(normalized)


def _prefers_ffmpeg_predecode(mime_type: str | None) -> bool:
    return _resolve_ffmpeg_input_format(mime_type) is not None


def _decode_audio_chunk_with_ffmpeg(
    audio_chunk: bytes,
    *,
    mime_type: str | None,
    sampling_rate: int,
) -> np.ndarray:
    ffmpeg_binary_path = _resolve_ffmpeg_binary_path()
    if ffmpeg_binary_path is None:
        raise ValueError("ffmpeg binary was not found and is required for audio decoding")

    ffmpeg_command = [ffmpeg_binary_path]
    input_format = _resolve_ffmpeg_input_format(mime_type)
    if input_format is not None:
        ffmpeg_command.extend(["-f", input_format])

    ffmpeg_command.extend(
        [
            "-i",
            "pipe:0",
            "-ac",
            "1",
            "-ar",
            f"{sampling_rate}",
            "-f",
            "f32le",
            "-hide_banner",
            "-loglevel",
            "error",
            "pipe:1",
        ]
    )

    try:
        with subprocess.Popen(
            ffmpeg_command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        ) as ffmpeg_process:
            out_bytes, err_bytes = ffmpeg_process.communicate(audio_chunk)
            return_code = ffmpeg_process.returncode
    except FileNotFoundError as error:
        raise ValueError(
            "ffmpeg binary was not found and is required for audio decoding"
        ) from error

    if return_code not in (0, None):
        stderr_text = err_bytes.decode("utf-8", errors="ignore").strip()
        raise ValueError(
            "ffmpeg decode failed"
            + (f": {stderr_text}" if len(stderr_text) > 0 else "")
        )

    audio = np.frombuffer(out_bytes, np.float32)
    if audio.shape[0] == 0:
        raise ValueError("decoded audio chunk is empty")

    return audio


def _patch_transformers_ffmpeg_reader(
    audio_utils_module: Any,
    ffmpeg_binary_path: str,
) -> None:
    if getattr(audio_utils_module, "_aura_ffmpeg_patched", False):
        return

    def _patched_ffmpeg_read(bpayload: bytes, sampling_rate: int) -> np.ndarray:
        ffmpeg_command = [
            ffmpeg_binary_path,
            "-i",
            "pipe:0",
            "-ac",
            "1",
            "-ar",
            f"{sampling_rate}",
            "-f",
            "f32le",
            "-hide_banner",
            "-loglevel",
            "quiet",
            "pipe:1",
        ]

        try:
            with subprocess.Popen(
                ffmpeg_command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
            ) as ffmpeg_process:
                output_stream = ffmpeg_process.communicate(bpayload)
        except FileNotFoundError as error:
            raise ValueError(
                "ffmpeg binary was not found and is required for audio decoding"
            ) from error

        out_bytes = output_stream[0]
        audio = np.frombuffer(out_bytes, np.float32)
        if audio.shape[0] == 0:
            raise ValueError(
                "Soundfile is either malformed or unsupported by the current decoder"
            )

        return audio

    setattr(audio_utils_module, "ffmpeg_read", _patched_ffmpeg_read)
    setattr(audio_utils_module, "_aura_ffmpeg_patched", True)


@dataclass(frozen=True)
class TorchRuntimeSelection:
    device: str
    dtype: Any


def _resolve_torch_runtime(torch_module: Any) -> TorchRuntimeSelection:
    float32_dtype = getattr(torch_module, "float32", None)
    float16_dtype = getattr(torch_module, "float16", float32_dtype)
    bfloat16_dtype = getattr(torch_module, "bfloat16", float16_dtype)

    cuda_module = getattr(torch_module, "cuda", None)
    cuda_available = callable(getattr(cuda_module, "is_available", None))
    if cuda_available:
        try:
            if bool(cuda_module.is_available()):
                return TorchRuntimeSelection(device="cuda:0", dtype=float16_dtype)
        except Exception:  # noqa: BLE001
            pass

    xpu_module = getattr(torch_module, "xpu", None)
    xpu_available = callable(getattr(xpu_module, "is_available", None))
    if xpu_available:
        try:
            if bool(xpu_module.is_available()):
                return TorchRuntimeSelection(device="xpu:0", dtype=bfloat16_dtype)
        except Exception:  # noqa: BLE001
            pass

    backends_module = getattr(torch_module, "backends", None)
    mps_module = getattr(backends_module, "mps", None)
    mps_available = callable(getattr(mps_module, "is_available", None))
    if mps_available:
        try:
            if bool(mps_module.is_available()):
                return TorchRuntimeSelection(device="mps", dtype=float16_dtype)
        except Exception:  # noqa: BLE001
            pass

    return TorchRuntimeSelection(device="cpu", dtype=float32_dtype)


def _resolve_dtype_kwarg_name(callable_target: Callable[..., Any]) -> str:
    try:
        parameters = inspect.signature(callable_target).parameters
    except (TypeError, ValueError):
        return "torch_dtype"

    if "dtype" in parameters:
        return "dtype"

    if "torch_dtype" in parameters:
        return "torch_dtype"

    return "torch_dtype"


def _load_model_with_dtype(
    model_loader: Callable[..., Any],
    *,
    model_id: str,
    model_revision: str = "main",
    runtime_dtype: Any,
    low_cpu_mem_usage: bool,
    use_safetensors: bool,
) -> Any:
    base_load_kwargs = {
        "low_cpu_mem_usage": low_cpu_mem_usage,
        "use_safetensors": use_safetensors,
        "revision": model_revision,
    }

    try:
        return model_loader(
            model_id,
            dtype=runtime_dtype,
            **base_load_kwargs,
        )
    except TypeError:
        return model_loader(
            model_id,
            torch_dtype=runtime_dtype,
            **base_load_kwargs,
        )


def _reset_pipeline_call_count(pipe: Any) -> None:
    call_count = getattr(pipe, "call_count", None)
    if isinstance(call_count, int) and call_count >= 8:
        setattr(pipe, "call_count", 0)


@dataclass(frozen=True)
class WhisperRuntimeConfig:
    model_id: str = field(
        default_factory=lambda: os.getenv("WHISPER_MODEL_ID", "openai/whisper-large-v3-turbo")
    )
    model_revision: str = field(default_factory=_resolve_model_revision)
    low_cpu_mem_usage: bool = True
    use_safetensors: bool = True
    enable_fake_fallback: bool = field(
        default_factory=lambda: _parse_bool_env("WHISPER_ENABLE_FAKE_FALLBACK", True)
    )
    fake_transcript_text: str = field(default_factory=_resolve_fake_transcript_text)


PipelineFactory = Callable[[], Any]


def _normalize_language(language: str | None) -> str | None:
    if language is None:
        return None

    normalized = language.strip().lower()
    if len(normalized) == 0:
        return None

    if "-" in normalized:
        return normalized.split("-", maxsplit=1)[0]

    return normalized


class WhisperChunkTranscriber:
    """Lazy-loading wrapper around a HuggingFace Whisper transcription pipeline."""

    def __init__(
        self,
        config: WhisperRuntimeConfig | None = None,
        pipeline_factory: PipelineFactory | None = None,
    ) -> None:
        self._config = config or WhisperRuntimeConfig()
        self._pipeline_factory = pipeline_factory or self._build_pipeline
        self._pipeline: Any | None = None
        self._pipeline_lock = Lock()
        self._runtime_device: str | None = None

    @property
    def runtime_device(self) -> str | None:
        return self._runtime_device

    def ensure_loaded(self) -> None:
        self._get_pipeline()

    def _build_fake_pipeline(self) -> Any:
        fallback_text = self._config.fake_transcript_text
        self._runtime_device = "fake"

        def _fake_pipeline(_audio_chunk: Any, **_kwargs: Any) -> dict[str, str]:
            return {"text": fallback_text}

        return _fake_pipeline

    def _build_pipeline(self) -> Any:
        try:
            import torch
            from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
            from transformers.pipelines import audio_utils as hf_audio_utils
        except ImportError as exc:
            if self._config.enable_fake_fallback:
                return self._build_fake_pipeline()

            raise WhisperDependenciesMissingError(
                'Whisper dependencies missing. Install with: pip install -e ".[backend]"'
            ) from exc

        ffmpeg_binary_path = _resolve_ffmpeg_binary_path()
        if ffmpeg_binary_path is None:
            if self._config.enable_fake_fallback:
                return self._build_fake_pipeline()

            raise WhisperDependenciesMissingError(
                'ffmpeg binary missing. Install with: pip install -e ".[backend]"'
            )

        _patch_transformers_ffmpeg_reader(hf_audio_utils, ffmpeg_binary_path)

        runtime = _resolve_torch_runtime(torch)

        model = _load_model_with_dtype(
            AutoModelForSpeechSeq2Seq.from_pretrained,
            model_id=self._config.model_id,
            model_revision=self._config.model_revision,
            runtime_dtype=runtime.dtype,
            low_cpu_mem_usage=self._config.low_cpu_mem_usage,
            use_safetensors=self._config.use_safetensors,
        )
        try:
            model.to(runtime.device)
        except Exception:  # noqa: BLE001
            runtime = TorchRuntimeSelection(device="cpu", dtype=torch.float32)
            model = _load_model_with_dtype(
                AutoModelForSpeechSeq2Seq.from_pretrained,
                model_id=self._config.model_id,
                model_revision=self._config.model_revision,
                runtime_dtype=runtime.dtype,
                low_cpu_mem_usage=self._config.low_cpu_mem_usage,
                use_safetensors=self._config.use_safetensors,
            )
            model.to(runtime.device)

        self._runtime_device = runtime.device
        processor = AutoProcessor.from_pretrained(
            self._config.model_id,
            revision=self._config.model_revision,
        )

        pipeline_kwargs: dict[str, Any] = {
            "model": model,
            "tokenizer": processor.tokenizer,
            "feature_extractor": processor.feature_extractor,
            "device": runtime.device,
        }

        pipeline_dtype_kwarg_name = _resolve_dtype_kwarg_name(hf_pipeline)
        pipeline_kwargs[pipeline_dtype_kwarg_name] = runtime.dtype

        return hf_pipeline("automatic-speech-recognition", **pipeline_kwargs)

    def _get_pipeline(self) -> Any:
        if self._pipeline is not None:
            return self._pipeline

        with self._pipeline_lock:
            if self._pipeline is None:
                self._pipeline = self._pipeline_factory()

        return self._pipeline

    def _run_pipeline(
        self,
        *,
        pipe: Any,
        audio_input: Any,
        language: str | None,
    ) -> str:
        run_kwargs: dict[str, Any] = {}
        normalized_language = _normalize_language(language)
        if normalized_language is not None:
            run_kwargs["generate_kwargs"] = {
                "language": normalized_language,
                "task": "transcribe",
            }

        result = pipe(audio_input, **run_kwargs)

        if not isinstance(result, dict):
            return ""

        text = result.get("text", "")
        if not isinstance(text, str):
            return ""

        return text.strip()

    def transcribe_chunk(
        self,
        audio_chunk: bytes,
        language: str | None = None,
        mime_type: str | None = None,
    ) -> str:
        if len(audio_chunk) == 0:
            return ""

        pipe = self._get_pipeline()
        _reset_pipeline_call_count(pipe)

        if _prefers_ffmpeg_predecode(mime_type):
            try:
                decoded_audio = _decode_audio_chunk_with_ffmpeg(
                    audio_chunk,
                    mime_type=mime_type,
                    sampling_rate=16000,
                )
                return self._run_pipeline(
                    pipe=pipe,
                    audio_input={
                        "array": decoded_audio,
                        "sampling_rate": 16000,
                    },
                    language=language,
                )
            except Exception:  # noqa: BLE001
                # Fall back to direct-byte path when predecode is unavailable.
                pass

        try:
            return self._run_pipeline(
                pipe=pipe,
                audio_input=audio_chunk,
                language=language,
            )
        except Exception:  # noqa: BLE001
            try:
                decoded_audio = _decode_audio_chunk_with_ffmpeg(
                    audio_chunk,
                    mime_type=mime_type,
                    sampling_rate=16000,
                )
                return self._run_pipeline(
                    pipe=pipe,
                    audio_input={
                        "array": decoded_audio,
                        "sampling_rate": 16000,
                    },
                    language=language,
                )
            except Exception as fallback_error:  # noqa: BLE001
                raise WhisperInferenceError("Chunk transcription failed") from fallback_error
