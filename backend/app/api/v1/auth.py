from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, InternalServerException
from app.dependencies import get_current_user
from fastapi import UploadFile, File
import uuid

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
    
@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Uploads profile picture to Supabase Storage.
    Updates avatar_url in profiles table.
    Returns the public URL of the uploaded image.
    """
    user_id = user["sub"]

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise BadRequestException("Only JPG, PNG and WebP images allowed.")

    # Read file bytes
    file_bytes = await file.read()

    # Max 5MB for profile pics
    if len(file_bytes) > 5 * 1024 * 1024:
        raise BadRequestException("Image too large. Maximum size is 5MB.")

    # Generate unique file path — user_id/uuid.ext
    ext = file.content_type.split("/")[-1]
    file_path = f"{user_id}/{uuid.uuid4()}.{ext}"

    try:
        # Delete old avatar if exists
        try:
            old_profile = supabase_admin.table("profiles").select(
                "avatar_url"
            ).eq("id", user_id).single().execute()

            if old_profile.data and old_profile.data.get("avatar_url"):
                # Extract old file path from URL
                old_url = old_profile.data["avatar_url"]
                old_path = old_url.split("/avatars/")[-1]
                supabase_admin.storage.from_("avatars").remove([old_path])
        except Exception:
            pass  # No old avatar — that's fine

        # Upload new avatar
        supabase_admin.storage.from_("avatars").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )

        # Get public URL
        avatar_url = supabase_admin.storage.from_("avatars").get_public_url(file_path)

        # Update profile with new avatar URL
        supabase_admin.table("profiles").update({
            "avatar_url": avatar_url,
        }).eq("id", user_id).execute()

        logger.info(f"Avatar uploaded for user {user_id}")

        return {
            "success": True,
            "avatar_url": avatar_url,
        }

    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        raise InternalServerException("Failed to upload avatar. Please try again.")


@router.delete("/delete-avatar")
async def delete_avatar(user: dict = Depends(get_current_user)):
    """
    Deletes profile picture from Supabase Storage.
    Clears avatar_url in profiles table.
    """
    user_id = user["sub"]

    try:
        profile = supabase_admin.table("profiles").select(
            "avatar_url"
        ).eq("id", user_id).single().execute()

        if profile.data and profile.data.get("avatar_url"):
            old_url = profile.data["avatar_url"]
            old_path = old_url.split("/avatars/")[-1]
            supabase_admin.storage.from_("avatars").remove([old_path])

        supabase_admin.table("profiles").update({
            "avatar_url": None,
        }).eq("id", user_id).execute()

        return {
            "success": True,
            "message": "Avatar deleted successfully.",
        }

    except Exception as e:
        logger.error(f"Avatar delete failed: {e}")
        raise InternalServerException("Failed to delete avatar.")