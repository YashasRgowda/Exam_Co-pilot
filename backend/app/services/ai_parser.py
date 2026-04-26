import groq
import json
import base64
import io
from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import InternalServerException

logger = setup_logger(__name__)

client = groq.Groq(api_key=settings.GROQ_API_KEY)


def convert_pdf_to_image(pdf_bytes: bytes) -> tuple[bytes, str]:
    """
    Converts first page of PDF to JPEG image bytes.
    Returns (image_bytes, mime_type).
    """
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]  # First page only
        # Render at 2x resolution for better OCR quality
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        doc.close()
        logger.info(f"PDF converted to image: {len(img_bytes)} bytes")
        return img_bytes, "image/jpeg"
    except ImportError:
        raise InternalServerException(
            "PDF parsing requires PyMuPDF. Please install it: pip install PyMuPDF"
        )
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        raise InternalServerException(
            "Failed to read PDF. Please try uploading a JPG or PNG image of your admit card instead."
        )


def parse_admit_card(file_bytes: bytes, mime_type: str) -> dict:
    """
    Sends admit card image to Groq Vision API (Llama 4 Scout).
    Supports both images (JPG, PNG) and PDFs.
    Extracts all exam details and returns structured JSON.
    Works with JEE, NEET, UPSC, GATE, KCET, Board exams automatically.
    Free tier: 1000 requests/day.
    """
    try:
        # ── PDF HANDLING ──
        # Groq vision doesn't support PDF — convert to image first
        if mime_type == "application/pdf":
            logger.info("PDF detected — converting to image for Groq vision")
            file_bytes, mime_type = convert_pdf_to_image(file_bytes)

        encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{encoded}"

        prompt = """
You are reading an Indian competitive exam admit card / hall ticket.

Your task is to extract specific information from this admit card image.

CRITICAL INSTRUCTIONS FOR EXAM TIMINGS:
- Look for the EXAM TIME or SESSION TIME on the admit card.
  Example: "Time: 2:30 PM to 5:30 PM" or "09:30 AM to 12:30 PM"
- "exam_start_time" = the time when the EXAM BEGINS (e.g. 2:30 PM = 14:30)
- "exam_end_time" = the time when the EXAM ENDS (e.g. 5:30 PM = 17:30)
- Do NOT confuse "Reporting Time" or "Candidate Arrival Time" with exam start time.
  Reporting time is when the candidate must arrive at the center (usually 1-2 hours before exam).
  Exam start time is when the exam paper actually begins.
- If you see something like "Report at 12:30, Exam: 2:30 PM to 5:30 PM":
  exam_start_time = "14:30", exam_end_time = "17:30", reporting_time = "12:30"

Return ONLY a valid JSON object with these exact keys:

{
    "exam_name": "full official name of the exam as printed on the admit card",
    "exam_date": "date in YYYY-MM-DD format",
    "exam_start_time": "time when exam paper STARTS in HH:MM 24hr format, or null if not found",
    "exam_end_time": "time when exam ENDS in HH:MM 24hr format, or null if not found",
    "reporting_time": "candidate arrival/reporting time in HH:MM 24hr format, or null if not found",
    "center_name": "full name of the exam center or venue",
    "center_address": "complete postal address of the exam center",
    "center_city": "city name only",
    "roll_number": "roll number, registration number, or hall ticket number",
    "candidate_name": "full name of the student/candidate",
    "instructions": "any important exam day instructions as a single string",
    "raw_text": "all visible text from the image"
}

STRICT RULES:
- Return ONLY the JSON object, nothing else
- No markdown, no backticks, no explanation before or after
- If a field cannot be found, use null
- All dates must be in YYYY-MM-DD format
- All times must be in HH:MM 24-hour format (e.g. 14:30 not 2:30 PM)
- Be extremely careful with exam timings — wrong times can cause students to miss exams
"""

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
            max_tokens=2000,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw_text = response.choices[0].message.content.strip()
        logger.info(f"Groq raw response (first 300): {raw_text[:300]}")

        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        # ── FIELD MIGRATION ──
        exam_start = parsed.get("exam_start_time")
        exam_end = parsed.get("exam_end_time")
        arrival_time = parsed.get("reporting_time")

        parsed["reporting_time"] = exam_start        # DB column = exam start time
        parsed["gate_closing_time"] = exam_end       # DB column = exam end time
        parsed["candidate_arrival_time"] = arrival_time

        logger.info(
            f"Admit card parsed: {parsed.get('exam_name')} | "
            f"Start: {exam_start} | End: {exam_end} | Arrive by: {arrival_time}"
        )

        return parsed

    except InternalServerException:
        raise

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from Groq: {e}")
        raise InternalServerException("AI returned invalid response. Please try again.")

    except Exception as e:
        logger.error(f"Groq parsing failed: {e}")
        raise InternalServerException(f"Failed to parse admit card: {str(e)}")