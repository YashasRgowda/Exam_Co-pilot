from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import supabase, supabase_admin
from app.core.logger import setup_logger
from app.core.exceptions import BadRequestException, NotFoundException, InternalServerException
from app.dependencies import get_current_user
import httpx
import math

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
# Helper: straight line distance in km (Haversine formula)
# Used as fallback when OSRM fails
# ---------------------------------------------------------------
def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 1)


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@router.post("/directions")
async def get_directions(
    payload: GeocodeRequest,
    user: dict = Depends(get_current_user)
):
    """
    Returns distance, travel time and navigation deep links
    from student's current location to exam center.
    Uses OpenStreetMap (free, no billing needed).
    """
    user_id = user["sub"]

    # Get exam details
    exam = supabase.table("exams").select(
        "id, center_address, center_name, center_city, center_latitude, center_longitude"
    ).eq("id", payload.exam_id).eq("user_id", user_id).single().execute()

    if not exam.data:
        raise NotFoundException("Exam not found.")

    exam_data = exam.data
    dest_lat = exam_data.get("center_latitude")
    dest_lng = exam_data.get("center_longitude")

    # If coordinates not in DB, geocode using OpenStreetMap Nominatim (free)
    if not dest_lat or not dest_lng:

        # Build fallback queries — from most specific to least
        queries = []
        if exam_data.get("center_name") and exam_data.get("center_city"):
            queries.append(f"{exam_data['center_name']}, {exam_data['center_city']}, India")
        if exam_data.get("center_address") and exam_data.get("center_city"):
            queries.append(f"{exam_data['center_address']}, {exam_data['center_city']}, India")
        if exam_data.get("center_name"):
            queries.append(f"{exam_data['center_name']}, India")
        if exam_data.get("center_city"):
            queries.append(f"{exam_data['center_city']}, India")

        location = None
        async with httpx.AsyncClient() as client:
            for query in queries:
                try:
                    response = await client.get(
                        "https://nominatim.openstreetmap.org/search",
                        params={
                            "q": query,
                            "format": "json",
                            "limit": 1,
                            "countrycodes": "in",
                        },
                        headers={
                            # Nominatim requires a User-Agent header
                            "User-Agent": "ExamPilot/1.0 (exam pilot app)"
                        },
                        timeout=10.0,
                    )
                    results = response.json()
                    logger.info(f"Nominatim attempt: '{query}' → {len(results)} results")

                    if results:
                        location = {
                            "lat": float(results[0]["lat"]),
                            "lng": float(results[0]["lon"]),
                        }
                        logger.info(f"Geocoded successfully: '{query}' → {location}")
                        break
                except Exception as e:
                    logger.warning(f"Nominatim error for '{query}': {e}")
                    continue

        if not location:
            raise BadRequestException(
                "Could not find exam center location. Please check the address."
            )

        dest_lat = location["lat"]
        dest_lng = location["lng"]

        # Save coordinates to DB so we don't geocode again next time
        supabase_admin.table("exams").update({
            "center_latitude": dest_lat,
            "center_longitude": dest_lng,
        }).eq("id", payload.exam_id).execute()

        logger.info(f"Saved exam center coordinates: {dest_lat}, {dest_lng}")

    # Get driving distance + duration using OSRM (free, no key needed)
    distance_text = None
    duration_text = None
    duration_in_traffic_text = None

    try:
        async with httpx.AsyncClient() as client:
            osrm_response = await client.get(
                f"http://router.project-osrm.org/route/v1/driving/"
                f"{payload.origin_lng},{payload.origin_lat};"
                f"{dest_lng},{dest_lat}",
                params={
                    "overview": "false",
                    "steps": "false",
                },
                timeout=10.0,
            )
            osrm_data = osrm_response.json()
            logger.info(f"OSRM response code: {osrm_data.get('code')}")

            if osrm_data.get("code") == "Ok":
                route = osrm_data["routes"][0]
                distance_meters = route["distance"]
                duration_seconds = route["duration"]

                # Format distance
                if distance_meters >= 1000:
                    distance_text = f"{distance_meters/1000:.1f} km"
                else:
                    distance_text = f"{int(distance_meters)} m"

                # Format duration
                duration_minutes = int(duration_seconds / 60)
                if duration_minutes >= 60:
                    hours = duration_minutes // 60
                    mins = duration_minutes % 60
                    duration_text = f"{hours} hr {mins} min"
                else:
                    duration_text = f"{duration_minutes} min"

                # Add ~20% buffer for traffic estimate
                traffic_minutes = int(duration_minutes * 1.2)
                if traffic_minutes >= 60:
                    hours = traffic_minutes // 60
                    mins = traffic_minutes % 60
                    duration_in_traffic_text = f"{hours} hr {mins} min"
                else:
                    duration_in_traffic_text = f"{traffic_minutes} min"

    except Exception as e:
        logger.warning(f"OSRM failed, using haversine fallback: {e}")

    # Fallback to straight line distance if OSRM fails
    if not distance_text:
        straight_km = haversine_distance(
            payload.origin_lat, payload.origin_lng, dest_lat, dest_lng
        )
        # Road distance is roughly 1.3x straight line
        road_km = round(straight_km * 1.3, 1)
        distance_text = f"~{road_km} km"
        est_minutes = int((road_km / 40) * 60)  # assume 40 km/h avg speed
        duration_text = f"~{est_minutes} min"
        duration_in_traffic_text = f"~{int(est_minutes * 1.3)} min"

    # Build Google Maps deep link for navigation
    maps_url = (
        f"https://www.google.com/maps/dir/?api=1"
        f"&origin={payload.origin_lat},{payload.origin_lng}"
        f"&destination={dest_lat},{dest_lng}"
        f"&travelmode=driving"
    )

    # Build Uber deep link with real coordinates
    uber_url = (
        f"https://m.uber.com/ul/?action=setPickup"
        f"&pickup=my_location"
        f"&dropoff[latitude]={dest_lat}"
        f"&dropoff[longitude]={dest_lng}"
        f"&dropoff[nickname]={exam_data['center_name']}"
    )

    # Build Ola deep link with real coordinates
    ola_url = (
        f"https://book.olacabs.com/?lat={payload.origin_lat}"
        f"&lng={payload.origin_lng}"
        f"&drop_lat={dest_lat}"
        f"&drop_lng={dest_lng}"
    )

    # Build Rapido deep link with real coordinates
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
            "duration": duration_text,
            "duration_in_traffic": duration_in_traffic_text,
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