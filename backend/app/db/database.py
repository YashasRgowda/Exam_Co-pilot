from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """
    Returns Supabase client using anon key.
    Used for operations that respect Row Level Security (RLS).
    Safe to use for user-facing operations.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )


def get_supabase_admin_client() -> Client:
    """
    Returns Supabase client using service role key.
    BYPASSES Row Level Security (RLS).
    Use ONLY for admin/backend operations.
    Never expose this client to frontend.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )


# Module level clients — initialized once, reused across requests
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()