"""
Official Supabase Client Initializer for ShadowAgent.
Initializes strictly on the backend with server-side credentials.
Handles timeouts, connection status checks, and safe error reporting.
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

from .config import config

logger = logging.getLogger("shadowagent.persistence")

_client: Optional[Client] = None
_initialized: bool = False


def get_supabase_client() -> Optional[Client]:
    """
    Return the singleton Supabase client, or None if unconfigured or initialization failed.
    Never exposes credentials or throws unhandled connection crashes during import.
    """
    global _client, _initialized
    if _initialized:
        return _client

    if not config.is_configured:
        logger.info("[ShadowAgent] Supabase not configured: %s", config.configuration_status)
        _initialized = True
        _client = None
        return None

    try:
        # Configure client with sensible timeout (10 seconds)
        options = ClientOptions(postgrest_client_timeout=10)
        _client = create_client(config.url, config.secret_key, options=options)
        logger.info("[ShadowAgent] Supabase client initialized successfully.")
    except Exception as exc:
        # Log error message only, never any credential values
        logger.warning("[ShadowAgent] Failed to initialize Supabase client: %s", type(exc).__name__)
        _client = None

    _initialized = True
    return _client


def test_connection() -> Tuple[bool, str]:
    """
    Probe the Supabase connection against the simulation_runs table.
    Returns (success: bool, safe_message: str).
    """
    client = get_supabase_client()
    if client is None:
        return False, config.configuration_status

    try:
        # Perform a lightweight head/select query on simulation_runs
        res = client.table("simulation_runs").select("id").limit(1).execute()
        return True, "Connected to Supabase PostgreSQL database."
    except Exception as exc:
        err_name = type(exc).__name__
        err_msg = str(exc)
        # Sanitize error message to ensure no URL or key substring appears
        clean_msg = err_msg.replace(config.secret_key, "[REDACTED]") if config.secret_key else err_msg
        if "relation \"public.simulation_runs\" does not exist" in clean_msg.lower():
            return False, "Connected to Supabase, but 'public.simulation_runs' table does not exist. Please apply the database schema."
        return False, f"Supabase connection error ({err_name}): {clean_msg[:120]}"
