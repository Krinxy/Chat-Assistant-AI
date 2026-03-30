from pathlib import Path


def test_auth_component_module_exists() -> None:
    assert Path("frontend/src/shared/components/feedback/auth_component.py").is_file()
