from pathlib import Path


def test_frontend_app_file_exists() -> None:
    assert Path("frontend/app.py").is_file()
