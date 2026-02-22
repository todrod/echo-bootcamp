#!/usr/bin/env python3
import json
import re
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit("Install pypdf first: pip install pypdf")

PDF_CANDIDATES = [
    Path("/mnt/data/pdfcoffee.com-terry-reynolds-500-flash-cards-rcs-study-guide.pdf"),
    Path("/Users/todrod/Downloads/pdfcoffee.com-terry-reynolds-500-flash-cards-rcs-study-guide.pdf"),
]

OUT_PATH = Path("data/questions.raw.json")


def normalize(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def read_pdf() -> str:
    for candidate in PDF_CANDIDATES:
        if candidate.exists():
            reader = PdfReader(str(candidate))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
    raise FileNotFoundError("PDF not found in expected locations")


def split_main_and_answers(text: str):
    marker = re.search(r"\bAnswers\b", text, flags=re.IGNORECASE)
    if not marker:
        raise ValueError("Could not find answer key section marker 'Answers'")
    return text[: marker.start()], text[marker.start() :]


def parse_questions(main: str):
    block_re = re.compile(
        r"(?:^|\n)\s*(\d{1,3})[\).\-:]\s*(.+?)(?=(?:\n\s*\d{1,3}[\).\-:]\s)|\Z)",
        flags=re.DOTALL,
    )
    choice_re = re.compile(r"\b([A-D])[\).:]\s*(.+?)(?=(?:\b[A-D][\).:]\s)|\Z)", flags=re.DOTALL)

    questions = []
    for qid, body in block_re.findall(main):
        qid_int = int(qid)
        if qid_int < 1 or qid_int > 500:
            continue

        choices = {}
        choice_matches = list(choice_re.finditer(body))
        if not choice_matches:
            continue

        stem = body[: choice_matches[0].start()].strip()
        for idx, match in enumerate(choice_matches):
            label = match.group(1)
            text = normalize(match.group(2))
            choices[label] = text

        if set(choices.keys()) == {"A", "B", "C", "D"}:
            questions.append(
                {
                    "id": qid_int,
                    "stem": normalize(stem),
                    "choices": [
                        {"label": "A", "text": choices["A"]},
                        {"label": "B", "text": choices["B"]},
                        {"label": "C", "text": choices["C"]},
                        {"label": "D", "text": choices["D"]},
                    ],
                }
            )

    dedup = {q["id"]: q for q in questions}
    return [dedup[k] for k in sorted(dedup.keys())]


def parse_answers(answer_text: str):
    ans_re = re.compile(r"(\d{1,3})\s*[-:.]?\s*([A-D])", flags=re.IGNORECASE)
    answers = {}
    for qid, label in ans_re.findall(answer_text):
        qid_int = int(qid)
        if 1 <= qid_int <= 500:
            answers[qid_int] = label.upper()
    return answers


def main():
    raw_text = read_pdf()
    main_text, answer_text = split_main_and_answers(raw_text)
    questions = parse_questions(main_text)
    answers = parse_answers(answer_text)

    merged = []
    for q in questions:
        merged.append(
            {
                **q,
                "correctLabel": answers.get(q["id"]),
            }
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(merged, indent=2), encoding="utf-8")

    print(f"Parsed questions: {len(merged)}")
    print(f"Questions with answer key: {sum(1 for q in merged if q.get('correctLabel'))}")
    if len(merged) != 500:
        print("Warning: expected 500 questions; inspect data/questions.raw.json")


if __name__ == "__main__":
    main()
