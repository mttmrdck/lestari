"""Stage 1 of the data pipeline: turn the supplied source documents into plain-text snapshots.

DOCX files are read with the standard library only. The PDF needs `pypdf`
(`pip install pypdf`); without it the PDF snapshot is left as it is.

Usage:  python3 scripts/extract_sources.py
Output: data/sources/raw/<source-id>.txt   (tab-separated "peribahasa<TAB>maksud" rows
        for tabular sources, plain lines otherwise)
"""
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ORIGINAL = ROOT / "data" / "sources" / "original"
RAW = ROOT / "data" / "sources" / "raw"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SOURCES = {
    "kompilasi-320": "320 peribahasa.docx",
    "senarai-spm": "Senarai_Peribahasa_SPM.docx",
    "senarai-t1-t3": "pdf-senarai-peribahasa.docx",
    "seratus-peribahasa": "pdf-100-peribahasa-melayu-dan-maknanya.docx",
    "kamus-peribahasa-pdf": "Senarai Peribahasa – Kamus Peribahasa Melayu dan Maksud.pdf",
}


def paragraph_text(p) -> str:
    return "".join(t.text or "" for t in p.iter(W + "t"))


def docx_lines(path: Path) -> list[str]:
    body = ET.fromstring(zipfile.ZipFile(path).read("word/document.xml")).find(W + "body")
    lines: list[str] = []
    for el in body:
        if el.tag == W + "p":
            lines.append(paragraph_text(el))
        elif el.tag == W + "tbl":
            for tr in el.iter(W + "tr"):
                cells = [" ".join(paragraph_text(p) for p in tc.iter(W + "p")).strip() for tc in tr.iter(W + "tc")]
                lines.append("\t".join(cells))
    return lines


def pdf_lines(path: Path) -> list[str] | None:
    try:
        import pypdf  # type: ignore
    except ImportError:
        return None
    reader = pypdf.PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages).splitlines()


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for source_id, filename in SOURCES.items():
        path = ORIGINAL / filename
        if not path.exists():
            print(f"MISSING {filename}", file=sys.stderr)
            continue
        lines = pdf_lines(path) if path.suffix == ".pdf" else docx_lines(path)
        if lines is None:
            print(f"SKIP {filename}: install pypdf to re-extract the PDF", file=sys.stderr)
            continue
        (RAW / f"{source_id}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{source_id}: {len(lines)} lines")


if __name__ == "__main__":
    main()
