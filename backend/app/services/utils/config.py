from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import yaml

_BACKEND_CONFIG_PATH = Path(__file__).parents[3] / "config" / "backend.yaml"


class ConfigLoader:
    """Loads and caches YAML configuration files.

    Config files hold non-secret hyperparameters (model names, temperatures,
    prompt file paths, rate limits). Secrets always come from environment
    variables — never from these files.
    """

    _backend: Optional[dict[str, Any]] = None

    @classmethod
    def get_backend(cls) -> dict[str, Any]:
        if cls._backend is None:
            cls._backend = cls._load(_BACKEND_CONFIG_PATH)
        return cls._backend

    @classmethod
    def reset(cls) -> None:
        """Clear cached config — used in tests to reload after patching."""
        cls._backend = None

    @staticmethod
    def _load(path: Path) -> dict[str, Any]:
        with open(path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        return data if isinstance(data, dict) else {}
