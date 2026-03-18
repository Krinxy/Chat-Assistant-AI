from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseAgent(ABC):
    @abstractmethod
    async def process(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Process a user message and return a response dict."""
