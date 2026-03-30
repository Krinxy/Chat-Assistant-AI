from __future__ import annotations

import os


RuntimeConfig = dict[str, str]


def load_runtime_config() -> RuntimeConfig:
    return {
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "login_url": os.getenv("LOGIN_URL", "https://example.invalid/login"),
        "aws_region": os.getenv("AWS_REGION", "eu-central-1"),
    }
