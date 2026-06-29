from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from backend.app.services.core.rag.chain import (
    NO_CONTEXT_MESSAGE,
    build_rag_messages,
    extract_sources,
    format_context,
)
from backend.app.services.core.rag.retriever import RetrievedChunk


def _chunk(text: str, source: str, index: int, similarity: float) -> RetrievedChunk:
    return RetrievedChunk(text=text, source=source, chunk_index=index, similarity=similarity)


def test_format_context_tags_each_chunk_with_provenance() -> None:
    rendered = format_context([_chunk("Revenue was 5M.", "report.pdf", 2, 0.8)])

    assert "report.pdf" in rendered
    assert "Chunk 2" in rendered
    assert "Revenue was 5M." in rendered


def test_extract_sources_dedupes_keeping_highest_similarity() -> None:
    chunks = [
        _chunk("a", "doc1", 0, 0.6),
        _chunk("a", "doc1", 0, 0.9),  # same (source, chunk) — higher score wins
        _chunk("b", "doc2", 1, 0.7),
    ]
    sources = extract_sources(chunks)

    assert {"source": "doc1", "chunk_index": 0, "similarity": 0.9} in sources
    assert {"source": "doc2", "chunk_index": 1, "similarity": 0.7} in sources
    assert len(sources) == 2


def test_extract_sources_empty() -> None:
    assert extract_sources([]) == []


def test_build_rag_messages_injects_context_and_question() -> None:
    messages = build_rag_messages(
        persona="You are AURA.",
        question="What was the revenue?",
        chunks=[_chunk("Revenue was 5M.", "report.pdf", 0, 0.8)],
        history="user: hi\nassistant: hello",
    )

    assert len(messages) == 2
    system, human = messages
    assert isinstance(system, SystemMessage)
    assert isinstance(human, HumanMessage)
    assert "You are AURA." in system.content
    assert "Revenue was 5M." in system.content
    assert "user: hi" in system.content
    assert NO_CONTEXT_MESSAGE in system.content  # grounding instruction references the fallback
    assert human.content == "What was the revenue?"


def test_build_rag_messages_without_history_omits_history_block() -> None:
    messages = build_rag_messages("persona", "q", [_chunk("ctx", "d", 0, 0.5)], history="")

    assert "Gesprächsverlauf" not in messages[0].content
