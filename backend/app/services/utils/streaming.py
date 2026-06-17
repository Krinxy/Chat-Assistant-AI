from __future__ import annotations

import json
from typing import Optional


class ThinkBlockFilter:
    """Strips ``<think>...</think>`` reasoning spans from a token stream incrementally.

    Thinking models (e.g. ``qwen3.5-think``) emit an internal reasoning trace
    wrapped in ``<think>...</think>`` before the user-facing answer. This filter
    removes those spans even when the tags are split across streamed chunks, so
    only the answer text is forwarded to the client. For No-Thinking models that
    emit no tags it is a transparent pass-through.
    """

    _OPEN = "<think>"
    _CLOSE = "</think>"

    def __init__(self) -> None:
        self._in_think = False
        self._buffer = ""

    @staticmethod
    def _partial_tail_len(text: str, tag: str) -> int:
        """Length of the longest suffix of ``text`` that is a proper prefix of ``tag``.

        Held back so a tag split across two chunks (e.g. ``"<thi"`` + ``"nk>"``) is
        still recognised once the remainder arrives.
        """
        max_len = min(len(text), len(tag) - 1)
        for size in range(max_len, 0, -1):
            if text[-size:] == tag[:size]:
                return size
        return 0

    def feed(self, text: str) -> str:
        """Process an incremental chunk; return only the visible (non-think) portion."""
        self._buffer += text
        out: list[str] = []
        while self._buffer:
            if self._in_think:
                idx = self._buffer.find(self._CLOSE)
                if idx == -1:
                    keep = self._partial_tail_len(self._buffer, self._CLOSE)
                    self._buffer = self._buffer[len(self._buffer) - keep :] if keep else ""
                    break
                self._buffer = self._buffer[idx + len(self._CLOSE) :]
                self._in_think = False
            else:
                idx = self._buffer.find(self._OPEN)
                if idx == -1:
                    keep = self._partial_tail_len(self._buffer, self._OPEN)
                    emit_to = len(self._buffer) - keep
                    out.append(self._buffer[:emit_to])
                    self._buffer = self._buffer[emit_to:]
                    break
                out.append(self._buffer[:idx])
                self._buffer = self._buffer[idx + len(self._OPEN) :]
                self._in_think = True
        return "".join(out)

    def flush(self) -> str:
        """Return any buffered visible text once the stream ends (discards open think tail)."""
        remaining = "" if self._in_think else self._buffer
        self._buffer = ""
        return remaining


def strip_think_blocks(text: str) -> str:
    """Remove all ``<think>...</think>`` spans from a complete (non-streamed) string."""
    filt = ThinkBlockFilter()
    return filt.feed(text) + filt.flush()


def format_sse(data: dict[str, object], event: Optional[str] = None) -> str:
    """Encode a payload as a single Server-Sent Events frame.

    The data is JSON-encoded so newlines and other special characters survive the
    line-oriented SSE wire format intact.
    """
    prefix = f"event: {event}\n" if event else ""
    return f"{prefix}data: {json.dumps(data, ensure_ascii=False)}\n\n"
