#!/usr/bin/env python3
import json
import re
from pathlib import Path

from pypdf import PdfReader

PDF_PATH_CANDIDATES = [
    Path("/Users/todrod/Downloads/ARCS Exam.pdf"),
    Path("/Users/todrod/Downloads/ACS V2 Overprepare Question Bank.pdf"),
]
OUT_PATH = Path("data/acs_parsed_debug.json")


def normalize(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("\u007f", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def read_pdf() -> str:
    for p in PDF_PATH_CANDIDATES:
        if p.exists():
            reader = PdfReader(str(p))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
    raise FileNotFoundError(f"ACS PDF not found. Checked: {', '.join(str(p) for p in PDF_PATH_CANDIDATES)}")


def parse_questions(text: str):
    pattern = re.compile(
        r"(?ms)^\s*(\d{1,3})\.\s*ACS2-(\d{4})\s*[—-]\s*(.*?)\n(.*?)(?=^\s*\d{1,3}\.\s*ACS2-\d{4}\s*[—-]|\Z)"
    )

    parsed = []
    for m in pattern.finditer(text):
        index = int(m.group(1))
        code = m.group(2)
        title = normalize(m.group(3))
        body = m.group(4).strip()
        lines = [line.strip() for line in body.splitlines() if line.strip()]

        stem_lines = []
        options = []
        current_label = None
        current_text = []
        correct_labels = []

        def flush_option():
            nonlocal current_label, current_text
            if current_label:
                options.append((current_label, normalize(" ".join(current_text))))
            current_label = None
            current_text = []

        for line in lines:
            opt_match = re.match(r"^([A-E])\.\s*(.*)$", line)
            correct_match = re.match(r"^Correct\s*:\s*(.*)$", line, flags=re.IGNORECASE)

            if opt_match:
                flush_option()
                current_label = opt_match.group(1)
                current_text = [opt_match.group(2)]
                continue

            if correct_match:
                flush_option()
                labels = re.findall(r"[A-E]", correct_match.group(1).upper())
                correct_labels = sorted(set(labels))
                continue

            if current_label:
                current_text.append(line)
            else:
                stem_lines.append(line)

        flush_option()

        if len(options) < 4 or not correct_labels:
            continue

        parsed.append(
            {
                "index": index,
                "code": code,
                "title": title,
                "stem": "\n".join(stem_lines).strip(),
                "opts": options,
                "correct": correct_labels,
                "raw": f"{m.group(1)}. ACS2-{code} — {title}\n{body}",
            }
        )

    return parsed


def main():
    text = read_pdf()
    parsed = parse_questions(text)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    print(f"Parsed ACS questions: {len(parsed)}")


if __name__ == "__main__":
    main()
