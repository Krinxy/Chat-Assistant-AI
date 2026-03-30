from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_runtime_config_module():
    module_path = Path("frontend/src/app/config/runtime_config.py")
    spec = importlib.util.spec_from_file_location("runtime_config", module_path)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_load_runtime_config_reads_environment_values(monkeypatch) -> None:
    module = _load_runtime_config_module()

    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("LOGIN_URL", "https://ci.example.test/login")
    monkeypatch.setenv("AWS_REGION", "eu-west-1")

    config = module.load_runtime_config()

    assert config["openai_api_key"] == "test-openai-key"
    assert config["login_url"] == "https://ci.example.test/login"
    assert config["aws_region"] == "eu-west-1"


def test_load_runtime_config_uses_safe_defaults(monkeypatch) -> None:
    module = _load_runtime_config_module()

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LOGIN_URL", raising=False)
    monkeypatch.delenv("AWS_REGION", raising=False)

    config = module.load_runtime_config()

    assert config["openai_api_key"] == ""
    assert config["login_url"] == "https://example.invalid/login"
    assert config["aws_region"] == "eu-central-1"
