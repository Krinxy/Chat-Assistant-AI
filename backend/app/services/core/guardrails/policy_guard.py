from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

import yaml

from ..guardrails import GuardOutcome, GuardStatus
from .helpers import GuardLogger

_logger = logging.getLogger(__name__)

_POLICY_FILE = Path(__file__).parent.parent.parent.parent.parent / "config" / "guardrail_policy.yaml"


class PolicyGuard:
    """Local regex/keyword backup guard used when the LLM-based InputGuard is UNAVAILABLE.

    Loads disallowed content categories from guardrail_policy.yaml.
    Fail-safe: rejects on any keyword or pattern match; passes everything else.
    """

    def __init__(self, patterns: list[re.Pattern[str]], rejection_reason: str = "Content violates guardrail policy") -> None:
        self._patterns = patterns
        self._rejection_reason = rejection_reason

    def check_local(self, query: str, session_id: str) -> GuardOutcome:
        """Apply local keyword/pattern checks. Returns REJECTED or PASSED."""
        for pattern in self._patterns:
            if pattern.search(query):
                GuardLogger.log("policy", session_id, "rejected_by_local_policy", self._rejection_reason)
                return GuardOutcome(status=GuardStatus.REJECTED, reason=self._rejection_reason)
        return GuardOutcome(status=GuardStatus.PASSED)

    @classmethod
    def from_file(cls, path: Optional[Path] = None) -> "PolicyGuard":
        """Load policy config from a YAML file and compile all active patterns."""
        policy_path = path or _POLICY_FILE
        try:
            policy: dict = yaml.safe_load(policy_path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            _logger.warning("Could not load guardrail policy from %s: %s — using empty pattern set", policy_path, exc)
            return cls(patterns=[])

        compiled: list[re.Pattern[str]] = []
        for _category, cfg in policy.get("disallowed_categories", {}).items():
            if not cfg.get("enabled", True):
                continue
            for keyword in cfg.get("keywords", []):
                compiled.append(re.compile(re.escape(str(keyword)), re.IGNORECASE))
            for raw_pattern in cfg.get("patterns", []):
                compiled.append(re.compile(str(raw_pattern), re.IGNORECASE))

        return cls(patterns=compiled)
