from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

_TXT_SUFFIXES = {".txt", ".md"}
_PDF_SUFFIX = ".pdf"
_DOCX_SUFFIX = ".docx"
_SUPPORTED_SUFFIXES = _TXT_SUFFIXES | {_PDF_SUFFIX, _DOCX_SUFFIX}


class UnsupportedDocumentError(ValueError):
    """Raised when a document has a file type the loader cannot extract text from."""


@dataclass(frozen=True)
class LoadedDocument:
    source: str
    text: str


def supported_suffixes() -> frozenset[str]:
    """Return the set of file suffixes the loader can extract (lower-case, dot-prefixed)."""
    return frozenset(_SUPPORTED_SUFFIXES)


def extract_text(filename: str, data: bytes) -> str:
    """Extract plain text from raw document bytes, dispatching on the filename suffix.

    Raises:
        UnsupportedDocumentError: if the suffix is not one of PDF/DOCX/TXT/MD.
    """
    suffix = Path(filename).suffix.lower()

    if suffix in _TXT_SUFFIXES:
        return _extract_txt(data)
    if suffix == _PDF_SUFFIX:
        return _extract_pdf(data)
    if suffix == _DOCX_SUFFIX:
        return _extract_docx(data)

    raise UnsupportedDocumentError(f"Unsupported document type: '{suffix or filename}'")


def load_document(path: str | Path) -> LoadedDocument:
    """Read a document from disk and return its source name together with the extracted text."""
    resolved = Path(path)
    data = resolved.read_bytes()
    text = extract_text(resolved.name, data)
    return LoadedDocument(source=resolved.name, text=text)


def _extract_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace").strip()


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(page.strip() for page in pages if page.strip()).strip()


def _extract_docx(data: bytes) -> str:
    from docx import Document

    document = Document(BytesIO(data))
    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    return "\n".join(paragraph.strip() for paragraph in paragraphs if paragraph.strip()).strip()
