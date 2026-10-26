"""
Persistence package for ShadowAgent.
Handles Supabase connection and repository access safely.
"""

from .config import config, SupabaseConfig
from .supabase_client import get_supabase_client, test_connection
from .repository import (
    SimulationRepository,
    SupabaseRepository,
    InMemoryRepository,
    get_repository,
    set_repository,
    reset_repository,
)

__all__ = [
    "config",
    "SupabaseConfig",
    "get_supabase_client",
    "test_connection",
    "SimulationRepository",
    "SupabaseRepository",
    "InMemoryRepository",
    "get_repository",
    "set_repository",
    "reset_repository",
]
