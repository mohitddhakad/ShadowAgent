"""
Supabase Configuration Management for ShadowAgent.
Loads credentials safely from environment variables or .env file.
Ensures secrets are NEVER exposed, printed, or sent to the frontend.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Search for .env in backend directory or parent directories
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"
if _ENV_PATH.exists():
    load_dotenv(dotenv_path=_ENV_PATH, override=False)
else:
    load_dotenv(override=False)


def _is_placeholder(val: Optional[str]) -> bool:
    if not val:
        return True
    v = val.strip().lower()
    placeholders = [
        "your-project",
        "your-secret-key",
        "your-service-role",
        "example",
        "placeholder",
        "change-me",
    ]
    return any(p in v for p in placeholders) or len(val.strip()) < 10


class SupabaseConfig:
    """Safe wrapper around Supabase environment credentials."""

    def __init__(self) -> None:
        self._url: str = os.getenv("SUPABASE_URL", "").strip()
        # Accept SUPABASE_SECRET_KEY first, fallback to SUPABASE_SERVICE_KEY
        self._key: str = (
            os.getenv("SUPABASE_SECRET_KEY")
            or os.getenv("SUPABASE_SERVICE_KEY")
            or ""
        ).strip()

    @property
    def url(self) -> str:
        return self._url

    @property
    def secret_key(self) -> str:
        """Raw secret key for backend client initialization ONLY."""
        return self._key

    @property
    def is_configured(self) -> bool:
        """Return True if credentials appear valid and non-placeholder."""
        return (
            bool(self._url)
            and bool(self._key)
            and self._url.startswith("https://")
            and not _is_placeholder(self._url)
            and not _is_placeholder(self._key)
        )

    @property
    def configuration_status(self) -> str:
        """Return a human-readable safe status message WITHOUT secret values."""
        if not self._url and not self._key:
            return "Unconfigured: SUPABASE_URL and SUPABASE_SECRET_KEY are not set in backend/.env"
        if not self._url:
            return "Partially configured: SUPABASE_URL is missing"
        if not self._key:
            return "Partially configured: SUPABASE_SECRET_KEY is missing"
        if _is_placeholder(self._url) or _is_placeholder(self._key):
            return "Placeholder values detected in backend/.env. Using in-memory fallback."
        if not self._url.startswith("https://"):
            return "Invalid SUPABASE_URL: must start with https://"
        return "Configured"

    def __repr__(self) -> str:
        return f"<SupabaseConfig configured={self.is_configured}>"

    def __str__(self) -> str:
        return f"SupabaseConfig(configured={self.is_configured})"


# Singleton config instance
config = SupabaseConfig()
