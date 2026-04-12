import google.generativeai as genai
import json
import base64
from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import InternalServerException

logger = setup_logger(__name__)

# Configure Gemini once at module level
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")


def parse_admit_card(file_bytes: bytes, mime_type: str) -> dict:
    """
    Sends admit card image/PDF to Gemini Vision API.
    Extracts all exam details and returns structured JSON.
    Works with JEE, NEET, UPSC, KCET, Board exams automatically.
    """
    try:
        prompt = """
        You are an expert admit card parser for Indian competitive exams.
        
        Analyze this admit card image carefully and extract the following information.
        
        Return ONLY a valid JSON object with these exact keys:
        {
            "exam_name": "full name of the exam (e.g. JEE Main 2024, NEET UG 2024)",
            "exam_date": "date in YYYY-MM-DD format",
            "reporting_time": "time in HH:MM format (24 hour), null if not found",
            "gate_closing_time": "time in HH:MM format (24 hour), null if not found",
            "center_name": "name of exam center/venue",
            "center_address": "full address of exam center",
            "center_city": "city name only",
            "roll_number": "candidate roll number or hall ticket number",
            "candidate_name": "name of the candidate",
            "instructions": "any important instructions mentioned, as a single string",
            "raw_text": "all text extracted from the admit card"
        }
        
        Rules:
        - Return ONLY the JSON object, no extra text, no markdown, no backticks
        - If a field is not found, use null
        - For exam_date, convert any date format to YYYY-MM-DD
        - For times, convert to 24 hour HH:MM format
        - Be accurate, double check roll number and dates
        """

        # Encode file to base64 for Gemini
        encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

        response = model.generate_content([
            {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": encoded,
                }
            },
            prompt
        ])

        raw_text = response.text.strip()

        # Clean response in case Gemini adds markdown fences
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        parsed = json.loads(raw_text)
        logger.info(f"Admit card parsed successfully: {parsed.get('exam_name')}")
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned invalid JSON: {e}")
        raise InternalServerException("AI parser returned invalid response. Please try again.")

    except Exception as e:
        logger.error(f"Gemini parsing failed: {e}")
        raise InternalServerException("Failed to parse admit card. Please try again.")