# from google import genai
# from google.genai import types
# import json
# from app.config import settings
# from app.core.logger import setup_logger
# from app.core.exceptions import InternalServerException

# logger = setup_logger(__name__)

# client = genai.Client(api_key=settings.GEMINI_API_KEY)


# def parse_admit_card(file_bytes: bytes, mime_type: str) -> dict:
#     try:
#         prompt = """
#         Look at this image and extract text information from it.
#         Return a JSON object with these keys:
#         {
#             "exam_name": "name of exam found in image",
#             "exam_date": "date in YYYY-MM-DD format",
#             "reporting_time": "time in HH:MM 24hr format or null",
#             "gate_closing_time": "time in HH:MM 24hr format or null",
#             "center_name": "venue or center name",
#             "center_address": "full address",
#             "center_city": "city name",
#             "roll_number": "roll number or registration number",
#             "candidate_name": "person name",
#             "instructions": "any instructions as single string",
#             "raw_text": "all text visible in image"
#         }
#         Return ONLY the JSON. No markdown. No explanation.
#         If any field is missing use null.
#         """

#         response = client.models.generate_content(
#             model="gemini-2.5-flash",
#             contents=[
#                 types.Content(
#                     role="user",
#                     parts=[
#                         types.Part.from_bytes(
#                             data=file_bytes,
#                             mime_type=mime_type,
#                         ),
#                         types.Part.from_text(text=prompt),
#                     ],
#                 )
#             ],
#             config=types.GenerateContentConfig(
#                 safety_settings=[
#                     types.SafetySetting(
#                         category="HARM_CATEGORY_DANGEROUS_CONTENT",
#                         threshold="BLOCK_NONE",
#                     ),
#                     types.SafetySetting(
#                         category="HARM_CATEGORY_HARASSMENT",
#                         threshold="BLOCK_NONE",
#                     ),
#                 ]
#             ),
#         )

#         # ── DEEP LOGGING ──
#         # Log everything so we can see exactly what Gemini returned
#         logger.info(f"Response candidates count: {len(response.candidates) if response.candidates else 0}")

#         if not response.candidates:
#             logger.error("No candidates in response")
#             raise InternalServerException("AI returned no response. Please try again.")

#         candidate = response.candidates[0]
#         logger.info(f"Finish reason: {candidate.finish_reason}")
#         logger.info(f"Content parts: {len(candidate.content.parts) if candidate.content and candidate.content.parts else 0}")

#         # Check finish reason
#         # 1 = STOP (success)
#         # 2 = MAX_TOKENS
#         # 3 = SAFETY
#         # 4 = RECITATION (copyright)
#         # 5 = OTHER
#         if candidate.finish_reason != 1:
#             logger.error(f"Bad finish reason: {candidate.finish_reason}")
#             raise InternalServerException(
#                 f"AI blocked this image (reason: {candidate.finish_reason}). "
#                 "Try a different image or take a fresh photo of the admit card."
#             )

#         # Safely extract text from parts
#         if not candidate.content or not candidate.content.parts:
#             logger.error("No content parts in candidate")
#             raise InternalServerException("AI returned empty response. Please try again.")

#         # Get text from first part
#         raw_text = candidate.content.parts[0].text

#         logger.info(f"Raw text received (first 200 chars): {raw_text[:200] if raw_text else 'EMPTY'}")

#         if not raw_text:
#             raise InternalServerException("AI returned empty text. Please try again.")

#         raw_text = raw_text.strip()

#         # Clean markdown fences if present
#         if raw_text.startswith("```"):
#             raw_text = raw_text.split("```")[1]
#             if raw_text.startswith("json"):
#                 raw_text = raw_text[4:]
#             raw_text = raw_text.strip()

#         parsed = json.loads(raw_text)
#         logger.info(f"Admit card parsed successfully: {parsed.get('exam_name')}")
#         return parsed

#     except InternalServerException:
#         raise

#     except json.JSONDecodeError as e:
#         logger.error(f"Gemini invalid JSON: {e}")
#         logger.error(f"Raw text that failed: {raw_text if 'raw_text' in dir() else 'unavailable'}")
#         raise InternalServerException("AI returned invalid JSON. Please try again.")

#     except Exception as e:
#         logger.error(f"Gemini parsing failed: {e}")
#         raise InternalServerException(f"Failed to parse: {str(e)}")



import groq
import json
import base64
from app.config import settings
from app.core.logger import setup_logger
from app.core.exceptions import InternalServerException

logger = setup_logger(__name__)

# Initialize Groq client once at module level
# Groq is free, fast, and has vision support via Llama 4
client = groq.Groq(api_key=settings.GROQ_API_KEY)


def parse_admit_card(file_bytes: bytes, mime_type: str) -> dict:
    """
    Sends admit card image to Groq Vision API (Llama 4 Maverick).
    Extracts all exam details and returns structured JSON.
    Works with JEE, NEET, UPSC, KCET, Board exams automatically.
    Free tier: 1000 requests/day — more than enough.
    """
    try:
        # Encode image to base64 for API
        encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

        # Build data URL for image
        data_url = f"data:{mime_type};base64,{encoded}"

        prompt = """
        Look at this admit card image and extract all information from it.
        
        Return ONLY a valid JSON object with these exact keys:
        {
            "exam_name": "full name of the exam",
            "exam_date": "date in YYYY-MM-DD format",
            "reporting_time": "time in HH:MM 24hr format or null",
            "gate_closing_time": "time in HH:MM 24hr format or null",
            "center_name": "exam center or venue name",
            "center_address": "full address of exam center",
            "center_city": "city name only",
            "roll_number": "roll number or hall ticket number",
            "candidate_name": "name of the student",
            "instructions": "important instructions as single string",
            "raw_text": "all text visible in the image"
        }
        
        Rules:
        - Return ONLY the JSON object
        - No markdown, no backticks, no explanation
        - If a field is not found use null
        - Convert all dates to YYYY-MM-DD format
        - Convert all times to HH:MM 24hr format
        """

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_url,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
            max_tokens=2000,
            temperature=0.1,  # Low temperature for consistent structured output
            response_format={"type": "json_object"},
        )

        raw_text = response.choices[0].message.content.strip()
        logger.info(f"Groq raw response (first 200): {raw_text[:200]}")

        # Clean markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed = json.loads(raw_text)
        logger.info(f"Admit card parsed: {parsed.get('exam_name')}")
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from Groq: {e}")
        raise InternalServerException("AI returned invalid response. Please try again.")

    except Exception as e:
        logger.error(f"Groq parsing failed: {e}")
        raise InternalServerException(f"Failed to parse admit card: {str(e)}")