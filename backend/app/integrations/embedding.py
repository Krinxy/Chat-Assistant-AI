import logging
from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model(model_name: str) -> SentenceTransformer:
    logger.info("Loading embedding model: %s", model_name)
    return SentenceTransformer(model_name)


class EmbeddingService:
    def __init__(self, model_name: str = _DEFAULT_MODEL):
        self._model_name = model_name

    def _model(self) -> SentenceTransformer:
        return _get_model(self._model_name)

    def embed_text(self, text: str) -> List[float]:
        vector = self._model().encode(text, convert_to_numpy=True)
        return vector.tolist()

    def embed_documents(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        vectors = self._model().encode(
            texts, batch_size=batch_size, convert_to_numpy=True
        )
        return [v.tolist() for v in vectors]
