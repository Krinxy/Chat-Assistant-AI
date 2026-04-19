from __future__ import annotations

import argparse
import os
from dataclasses import dataclass

from ...core.chat.transcription.runtime import runtime_service
from ...core.chat.transcription.transcriber import _resolve_ffmpeg_binary_path


def _parse_bool_env(name: str, default_value: bool) -> bool:
    raw_value = os.getenv(name, "").strip().lower()
    if len(raw_value) == 0:
        return default_value

    return raw_value in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class TranscriptionPreflightReport:
    missing_packages: tuple[str, ...]
    ffmpeg_path: str | None
    fake_fallback_enabled: bool
    preload_attempted: bool
    preload_success: bool
    preload_error: str | None
    runtime_device: str | None

    @property
    def has_missing_runtime_dependencies(self) -> bool:
        return len(self.missing_packages) > 0 or self.ffmpeg_path is None

    @property
    def is_ready_for_real_transcription(self) -> bool:
        return len(self.missing_packages) == 0 and self.ffmpeg_path is not None


def run_transcription_preflight(
    *,
    preload_runtime: bool,
) -> TranscriptionPreflightReport:
    missing_packages: list[str] = []

    for package_name in ("torch", "transformers"):
        try:
            __import__(package_name)
        except ImportError:
            missing_packages.append(package_name)

    ffmpeg_path = _resolve_ffmpeg_binary_path()
    fake_fallback_enabled = _parse_bool_env("WHISPER_ENABLE_FAKE_FALLBACK", True)

    preload_success = False
    preload_error: str | None = None
    runtime_device: str | None = None

    should_preload = preload_runtime and len(missing_packages) == 0 and ffmpeg_path is not None
    if should_preload:
        try:
            runtime_service.preload()
            preload_success = True
            runtime_device = runtime_service.runtime_device
        except Exception as exc:  # noqa: BLE001
            preload_error = str(exc)

    return TranscriptionPreflightReport(
        missing_packages=tuple(missing_packages),
        ffmpeg_path=ffmpeg_path,
        fake_fallback_enabled=fake_fallback_enabled,
        preload_attempted=should_preload,
        preload_success=preload_success,
        preload_error=preload_error,
        runtime_device=runtime_device,
    )


def print_preflight_report(report: TranscriptionPreflightReport) -> None:
    print("[transcription] startup preflight")

    if len(report.missing_packages) == 0:
        print("[transcription] dependencies: ok")
    else:
        print(
            "[transcription] missing python packages: "
            + ", ".join(report.missing_packages)
        )

    if report.ffmpeg_path is None:
        print("[transcription] ffmpeg: missing")
    else:
        print(f"[transcription] ffmpeg: {report.ffmpeg_path}")

    if report.preload_attempted:
        if report.preload_success:
            device_label = report.runtime_device or "unknown"
            print(f"[transcription] model preload: ok ({device_label})")
        else:
            print("[transcription] model preload: failed")
            if report.preload_error is not None:
                print(f"[transcription] preload error: {report.preload_error}")
    else:
        print("[transcription] model preload: skipped")

    if report.has_missing_runtime_dependencies and not report.fake_fallback_enabled:
        print("[transcription] critical: fallback disabled and runtime dependencies missing")
    elif report.has_missing_runtime_dependencies:
        print("[transcription] warning: running with fake fallback mode")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcription startup preflight")
    parser.add_argument(
        "--startup-check",
        action="store_true",
        help="Run startup diagnostics before booting the API",
    )
    parser.add_argument(
        "--skip-preload",
        action="store_true",
        help="Skip warm-loading the transcription model",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    if not args.startup_check:
        return 0

    report = run_transcription_preflight(preload_runtime=not args.skip_preload)
    print_preflight_report(report)

    if report.has_missing_runtime_dependencies and not report.fake_fallback_enabled:
        return 1

    if report.preload_attempted and not report.preload_success:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
