from fastapi import Depends, Header
from app.core.security import verify_supabase_token
from app.core.exceptions import UnauthorizedException


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    FastAPI dependency — extracts and verifies user from Authorization header.
    Inject this into any route that requires authentication.

    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user["sub"]}
    """
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Authorization header must start with 'Bearer'.")

    token = authorization.split(" ")[1]
    user = verify_supabase_token(token)
    return user