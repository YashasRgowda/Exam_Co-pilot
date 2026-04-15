from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, NotFoundException, InternalServerException
from app.dependencies import get_current_user

router = APIRouter()
logger = setup_logger(__name__)


# ---------------------------------------------------------------
# Default checklist items per exam type
# These are auto-generated when an exam is parsed
# ---------------------------------------------------------------
DEFAULT_CHECKLIST_ITEMS = [
    "Admit Card (printed)",
    "Government ID Proof (Aadhaar / PAN / Passport)",
    "Passport size photographs",
    "Blue/Black ballpoint pens (2-3)",
    "Transparent water bottle",
    "Analog wristwatch (no smartwatch)",
]

DEFAULT_NOT_ALLOWED_ITEMS = [
    "Mobile Phone",
    "Smartwatch or digital watch",
    "Calculator",
    "Bluetooth devices",
    "Bags or pouches",
    "Loose papers or books",
]


# ---------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------
class AddChecklistItemRequest(BaseModel):
    item_name: str

class UpdateChecklistItemRequest(BaseModel):
    is_checked: Optional[bool] = None
    item_name: Optional[str] = None


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@router.post("/generate/{exam_id}")
async def generate_checklist(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Auto generates default checklist items for a given exam.
    Called automatically after admit card is parsed.
    Can also be called manually to regenerate checklist.
    """
    user_id = user["sub"]

    # Verify exam belongs to this user
    exam = supabase_admin.table("exams").select("id").eq(
    "id", exam_id
    ).eq("user_id", user_id).execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    # Delete existing checklist items for this exam (regenerate)
    supabase_admin.table("checklist_items").delete().eq(
        "exam_id", exam_id
    ).execute()

    # Insert default items
    items_to_insert = [
        {
            "user_id": user_id,
            "exam_id": exam_id,
            "item_name": item,
            "is_checked": False,
            "is_default": True,
        }
        for item in DEFAULT_CHECKLIST_ITEMS
    ]

    result = supabase_admin.table("checklist_items").insert(
        items_to_insert
    ).execute()

    logger.info(f"Checklist generated for exam {exam_id}")

    return {
        "success": True,
        "message": "Checklist generated successfully.",
        "items": result.data,
        "not_allowed": DEFAULT_NOT_ALLOWED_ITEMS,
    }


@router.get("/{exam_id}")
async def get_checklist(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns all checklist items for a given exam.
    Also returns the static not-allowed items list.
    """
    user_id = user["sub"]

    items = supabase.table("checklist_items").select("*").eq(
        "exam_id", exam_id
    ).eq("user_id", user_id).execute()

    return {
        "success": True,
        "items": items.data,
        "not_allowed": DEFAULT_NOT_ALLOWED_ITEMS,
    }


@router.patch("/{item_id}")
async def update_checklist_item(
    item_id: str,
    payload: UpdateChecklistItemRequest,
    user: dict = Depends(get_current_user)
):
    """
    Updates a checklist item.
    Used when student ticks/unticks an item or renames it.
    """
    user_id = user["sub"]

    update_data = {}
    if payload.is_checked is not None:
        update_data["is_checked"] = payload.is_checked
    if payload.item_name is not None:
        update_data["item_name"] = payload.item_name

    if not update_data:
        raise BadRequestException("Nothing to update.")

    result = supabase.table("checklist_items").update(
        update_data
    ).eq("id", item_id).eq("user_id", user_id).execute()

    return {
        "success": True,
        "message": "Item updated.",
        "item": result.data[0] if result.data else None,
    }


@router.post("/{exam_id}/add")
async def add_custom_item(
    exam_id: str,
    payload: AddChecklistItemRequest,
    user: dict = Depends(get_current_user)
):
    """
    Adds a custom checklist item to an exam.
    Students can add their own items beyond the defaults.
    """
    user_id = user["sub"]

    result = supabase.table("checklist_items").insert({
        "user_id": user_id,
        "exam_id": exam_id,
        "item_name": payload.item_name,
        "is_checked": False,
        "is_default": False,
    }).execute()

    return {
        "success": True,
        "message": "Item added.",
        "item": result.data[0],
    }


@router.delete("/{item_id}")
async def delete_checklist_item(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Deletes a checklist item.
    Only custom items should be deleted by students.
    """
    user_id = user["sub"]

    supabase.table("checklist_items").delete().eq(
        "id", item_id
    ).eq("user_id", user_id).execute()

    return {
        "success": True,
        "message": "Item deleted.",
    }