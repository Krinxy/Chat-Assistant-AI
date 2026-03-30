from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_chat_service_module():
    module_path = Path("frontend/src/features/chat/api/chat_service.py")
    spec = importlib.util.spec_from_file_location("chat_service", module_path)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_chat_payload_trims_message() -> None:
    module = _load_chat_service_module()
    assert module.build_chat_payload("  hello world  ") == {"message": "hello world"}


def test_build_chat_payload_handles_empty_input() -> None:
    module = _load_chat_service_module()
    assert module.build_chat_payload("   ") == {"message": ""}
