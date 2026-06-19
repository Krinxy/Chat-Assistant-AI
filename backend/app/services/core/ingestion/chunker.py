from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

_DEFAULT_CHUNK_SIZE = 512
_DEFAULT_CHUNK_OVERLAP = 50


@dataclass(frozen=True)
class Chunk:
    source: str
    chunk_index: int
    text: str


class DocumentChunker:
    """Split document text into overlapping chunks via LangChain's RecursiveCharacterTextSplitter."""

    def __init__(
        self,
        chunk_size: int = _DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = _DEFAULT_CHUNK_OVERLAP,
    ) -> None:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than zero")
        if chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be in the range [0, chunk_size)")

        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )

    @property
    def chunk_size(self) -> int:
        return self._chunk_size

    @property
    def chunk_overlap(self) -> int:
        return self._chunk_overlap

    def split(self, text: str) -> list[str]:
        """Return the non-empty text fragments produced by the recursive splitter."""
        if len(text.strip()) == 0:
            return []

        return [fragment for fragment in self._splitter.split_text(text) if fragment.strip()]

    def chunk_document(self, source: str, text: str) -> list[Chunk]:
        """Split a document into indexed :class:`Chunk` records carrying their source name."""
        return [Chunk(source=source, chunk_index=index, text=fragment) for index, fragment in enumerate(self.split(text))]
