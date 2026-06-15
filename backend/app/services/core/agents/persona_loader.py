from __future__ import annotations

from pathlib import Path

_PERSONAS_DIR = Path(__file__).parent / "personas"


class PersonaLoader:
    """Loads assistant persona instructions from Markdown files in agents/personas/.

    Scaffolding — not yet injected into the RAG pipeline (AP 4).
    """

    @classmethod
    def load(cls, name: str) -> str:
        """Load persona Markdown by name (without .md extension).

        Guards against path traversal: name must resolve inside _PERSONAS_DIR.
        """
        resolved = (_PERSONAS_DIR / f"{name}.md").resolve()
        if not resolved.is_relative_to(_PERSONAS_DIR.resolve()):
            raise ValueError(f"Persona file outside allowed directory: {name!r}")
        return resolved.read_text(encoding="utf-8").strip()

    @classmethod
    def load_assistant(cls) -> str:
        """Load the default assistant persona."""
        return cls.load("assistant")
