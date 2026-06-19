from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader

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


class DocumentLoader:
    @staticmethod
    def supported_suffixes() -> frozenset[str]:
        return frozenset(_SUPPORTED_SUFFIXES)

    @staticmethod
    def extract_text(filename: str, data: bytes) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix in _TXT_SUFFIXES:
            return DocumentLoader._extract_txt(data)
        if suffix == _PDF_SUFFIX:
            return DocumentLoader._extract_pdf(data)
        if suffix == _DOCX_SUFFIX:
            return DocumentLoader._extract_docx(data)
        raise UnsupportedDocumentError(f"Unsupported document type: '{suffix or filename}'")

    @staticmethod
    def load_document(path: str | Path) -> LoadedDocument:
        resolved = Path(path)
        data = resolved.read_bytes()
        text = DocumentLoader.extract_text(resolved.name, data)
        return LoadedDocument(source=resolved.name, text=text)

    @staticmethod
    def _extract_txt(data: bytes) -> str:
        return data.decode("utf-8", errors="replace").strip()

    @staticmethod
    def _extract_pdf(data: bytes) -> str:
        reader = PdfReader(BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(page.strip() for page in pages if page.strip()).strip()

    @staticmethod
    def _extract_docx(data: bytes) -> str:
        document = Document(BytesIO(data))
        paragraphs = [paragraph.text for paragraph in document.paragraphs]
        return "\n".join(paragraph.strip() for paragraph in paragraphs if paragraph.strip()).strip()


# module-level aliases for backward compat
supported_suffixes = DocumentLoader.supported_suffixes
extract_text = DocumentLoader.extract_text
load_document = DocumentLoader.load_document
