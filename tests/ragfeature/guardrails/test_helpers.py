from __future__ import annotations

from backend.app.services.core.guardrails.helpers import ApiErrorCategorizer, InputSanitizer


class TestInputSanitizer:
    def test_strips_null_bytes(self) -> None:
        assert InputSanitizer.sanitize("hello\x00world") == "helloworld"

    def test_strips_control_characters(self) -> None:
        assert InputSanitizer.sanitize("data\x01\x02\x1fend") == "dataend"

    def test_preserves_tab_newline_carriage_return(self) -> None:
        text = "line1\nline2\ttabbed\r"
        assert InputSanitizer.sanitize(text) == text

    def test_preserves_normal_text(self) -> None:
        text = "What is the capital of Germany?"
        assert InputSanitizer.sanitize(text) == text

    def test_empty_string_remains_empty(self) -> None:
        assert InputSanitizer.sanitize("") == ""

    def test_strips_del_character(self) -> None:
        assert InputSanitizer.sanitize("abc\x7fdef") == "abcdef"


class TestApiErrorCategorizer:
    def test_quota_exceeded_by_class_name(self) -> None:
        class ResourceExhausted(Exception):
            pass

        assert ApiErrorCategorizer.categorize(ResourceExhausted("too many")) == "quota_exceeded"

    def test_quota_exceeded_by_message(self) -> None:
        assert ApiErrorCategorizer.categorize(Exception("quota exceeded for project")) == "quota_exceeded"

    def test_timeout_by_class_name(self) -> None:
        assert ApiErrorCategorizer.categorize(TimeoutError("deadline")) == "timeout"

    def test_auth_error_by_class_name(self) -> None:
        class Unauthenticated(Exception):
            pass

        assert ApiErrorCategorizer.categorize(Unauthenticated("bad key")) == "auth_error"

    def test_network_error_by_class_name(self) -> None:
        assert ApiErrorCategorizer.categorize(ConnectionError("refused")) == "network_error"

    def test_unknown_error_returns_api_error(self) -> None:
        assert ApiErrorCategorizer.categorize(RuntimeError("something else")) == "api_error"
