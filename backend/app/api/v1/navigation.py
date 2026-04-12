from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, NotFoundException, InternalServerException
from app.dependencies import get_current_user
from app.config import settings
import httpx

router = APIRouter()
logger = setup_logger(__name__)


# ---------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------
class GeocodeRequest(BaseModel):
    exam_id: str
    origin_lat: float
    origin_lng: float


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@router.post("/directions")
async def get_directions(
    payload: GeocodeRequest,
    user: dict = Depends(get_current_user)
):
    """
    Returns distance, travel time and Google Maps directions
    from student's current location to exam center.
    Also updates exam center coordinates in DB if not already set.
    """
    user_id = user["sub"]

    # Get exam details
    exam = supabase.table("exams").select(
        "id, center_address, center_name, center_latitude, center_longitude"
    ).eq("id", payload.exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    exam_data = exam.data
    dest_lat = exam_data.get("center_latitude")
    dest_lng = exam_data.get("center_longitude")

    # If coordinates not in DB, geocode the address first
    if not dest_lat or not dest_lng:
        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        async with httpx.AsyncClient() as client:
            geo_response = await client.get(geocode_url, params={
                "address": exam_data["center_address"],
                "key": settings.GOOGLE_MAPS_API_KEY,
            })
            geo_data = geo_response.json()

        if geo_data["status"] != "OK":
            raise BadRequestException(
                "Could not find exam center location. Please check the address."
            )

        location = geo_data["results"][0]["geometry"]["location"]
        dest_lat = location["lat"]
        dest_lng = location["lng"]

        # Save coordinates to DB for future use
        supabase_admin.table("exams").update({
            "center_latitude": dest_lat,
            "center_longitude": dest_lng,
        }).eq("id", payload.exam_id).execute()

        logger.info(f"Geocoded exam center: {dest_lat}, {dest_lng}")

    # Get directions from Google Maps Distance Matrix API
    matrix_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    async with httpx.AsyncClient() as client:
        matrix_response = await client.get(matrix_url, params={
            "origins": f"{payload.origin_lat},{payload.origin_lng}",
            "destinations": f"{dest_lat},{dest_lng}",
            "mode": "driving",
            "departure_time": "now",
            "traffic_model": "best_guess",
            "key": settings.GOOGLE_MAPS_API_KEY,
        })
        matrix_data = matrix_response.json()

    if matrix_data["status"] != "OK":
        raise InternalServerException("Failed to get directions. Please try again.")

    element = matrix_data["rows"][0]["elements"][0]

    if element["status"] != "OK":
        raise BadRequestException("Could not calculate route to exam center.")

    distance_text = element["distance"]["text"]
    distance_meters = element["distance"]["value"]
    duration_text = element["duration"]["text"]
    duration_seconds = element["duration"]["value"]

    # Duration in traffic if available
    duration_in_traffic_text = element.get(
        "duration_in_traffic", {}
    ).get("text", duration_text)

    duration_in_traffic_seconds = element.get(
        "duration_in_traffic", {}
    ).get("value", duration_seconds)

    # Build Google Maps deep link for navigation
    maps_url = (
        f"https://www.google.com/maps/dir/?api=1"
        f"&origin={payload.origin_lat},{payload.origin_lng}"
        f"&destination={dest_lat},{dest_lng}"
        f"&travelmode=driving"
    )

    # Build Uber deep link
    uber_url = (
        f"https://m.uber.com/ul/?action=setPickup"
        f"&pickup=my_location"
        f"&dropoff[latitude]={dest_lat}"
        f"&dropoff[longitude]={dest_lng}"
        f"&dropoff[nickname]={exam_data['center_name']}"
    )

    # Build Ola deep link
    ola_url = (
        f"https://book.olacabs.com/?lat={payload.origin_lat}"
        f"&lng={payload.origin_lng}"
        f"&drop_lat={dest_lat}"
        f"&drop_lng={dest_lng}"
    )

    # Build Rapido deep link
    rapido_url = (
        f"https://rapido.bike/?"
        f"pickup_lat={payload.origin_lat}&pickup_lng={payload.origin_lng}"
        f"&drop_lat={dest_lat}&drop_lng={dest_lng}"
    )

    return {
        "success": True,
        "exam_center": {
            "name": exam_data["center_name"],
            "address": exam_data["center_address"],
            "latitude": dest_lat,
            "longitude": dest_lng,
        },
        "navigation": {
            "distance": distance_text,
            "distance_meters": distance_meters,
            "duration": duration_text,
            "duration_in_traffic": duration_in_traffic_text,
            "duration_seconds": duration_in_traffic_seconds,
        },
        "links": {
            "google_maps": maps_url,
            "uber": uber_url,
            "ola": ola_url,
            "rapido": rapido_url,
        },
    }


@router.get("/exam-center-info/{exam_id}")
async def get_exam_center_info(
    exam_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns exam center crowd sourced info.
    Shows previous students feedback about this center.
    """
    user_id = user["sub"]

    exam = supabase.table("exams").select(
        "center_address, center_city, center_name"
    ).eq("id", exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    # Get crowd sourced feedback for this center
    feedback = supabase.table("exam_center_feedback").select(
        "security_strictness, locker_available, parking_available, location_difficulty, entry_gate_tips, additional_tips"
    ).eq("center_address", exam.data["center_address"]).execute()

    if not feedback.data:
        return {
            "success": True,
            "center": exam.data,
            "has_feedback": False,
            "message": "No feedback yet for this exam center.",
        }

    # Calculate averages
    total = len(feedback.data)
    avg_security = round(
        sum(f["security_strictness"] or 0 for f in feedback.data) / total, 1
    )
    avg_difficulty = round(
        sum(f["location_difficulty"] or 0 for f in feedback.data) / total, 1
    )
    locker_yes = sum(1 for f in feedback.data if f["locker_available"])
    parking_yes = sum(1 for f in feedback.data if f["parking_available"])
    tips = [f["entry_gate_tips"] for f in feedback.data if f["entry_gate_tips"]]

    return {
        "success": True,
        "center": exam.data,
        "has_feedback": True,
        "total_reviews": total,
        "insights": {
            "security_strictness": f"{avg_security}/5",
            "locker_available": f"{locker_yes}/{total} students found lockers",
            "parking_available": f"{parking_yes}/{total} students found parking",
            "location_difficulty": f"{avg_difficulty}/5",
            "entry_tips": tips,
        },
    }