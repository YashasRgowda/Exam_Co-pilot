from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import supabase
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, InternalServerException
from app.dependencies import get_current_user

router = APIRouter()
logger = setup_logger(__name__)


# -------------------------
# Schemas (inline for auth)
# -------------------------

class SendOTPRequest(BaseModel):
    phone: str  # Format: 9876543210


class VerifyOTPRequest(BaseModel):
    phone: str
    token: str  # 6 digit OTP


class UpdateProfileRequest(BaseModel):
    full_name: str


# -------------------------
# Routes
# -------------------------

@router.post("/send-otp")
async def send_otp(payload: SendOTPRequest):
    """
    Step 1 of login — sends OTP to student's phone number.
    Supabase handles SMS delivery automatically.
    """
    try:
        response = supabase.auth.sign_in_with_otp({
            "phone": payload.phone
        })
        logger.info(f"OTP sent to {payload.phone}")
        return {
            "success": True,
            "message": "OTP sent successfully."
        }
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        raise BadRequestException("Failed to send OTP. Check phone number format. Example: 9876543210")


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOTPRequest):
    """
    Step 2 of login — verifies OTP and returns session tokens.
    Frontend stores access_token and uses it for all future requests.
    """
    try:
        response = supabase.auth.verify_otp({
            "phone": payload.phone,
            "token": payload.token,
            "type": "sms"
        })

        if not response.session:
            raise BadRequestException("Invalid or expired OTP.")

        logger.info(f"OTP verified for {payload.phone}")
        return {
            "success": True,
            "message": "Login successful.",
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user_id": response.user.id,
        }
    except BadRequestException:
        raise
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        raise BadRequestException("Invalid or expired OTP.")


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    """
    Returns logged in user's profile.
    Requires Bearer token in Authorization header.
    """
    try:
        response = supabase.table("profiles").select("*").eq("id", user["sub"]).single().execute()
        return {
            "success": True,
            "profile": response.data
        }
    except Exception as e:
        logger.error(f"Failed to fetch profile: {e}")
        raise InternalServerException()


@router.patch("/me")
async def update_profile(
    payload: UpdateProfileRequest,
    user: dict = Depends(get_current_user)
):
    """
    Updates logged in user's full name.
    """
    try:
        response = supabase.table("profiles").update({
            "full_name": payload.full_name
        }).eq("id", user["sub"]).execute()

        return {
            "success": True,
            "message": "Profile updated successfully."
        }
    except Exception as e:
        logger.error(f"Failed to update profile: {e}")
        raise InternalServerException()