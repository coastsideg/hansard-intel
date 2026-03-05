"""
WA Hansard PDF Parser
Extracts individual contributions from daily Hansard PDFs.
Speaker format: SURNAME (Electorate) or Mr/Ms/Dr SURNAME (Electorate)
"""
import re
import uuid
from datetime import date
from pathlib import Path
from typing import Optional
import pdfplumber
from loguru import logger

# Speaker identification patterns
SPEAKER_PATTERNS = [
    # Full pattern: "Mr SMITH (Whitford)" or "Ms JONES (Swan Hills)"
    re.compile(r'^(Mr|Ms|Mrs|Dr|Hon|The\s+(?:Acting\s+)?(?:Speaker|President|Chair(?:man)?|Deputy\s+\w+))\s+([A-Z][A-Z\s\-\']+?)\s+\(([^)]+)\)\s*[:.]?\s*(.*)$', re.DOTALL),
    # Just surname in caps: "SMITH (Whitford):"
    re.compile(r'^([A-Z][A-Z\s\-\']{2,})\s+\(([^)]+)\)\s*[:.]?\s*(.*)$', re.DOTALL),
    # Procedural speakers
    re.compile(r'^(The\s+(?:Acting\s+)?(?:SPEAKER|PRESIDENT|CHAIRMAN|DEPUTY\s+\w+))\s*[:.]?\s*(.*)$', re.DOTALL),
]

# Contribution type markers
CONTRIBUTION_TYPES = {
    "QUESTIONS WITHOUT NOTICE": "Question Without Notice",
    "QUESTION WITHOUT NOTICE": "Question Without Notice",
    "SUPPLEMENTARY QUESTION": "Supplementary Question",
    "MEMBERS' STATEMENTS": "Members Statement",
    "MEMBER'S STATEMENT": "Members Statement",
    "GRIEVANCES": "Grievance",
    "GRIEVANCE": "Grievance",
    "SECOND READING": "Second Reading",
    "THIRD READING": "Third Reading",
    "COMMITTEE OF THE WHOLE": "Committee",
    "PRIVATE MEMBERS' BUSINESS": "Private Members Motion",
    "PRIVATE MEMBER'S BUSINESS": "Private Members Motion",
    "ADJOURNMENT": "Adjournment Debate",
    "MINISTERIAL STATEMENT": "Ministerial Statement",
    "POINT OF ORDER": "Point of Order",
    "APPROPRIATION": "Appropriation",
    "BUDGET ESTIMATES": "Budget Estimates",
}

# Government minister titles (to flag as government speakers)
MINISTER_TITLES = [
    "Premier", "Deputy Premier", "Minister", "Attorney General",
    "Treasurer", "Leader of the House", "Government Leader"
]

PROCEDURAL_SPEAKERS = {"THE SPEAKER", "THE PRESIDENT", "THE CHAIR", "THE CHAIRMAN", "THE ACTING SPEAKER", "THE ACTING PRESIDENT"}


def extract_text_from_pdf(pdf_path: str) -> list[str]:
    """Extract all text from PDF, returning list of page texts."""
    pages = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text(layout=True)
                if text:
                    pages.append(text)
    except Exception as e:
        logger.error(f"PDF extraction failed {pdf_path}: {e}")
    return pages


def parse_contributions_from_text(full_text: str, parliament_date: date, chamber: str) -> list[dict]:
    """
    Parse the full Hansard text into individual contributions.
    Returns list of contribution dicts ready for DB insertion.
    """
    contributions = []
    lines = full_text.split('\n')

    current_contribution = None
    current_type = "General"
    current_debate_title = None
    current_debate_id = str(uuid.uuid4())
    sequence = 0

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line or len(line) < 2:
            i += 1
            continue

        # Check for section headers (debate titles)
        upper_line = line.upper()
        new_type = None
        for marker, contrib_type in CONTRIBUTION_TYPES.items():
            if upper_line.startswith(marker):
                new_type = contrib_type
                current_debate_title = line
                current_debate_id = str(uuid.uuid4())
                sequence = 0
                break

        if new_type:
            current_type = new_type
            i += 1
            continue

        # Check if this line starts a new speaker contribution
        speaker_info = try_parse_speaker(line)
        if speaker_info:
            # Save previous contribution
            if current_contribution and len(current_contribution["raw_text"].strip()) > 50:
                contributions.append(current_contribution)

            sequence += 1
            remaining_text = speaker_info.get("remaining_text", "")

            # Collect continuation lines
            text_lines = [remaining_text] if remaining_text else []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                # Stop if next speaker starts
                if next_line and try_parse_speaker(next_line):
                    break
                # Stop if new section header
                if any(next_line.upper().startswith(m) for m in CONTRIBUTION_TYPES):
                    break
                text_lines.append(next_line)
                j += 1

            full_contribution_text = " ".join(t for t in text_lines if t).strip()

            current_contribution = {
                "speaker_name": speaker_info.get("full_name", "Unknown"),
                "speaker_electorate": speaker_info.get("electorate"),
                "is_procedural": speaker_info.get("is_procedural", False),
                "parliament_date": parliament_date,
                "chamber": chamber,
                "contribution_type": current_type,
                "debate_title": current_debate_title,
                "debate_id": current_debate_id,
                "sequence_in_debate": sequence,
                "raw_text": full_contribution_text,
                "word_count": len(full_contribution_text.split()),
            }
            i = j
        else:
            # Continuation of current contribution
            if current_contribution:
                current_contribution["raw_text"] += " " + line
                current_contribution["word_count"] = len(current_contribution["raw_text"].split())
            i += 1

    # Don't forget the last one
    if current_contribution and len(current_contribution["raw_text"].strip()) > 50:
        contributions.append(current_contribution)

    logger.info(f"Parsed {len(contributions)} contributions from {parliament_date} {chamber}")
    return contributions


def try_parse_speaker(line: str) -> Optional[dict]:
    """
    Try to identify a speaker line. Returns dict with speaker info or None.
    """
    # Check procedural speakers
    upper = line.upper().strip()
    for proc in PROCEDURAL_SPEAKERS:
        if upper.startswith(proc):
            return {"full_name": upper.split(":")[0].strip(), "is_procedural": True, "remaining_text": ""}

    # Try patterns
    for pattern in SPEAKER_PATTERNS[:2]:
        m = pattern.match(line)
        if m:
            groups = m.groups()
            if len(groups) == 4:
                title, surname, electorate, remaining = groups
                return {
                    "full_name": f"{title} {surname}".strip(),
                    "electorate": electorate.strip(),
                    "is_procedural": False,
                    "remaining_text": remaining.strip(),
                }
            elif len(groups) == 3:
                surname, electorate, remaining = groups
                return {
                    "full_name": surname.strip(),
                    "electorate": electorate.strip(),
                    "is_procedural": False,
                    "remaining_text": remaining.strip(),
                }
    return None


def parse_hansard_pdf(pdf_path: str, parliament_date: date, chamber: str) -> list[dict]:
    """Main entry point: parse a Hansard PDF into contributions."""
    pages = extract_text_from_pdf(pdf_path)
    if not pages:
        logger.error(f"No text extracted from {pdf_path}")
        return []

    full_text = "\n".join(pages)
    contributions = parse_contributions_from_text(full_text, parliament_date, chamber)

    # Filter out very short/procedural contributions
    meaningful = [c for c in contributions if c["word_count"] >= 10 and not c.get("is_procedural", False)]
    logger.info(f"After filtering: {len(meaningful)} meaningful contributions")
    return meaningful
