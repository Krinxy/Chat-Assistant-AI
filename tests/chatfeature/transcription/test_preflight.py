from unittest.mock import patch, MagicMock
from backend.app.services.utils.transcription.preflight import (
    _parse_bool_env,
    TranscriptionPreflightReport,
    run_transcription_preflight,
    print_preflight_report,
    main
)


def test_parse_bool_env(monkeypatch):
    monkeypatch.setenv("DUMMY_VAR", "true")
    assert _parse_bool_env("DUMMY_VAR", False) is True
    monkeypatch.setenv("DUMMY_VAR", "1")
    assert _parse_bool_env("DUMMY_VAR", False) is True
    monkeypatch.setenv("DUMMY_VAR", "0")
    assert _parse_bool_env("DUMMY_VAR", True) is False
    monkeypatch.delenv("DUMMY_VAR", raising=False)
    assert _parse_bool_env("DUMMY_VAR", True) is True


def test_preflight_report_properties():
    report = TranscriptionPreflightReport(
        missing_packages=("torch",),
        ffmpeg_path=None,
        fake_fallback_enabled=True,
        preload_attempted=False,
        preload_success=False,
        preload_error=None,
        runtime_device=None
    )
    assert report.has_missing_runtime_dependencies is True
    assert report.is_ready_for_real_transcription is False

    report2 = TranscriptionPreflightReport(
        missing_packages=(),
        ffmpeg_path="/bin/ffmpeg",
        fake_fallback_enabled=True,
        preload_attempted=True,
        preload_success=True,
        preload_error=None,
        runtime_device="cpu"
    )
    assert report2.has_missing_runtime_dependencies is False
    assert report2.is_ready_for_real_transcription is True


@patch("builtins.__import__")
@patch("backend.app.services.utils.transcription.preflight._resolve_ffmpeg_binary_path")
@patch("backend.app.services.utils.transcription.preflight.runtime_service")
def test_run_transcription_preflight(mock_runtime_service, mock_resolve_ffmpeg, mock_import):
    # Test all good
    mock_resolve_ffmpeg.return_value = "/bin/ffmpeg"
    mock_runtime_service.runtime_device = "cpu"

    report = run_transcription_preflight(preload_runtime=True)
    assert report.missing_packages == ()
    assert report.ffmpeg_path == "/bin/ffmpeg"
    assert report.preload_attempted is True
    assert report.preload_success is True
    assert "cpu" in str(report.runtime_device)


@patch("builtins.__import__", side_effect=ImportError)
@patch("backend.app.services.utils.transcription.preflight._resolve_ffmpeg_binary_path")
def test_run_transcription_preflight_missing(mock_resolve_ffmpeg, mock_import):
    mock_resolve_ffmpeg.return_value = None
    report = run_transcription_preflight(preload_runtime=True)
    assert "torch" in report.missing_packages
    assert "transformers" in report.missing_packages


@patch("builtins.print")
def test_print_preflight_report(mock_print):
    report = TranscriptionPreflightReport(
        missing_packages=("torch",),
        ffmpeg_path=None,
        fake_fallback_enabled=False,
        preload_attempted=True,
        preload_success=False,
        preload_error="Some error",
        runtime_device=None
    )
    print_preflight_report(report)
    output = " ".join([call[0][0] for call in mock_print.call_args_list])
    assert "missing" in output
    assert "Some error" in output
    assert "transcription" in output


@patch("backend.app.services.utils.transcription.preflight._parse_args")
@patch("backend.app.services.utils.transcription.preflight.run_transcription_preflight")
def test_main(mock_run, mock_parse_args):
    mock_args = MagicMock()
    mock_args.startup_check = False
    mock_parse_args.return_value = mock_args
    assert main() == 0

    mock_args.startup_check = True
    mock_args.skip_preload = False
    mock_report = MagicMock()
    mock_report.has_missing_runtime_dependencies = True
    mock_report.fake_fallback_enabled = False
    mock_run.return_value = mock_report
    assert main() == 1


