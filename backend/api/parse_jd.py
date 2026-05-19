"""
POST /api/jobs/parse-jd
Accepts a PDF/Word file upload OR raw text, extracts structured job data
using NVIDIA Llama 3.3-70B, returns pre-filled form fields.
"""
import os
import io
import json
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from openai import OpenAI
import pymupdf                # fitz — PDF extraction
import mammoth                # Word extraction

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_nvidia = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY", ""),
)

SYSTEM_PROMPT = """You are an expert recruitment data extractor for a staffing company.

Given a job description (JD), extract structured data and return a JSON object with these exact fields:

{
  "title": "Job title",
  "job_type": "FULL_TIME | PART_TIME | CONTRACT | CONTRACT_TO_HIRE | TEMPORARY | INTERNSHIP | W2",
  "work_mode": "ONSITE | REMOTE | HYBRID",
  "company": "Hiring company name (for permanent roles)",
  "end_client_name": "End client name (for contract roles)",
  "location": "City, State or Remote",
  "experience_min": 2,
  "experience_max": 5,
  "openings": 1,
  "currency": "USD | INR | GBP | EUR | CAD | AUD | SGD",
  "salary_min": null,
  "salary_max": null,
  "pay_rate_min": null,
  "pay_rate_max": null,
  "bill_rate_min": null,
  "bill_rate_max": null,
  "description": "Write a structured, agent-ready job summary (up to 800 words). This summary will be fed directly to an AI candidate search agent, so NOTHING must be omitted. Include ALL of the following without skipping any point: (1) Role title and overview, (2) Every single responsibility listed — do not merge or drop any, (3) Every required skill, technology, tool, framework, and platform mentioned, (4) Every preferred/nice-to-have skill, (5) Years of experience required, (6) Education or certification requirements (e.g. PEGA LSA mandatory), (7) Industry domain context (e.g. banking, healthcare), (8) Work style (Agile/Scrum, team size, offshore collaboration if mentioned), (9) Location and work mode, (10) Contract type and rate if mentioned. Use structured sections with clear headings. Do not paraphrase in a way that loses specific technology names or version details.",
  "required_skills": ["skill1", "skill2"],
  "nice_to_have": ["skill3", "skill4"],
  "visa_requirements": ["USC", "GC", "H1B"],
  "vendor_name": "Company/agency that sent the job (from domain of sender email or explicit company mention)",
  "vendor_contact": "Full name of the person who sent or signed the JD (e.g. from Thanks/Regards section)",
  "vendor_email": "Email address of the sender/contact person",
  "vendor_phone": null,
  "submitted_by_name": "Same as vendor_contact — the person who submitted this job",
  "submitted_by_email": "Same as vendor_email",
  "submitted_by_phone": null
}

Rules:
- job_type: use CONTRACT/CONTRACT_TO_HIRE/W2 for contract/staffing roles, FULL_TIME for permanent
- work_mode: infer from keywords (remote/onsite/hybrid/work from home)
- experience values are in YEARS (integers)
- salary/rate values are numbers only (no currency symbols or text like /hr)
- RATE MAPPING (critical):
  * C2C / Corp-to-Corp / C2C rate → bill_rate_min (and bill_rate_max if same value)
  * W2 / W-2 / on W2 rate → pay_rate_min (and pay_rate_max if same value)
  * 1099 / independent contractor rate → bill_rate_min
  * If only one rate is mentioned with no W2/C2C qualifier on a contract role → bill_rate_min
  * Annual salary (full-time roles) → salary_min / salary_max
  * Example: "Rate- $66/hr ON C2C" → bill_rate_min: 66, bill_rate_max: 66
- required_skills: mandatory technologies/tools from the JD
- nice_to_have: "good to have" / "preferred" skills from the JD
- visa_requirements: list only visa types explicitly named in the JD (e.g. H1B, EAD, OPT, L1, TN). Ignore generic phrases like "all visa workable" — return an empty array for those.
- vendor_name: extract from the sender's email domain (e.g. sunita@scalable-systems.com → "Scalable Systems") or any explicit company name at the bottom
- vendor_contact / submitted_by_name: look for a name in the closing lines (Thanks, Regards, Best regards sections)
- vendor_email / submitted_by_email: look for email addresses in the closing/signature lines
- If a field is not mentioned, use null
- Return only valid JSON, no markdown, no explanation
"""


