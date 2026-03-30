from pathlib import Path


def test_session_state_module_exists() -> None:
    assert Path("frontend/src/app/store/session_state.py").is_file()
