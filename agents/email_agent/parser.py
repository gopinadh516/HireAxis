"""
Extracts plain text from email body + Excel/CSV attachments.
Returns a single combined string ready to be sent to the AI.
"""
import io
import logging
from imap_tools import MailMessage

log = logging.getLogger(__name__)


def extract_text(msg: MailMessage) -> str:
    parts = []

    # 1. Email subject
    if msg.subject:
        parts.append(f"Subject: {msg.subject}")

    # 2. Plain text body (preferred)
    if msg.text:
        parts.append(msg.text.strip())
    elif msg.html:
        # Strip basic HTML tags if no plain text
        import re
        clean = re.sub(r"<[^>]+>", " ", msg.html)
        clean = re.sub(r"\s+", " ", clean).strip()
        parts.append(clean)

    # 3. Attachments
    for att in msg.attachments:
        name = att.filename.lower() if att.filename else ""
        try:
            if name.endswith((".xlsx", ".xls")):
                parts.append(_parse_excel(att.payload, name))
            elif name.endswith(".csv"):
                parts.append(_parse_csv(att.payload))
        except Exception as e:
            log.warning(f"Could not parse attachment {name}: {e}")

    return "\n\n".join(parts)


def _parse_excel(data: bytes, filename: str) -> str:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    rows = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            line = "\t".join(str(c) if c is not None else "" for c in row)
            if line.strip():
                rows.append(line)
    return f"[Excel: {filename}]\n" + "\n".join(rows)


def _parse_csv(data: bytes) -> str:
    import csv
    text = data.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    rows = ["\t".join(row) for row in reader if any(row)]
    return "[CSV attachment]\n" + "\n".join(rows)


def is_job_requirement(subject: str, keywords: list[str]) -> bool:
    subject_lower = subject.lower()
    return any(kw in subject_lower for kw in keywords)
