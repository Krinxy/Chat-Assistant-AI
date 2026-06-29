from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from .retriever import RetrievedChunk

# Returned verbatim (no LLM call) when retrieval yields no chunk above the similarity
# threshold — the grounded fallback required by AP 4. Kept in sync with the in-prompt
# instruction below so a streamed and a short-circuited "no answer" read identically.
NO_CONTEXT_MESSAGE = "Dazu habe ich keine Informationen in den verfügbaren Dokumenten."

# Appended to the persona system prompt. The retrieved chunks are the *only* sanctioned
# knowledge source: the model must ground its answer in them and must not invent facts.
_RAG_INSTRUCTIONS = (
    "Beantworte die Frage des Nutzers ausschließlich anhand des folgenden Kontexts aus den "
    "verfügbaren Dokumenten. Erfinde keine Informationen. Wenn der Kontext die Frage nicht "
    f'beantwortet, antworte exakt mit: "{NO_CONTEXT_MESSAGE}"'
)

_CONTEXT_HEADER = "Kontext aus Dokumenten:"
_HISTORY_HEADER = "Gesprächsverlauf:"
_CHUNK_SEPARATOR = "\n\n---\n\n"


def format_context(chunks: list[RetrievedChunk]) -> str:
    """Render retrieved chunks into a single labelled context block for the prompt.

    Each chunk is tagged with its source and chunk index so the model can attribute claims
    and so a human auditing the prompt can trace every fact back to a document.
    """
    blocks = [f"[Quelle: {chunk.source} · Chunk {chunk.chunk_index}]\n{chunk.text}" for chunk in chunks]
    return _CHUNK_SEPARATOR.join(blocks)


def extract_sources(chunks: list[RetrievedChunk]) -> list[dict]:
    """Project chunks onto the ``sources`` payload returned to the client.

    De-duplicates by (source, chunk_index) — the same chunk can surface twice across
    overlapping retrieval windows — and keeps the highest similarity seen for each.
    """
    best: dict[tuple[str, int], dict] = {}
    for chunk in chunks:
        key = (chunk.source, chunk.chunk_index)
        existing = best.get(key)
        if existing is None or chunk.similarity > existing["similarity"]:
            best[key] = {
                "source": chunk.source,
                "chunk_index": chunk.chunk_index,
                "similarity": round(chunk.similarity, 4),
            }
    return list(best.values())


def build_rag_messages(
    persona: str,
    question: str,
    chunks: list[RetrievedChunk],
    history: str = "",
) -> list[BaseMessage]:
    """Assemble the RAG prompt: persona + grounding instructions + context + history → question.

    Everything is folded into a single leading ``SystemMessage`` (strict gateways reject a
    second system message), followed by the user's question as the ``HumanMessage``.
    """
    parts = [persona, _RAG_INSTRUCTIONS, f"{_CONTEXT_HEADER}\n{format_context(chunks)}"]
    if history:
        parts.append(f"{_HISTORY_HEADER}\n{history}")
    system_content = "\n\n".join(parts)
    return [SystemMessage(content=system_content), HumanMessage(content=question)]
