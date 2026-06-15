from __future__ import annotations

import pytest

from backend.app.services.core.guardrails.helpers import categorize_api_error, sanitize_user_input


class TestSanitizeUserInput:
    def test_strips_null_bytes(self) -> None:
        assert sanitize_user_input("hello\x00world") == "helloworld"

    def test_strips_control_characters(self) -> None:
        assert sanitize_user_input("data\x01\x02\x1fend") == "dataend"

    def test_preserves_tab_newline_carriage_return(self) -> None:
        text = "line1\nline2\ttabbed\r"
        assert sanitize_user_input(text) == text

    def test_preserves_normal_text(self) -> None:
        text = "What is the capital of Germany?"
        assert sanitize_user_input(text) == text

    def test_empty_string_remains_empty(self) -> None:
        assert sanitize_user_input("") == ""

    def test_strips_del_character(self) -> None:
        assert sanitize_user_input("abc\x7fdef") == "abcdef"


class TestCategorizeApiError:
    def test_quota_exceeded_by_class_name(self) -> None:
        class ResourceExhausted(Exception):
            pass

        assert categorize_api_error(ResourceExhausted("too many")) == "quota_exceeded"

    def test_quota_exceeded_by_message(self) -> None:
        assert categorize_api_error(Exception("quota exceeded for project")) == "quota_exceeded"

    def test_timeout_by_class_name(self) -> None:
        assert categorize_api_error(TimeoutError("deadline")) == "timeout"

    def test_auth_error_by_class_name(self) -> None:
        class Unauthenticated(Exception):
            pass

        assert categorize_api_error(Unauthenticated("bad key")) == "auth_error"

    def test_network_error_by_class_name(self) -> None:
        assert categorize_api_error(ConnectionError("refused")) == "network_error"

    def test_unknown_error_returns_api_error(self) -> None:
        assert categorize_api_error(RuntimeError("something else")) == "api_error"
