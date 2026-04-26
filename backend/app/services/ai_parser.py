import groq
import json
import base64
import fitz  # PyMuPDF
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
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        doc.close()
        logger.info(f"PDF page 1 converted: {len(img_bytes)} bytes")
        return img_bytes, "image/jpeg"
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        raise InternalServerException(
            "Failed to read PDF. Please upload a JPG or PNG instead."
        )


def convert_pdf_all_pages(pdf_bytes: bytes) -> list[tuple[bytes, str]]:
    """
    Converts ALL pages of PDF to JPEG images.
    KCET has exam timetable on page 1 only but we check all pages.
    Returns list of (image_bytes, mime_type).
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for i in range(min(len(doc), 3)):  # max 3 pages
            page = doc[i]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("jpeg")
            pages.append((img_bytes, "image/jpeg"))
            logger.info(f"PDF page {i+1} converted: {len(img_bytes)} bytes")
        doc.close()
        return pages
    except Exception as e:
        logger.error(f"PDF multi-page conversion failed: {e}")
        raise InternalServerException("Failed to read PDF pages.")


def parse_admit_card(file_bytes: bytes, mime_type: str) -> dict:
    """
    Sends admit card to Groq Vision (Llama 4 Scout).
    Extracts ALL sessions — works for every Indian exam:
    - Single session: NEET, CLAT, CAT → sessions array with 1 item
    - Same day multiple papers: JEE Advanced, UPSC Prelims → 2 items
    - Multi day multi subject: KCET, MHT-CET → 3+ items
    - Multi day multi paper: UPSC Mains → 9 items
    """
    try:
        # ── PDF HANDLING ──
        # For PDFs, convert page 1 to image
        # Groq vision does not accept PDF directly
        if mime_type == "application/pdf":
            logger.info("PDF detected — converting to image")
            file_bytes, mime_type = convert_pdf_to_image(file_bytes)

        encoded = base64.standard_b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{encoded}"

        prompt = """
You are reading an Indian competitive exam admit card / hall ticket.

Your job is to extract ALL exam sessions from this admit card.

WHAT IS A SESSION?
A session = one exam paper / one subject on a specific date and time.
Examples:
- KCET has 3 sessions: Physics (23 Apr 10:30-11:50), Chemistry (23 Apr 14:30-15:50), Maths (24 Apr 10:30-11:50)
- JEE Advanced has 2 sessions: Paper 1 (morning), Paper 2 (afternoon) same day
- NEET has 1 session: single paper single day
- UPSC Prelims has 2 sessions: GS Paper 1 (morning), CSAT (afternoon) same day
- UPSC Mains has multiple sessions across multiple days

CRITICAL RULES FOR EXTRACTION:
1. Look for any table, timetable, or schedule on the admit card
2. Extract EVERY row in that table as a separate session
3. Each session must have: date, start_time, end_time
4. subject_name is optional — use null if not mentioned
5. session_number starts from 1
6. All dates → YYYY-MM-DD format
7. All times → HH:MM 24-hour format (14:30 not 2:30 PM)
8. exam_name → use the SHORT official name only (e.g. "KCET 2026" not the full Kannada+English title)
9. reporting_time → candidate arrival time (different from exam start time). Use null if not found.

Return ONLY this exact JSON structure, nothing else:

{
    "exam_name": "short official exam name like KCET 2026 or JEE Main 2026",
    "candidate_name": "full name of student",
    "roll_number": "roll number or registration number or hall ticket number",
    "center_name": "full name of exam center",
    "center_address": "complete address of exam center",
    "center_city": "city name only",
    "reporting_time": "candidate arrival time HH:MM or null",
    "sessions": [
        {
            "session_number": 1,
            "subject_name": "Physics or Paper 1 or GS Paper I or null",
            "exam_date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "end_time": "HH:MM or null"
        },
        {
            "session_number": 2,
            "subject_name": "Chemistry or Paper 2 or null",
            "exam_date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "end_time": "HH:MM or null"
        }
    ],
    "instructions": "important exam day instructions as single string or null",
    "raw_text": "all visible text from the image"
}

STRICT RULES:
- Return ONLY the JSON object
- No markdown, no backticks, no explanation before or after
- sessions array must always have at least 1 item
- Never merge multiple sessions into one
- If only one session exists, sessions array has exactly 1 item
- null for missing fields, never empty string
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
            max_tokens=3000,
            temperature=0.1,
            # NO response_format here — it breaks with Kannada/regional text
        )

        raw_text = response.choices[0].message.content.strip()
        logger.info(f"Groq raw response (first 500): {raw_text[:500]}")

        # ── CLEAN JSON ──
        # Sometimes Groq wraps response in ```json ... ```
        # Strip those if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = [line for line in lines if not line.startswith("```")]
            raw_text = "\n".join(lines).strip()

        parsed = json.loads(raw_text)

        # ── VALIDATE SESSIONS ──
        sessions = parsed.get("sessions", [])
        if not sessions:
            # Fallback: if AI didn't return sessions array
            # Build one session from old-style fields
            logger.warning("No sessions array found — building fallback single session")
            sessions = [{
                "session_number": 1,
                "subject_name": None,
                "exam_date": parsed.get("exam_date"),
                "start_time": parsed.get("exam_start_time") or parsed.get("reporting_time"),
                "end_time": parsed.get("exam_end_time") or parsed.get("gate_closing_time"),
            }]
            parsed["sessions"] = sessions

        logger.info(
            f"Parsed: {parsed.get('exam_name')} | "
            f"{len(sessions)} session(s) | "
            f"Center: {parsed.get('center_city')}"
        )

        for s in sessions:
            logger.info(
                f"  Session {s.get('session_number')}: "
                f"{s.get('subject_name')} | "
                f"{s.get('exam_date')} | "
                f"{s.get('start_time')} → {s.get('end_time')}"
            )

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed: {e}\nRaw: {raw_text[:300]}")
        raise InternalServerException(
            "Could not read admit card. Please try again or use a clearer image."
        )

    except InternalServerException:
        raise

    except Exception as e:
        logger.error(f"Groq parsing failed: {e}")
        raise InternalServerException(f"Failed to parse admit card: {str(e)}")