def _extract_text_from_file(content: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        doc = pymupdf.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    if ext in ("doc", "docx"):
        result = mammoth.extract_raw_text(io.BytesIO(content))
        return result.value
    raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")


def _call_llm(jd_text: str) -> dict:
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is empty")
    if len(jd_text) > 50_000:
        jd_text = jd_text[:50_000]

    response = _nvidia.chat.completions.create(
        model="meta/llama-3.3-70b-instruct",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Extract job data from this JD:\n\n{jd_text}"},
        ],
        temperature=0.1,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        log.error(f"LLM returned invalid JSON: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=500, detail="AI returned malformed response — try again")


@router.post("/parse-jd")
async def parse_jd(
    file: UploadFile | None = File(default=None),
    text: str = Form(default=""),
):
    """
    Parse a job description from an uploaded file (PDF/Word) or pasted text.
    Returns pre-filled form fields for the job creation form.
    """
    if file and file.filename:
        content = await file.read()
        jd_text = _extract_text_from_file(content, file.filename)
    elif text.strip():
        jd_text = text.strip()
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or text")

    data = _call_llm(jd_text)

    # Normalise and coerce types
    def _str(v) -> str:
        return str(v) if v is not None else ""

    def _num(v) -> str:
        try:
            return str(int(float(v))) if v is not None else ""
        except (ValueError, TypeError):
            return ""

    VALID_JOB_TYPES = {"FULL_TIME","PART_TIME","CONTRACT","CONTRACT_TO_HIRE","TEMPORARY","INTERNSHIP","W2"}
    VALID_WORK_MODES = {"ONSITE","REMOTE","HYBRID"}

    # Resolve single compensation value from min/max pair
    def _rate(mn, mx) -> str:
        a, b = _num(mn), _num(mx)
        return a or b  # prefer min; fall back to max

    return {
        "title":               _str(data.get("title")),
        "job_type":            data.get("job_type", "FULL_TIME") if data.get("job_type") in VALID_JOB_TYPES else "FULL_TIME",
        "work_mode":           data.get("work_mode", "ONSITE")   if data.get("work_mode") in VALID_WORK_MODES else "ONSITE",
        "company":             _str(data.get("company")),
        "end_client_name":     _str(data.get("end_client_name")),
        "location":            _str(data.get("location")),
        "experience_min":      _num(data.get("experience_min")),
        "openings":            _num(data.get("openings")) or "1",
        "currency":            _str(data.get("currency")) or "USD",
        "salary":              _rate(data.get("salary_min"), data.get("salary_max")),
        "pay_rate":            _rate(data.get("pay_rate_min"), data.get("pay_rate_max")),
        "bill_rate":           _rate(data.get("bill_rate_min"), data.get("bill_rate_max")),
        "description":         _str(data.get("description")),
        "required_skills":     [s for s in (data.get("required_skills") or []) if isinstance(s, str)],
        "nice_to_have":        [s for s in (data.get("nice_to_have")    or []) if isinstance(s, str)],
        "visa_requirements":   [s for s in (data.get("visa_requirements") or []) if isinstance(s, str)],
        "vendor_name":         _str(data.get("vendor_name")),
        "vendor_contact":      _str(data.get("vendor_contact")),
        "vendor_email":        _str(data.get("vendor_email")),
        "vendor_phone":        _str(data.get("vendor_phone")),
        "submitter_name":      _str(data.get("submitted_by_name")),
        "submitter_email":     _str(data.get("submitted_by_email")),
        "submitter_phone":     _str(data.get("submitted_by_phone")),
    }
