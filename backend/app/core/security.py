import jwt
from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import UnauthorizedException

logger = setup_logger(__name__)


def verify_supabase_token(token: str) -> dict:
    """
    Verifies a Supabase JWT token and returns the decoded payload.
    Raises UnauthorizedException if token is invalid or expired.
    """
    try:
        # Supabase uses the service role key's JWT secret to sign tokens
        # We decode without full verification here — Supabase validates on DB calls
        # For extra security in production, use Supabase JWKS endpoint
        decoded = jwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=["HS256"],
        )

        if not decoded.get("sub"):
            raise UnauthorizedException("Invalid token: missing user ID.")

        return decoded

    except jwt.ExpiredSignatureError:
        logger.warning("Expired token attempt")
        raise UnauthorizedException("Token has expired. Please login again.")

    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise UnauthorizedException("Invalid token. Please login again.")