@patch("builtins.__import__")
@patch("backend.app.services.utils.transcription.preflight._resolve_ffmpeg_binary_path")
@patch("backend.app.services.utils.transcription.preflight.runtime_service")
def test_run_transcription_preflight_preload_error(mock_runtime_service, mock_resolve_ffmpeg, mock_import):
    mock_resolve_ffmpeg.return_value = "/bin/ffmpeg"
    mock_runtime_service.preload.side_effect = Exception("Out of memory mock")

    report = run_transcription_preflight(preload_runtime=True)
    assert report.preload_success is False
    assert "Out of memory" in report.preload_error


@patch("builtins.print")
def test_print_preflight_report_success_no_device(mock_print):
    report = TranscriptionPreflightReport(
        missing_packages=(),
        ffmpeg_path="/bin/ffmpeg",
        fake_fallback_enabled=False,
        preload_attempted=True,
        preload_success=True,
        preload_error=None,
        runtime_device=None
    )
    print_preflight_report(report)
    output = " ".join([call[0][0] for call in mock_print.call_args_list])
    assert "ok (unknown)" in output


@patch("builtins.print")
def test_print_preflight_report_success_device(mock_print):
    report = TranscriptionPreflightReport(
        missing_packages=(),
        ffmpeg_path="/bin/ffmpeg",
        fake_fallback_enabled=False,
        preload_attempted=True,
        preload_success=True,
        preload_error=None,
        runtime_device="cuda"
    )
    print_preflight_report(report)
    output = " ".join([call[0][0] for call in mock_print.call_args_list])
    assert "ok (cuda)" in output


@patch("builtins.print")
def test_print_preflight_report_not_attempted(mock_print):
    report = TranscriptionPreflightReport(
        missing_packages=(),
        ffmpeg_path="/bin/ffmpeg",
        fake_fallback_enabled=False,
        preload_attempted=False,
        preload_success=False,
        preload_error=None,
        runtime_device=None
    )
    print_preflight_report(report)
    output = " ".join([call[0][0] for call in mock_print.call_args_list])
    assert "skipped" in output


@patch("builtins.print")
def test_print_preflight_report_warning(mock_print):
    report = TranscriptionPreflightReport(
        missing_packages=("torch",),
        ffmpeg_path=None,
        fake_fallback_enabled=True,
        preload_attempted=False,
        preload_success=False,
        preload_error=None,
        runtime_device=None
    )
    print_preflight_report(report)
    output = " ".join([call[0][0] for call in mock_print.call_args_list])
    assert "warning" in output
    assert "fake fallback mode" in output


@patch("backend.app.services.utils.transcription.preflight._parse_args")
@patch("backend.app.services.utils.transcription.preflight.run_transcription_preflight")
def test_main_preload_fails(mock_run, mock_parse_args):
    mock_args = MagicMock()
    mock_args.startup_check = True
    mock_args.skip_preload = False
    mock_parse_args.return_value = mock_args

    mock_report = MagicMock()
    mock_report.has_missing_runtime_dependencies = False
    mock_report.fake_fallback_enabled = False
    mock_report.preload_attempted = True
    mock_report.preload_success = False
    mock_run.return_value = mock_report
    assert main() == 1


@patch("backend.app.services.utils.transcription.preflight._parse_args")
@patch("backend.app.services.utils.transcription.preflight.run_transcription_preflight")
def test_main_success(mock_run, mock_parse_args):
    mock_args = MagicMock()
    mock_args.startup_check = True
    mock_args.skip_preload = False
    mock_parse_args.return_value = mock_args

    mock_report = MagicMock()
    mock_report.has_missing_runtime_dependencies = False
    mock_report.fake_fallback_enabled = False
    mock_report.preload_attempted = True
    mock_report.preload_success = True
    mock_run.return_value = mock_report
    assert main() == 0
