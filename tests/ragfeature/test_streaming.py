from __future__ import annotations

import json

from backend.app.services.utils.streaming import ThinkBlockFilter, format_sse, strip_think_blocks


def test_strip_think_blocks_removes_span() -> None:
    assert strip_think_blocks("<think>reasoning</think>Answer") == "Answer"


def test_strip_think_blocks_passthrough_without_tags() -> None:
    assert strip_think_blocks("Just an answer.") == "Just an answer."


def test_strip_think_blocks_multiple_spans() -> None:
    assert strip_think_blocks("<think>a</think>X<think>b</think>Y") == "XY"


def test_filter_handles_tag_split_across_chunks() -> None:
    filt = ThinkBlockFilter()
    out = filt.feed("Hello <thi")
    out += filt.feed("nk>secret</thin")
    out += filt.feed("k> world")
    out += filt.flush()
    assert out == "Hello  world"


def test_filter_discards_unterminated_think_on_flush() -> None:
    filt = ThinkBlockFilter()
    visible = filt.feed("visible<think>still thinking")
    visible += filt.flush()
    assert visible == "visible"


def test_filter_emits_visible_after_close() -> None:
    filt = ThinkBlockFilter()
    out = filt.feed("<think>r</think>") + filt.feed("done") + filt.flush()
    assert out == "done"


def test_format_sse_without_event() -> None:
    assert format_sse({"delta": "hi"}) == 'data: {"delta": "hi"}\n\n'


def test_format_sse_with_event() -> None:
    frame = format_sse({"status": "ok"}, event="done")
    assert frame.startswith("event: done\n")
    assert frame.endswith("\n\n")
    body = frame.split("data: ", 1)[1].rstrip("\n")
    assert json.loads(body) == {"status": "ok"}
