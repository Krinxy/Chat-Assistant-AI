from __future__ import annotations

import pytest

from backend.app.services.core.ingestion.chunker import Chunk, DocumentChunker


def test_short_text_yields_single_chunk() -> None:
    chunker = DocumentChunker(chunk_size=512, chunk_overlap=50)

    chunks = chunker.chunk_document(source="doc.txt", text="A short sentence.")

    assert chunks == [Chunk(source="doc.txt", chunk_index=0, text="A short sentence.")]


def test_long_text_is_split_into_multiple_indexed_chunks() -> None:
    chunker = DocumentChunker(chunk_size=60, chunk_overlap=10)
    text = " ".join(f"sentence number {index}." for index in range(40))

    chunks = chunker.chunk_document(source="long.txt", text=text)

    assert len(chunks) > 1
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))
    assert all(chunk.source == "long.txt" for chunk in chunks)
    assert all(len(chunk.text) <= 60 for chunk in chunks)


def test_blank_text_yields_no_chunks() -> None:
    chunker = DocumentChunker()

    assert chunker.split("   \n  ") == []
    assert chunker.chunk_document(source="empty.txt", text="") == []


def test_chunker_exposes_configuration() -> None:
    chunker = DocumentChunker(chunk_size=256, chunk_overlap=32)

    assert chunker.chunk_size == 256
    assert chunker.chunk_overlap == 32


@pytest.mark.parametrize(
    ("chunk_size", "chunk_overlap"),
    [(0, 0), (-1, 0), (100, 100), (100, 150), (100, -1)],
)
def test_invalid_configuration_raises_value_error(chunk_size: int, chunk_overlap: int) -> None:
    with pytest.raises(ValueError):
        DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
