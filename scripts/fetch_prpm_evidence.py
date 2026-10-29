"""Fetch verification evidence for candidate additional peribahasa from PRPM (Dewan Bahasa dan Pustaka).

For each candidate we query PRPM's public search page for one headword and keep only
short text snippets around the saying's distinctive fragment. Nothing else from the
page is stored, so we keep a citation, not a copy of the database.

Usage:  python3 scripts/fetch_prpm_evidence.py
Output: data/sources/prpm/evidence.json
"""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "sources" / "prpm" / "evidence.json"

# (headword to search, distinctive fragment that must appear in the prb sense)
CANDIDATES = [
    ("daya", r"seribu daya"),
    ("kaduk", r"kaduk naik junjung"),
    ("kenal", r"tak kenal maka tak cinta|tidak kenal maka tidak cinta"),
    ("pungguk", r"pungguk rindukan bulan|pungguk merindukan bulan"),
    ("tempayan", r"mulut tempayan"),
    ("menyelam", r"menyelam sambil minum air|menyelam minum air"),
    ("nila", r"nila setitik"),
    ("tepung", r"rambut dalam tepung"),
    ("rotan", r"tiada rotan|tak ada rotan"),
    ("melukut", r"melukut di tepi gantang"),
    ("bertepuk", r"bertepuk sebelah tangan"),
    ("tupai", r"pandai-pandai tupai"),
    ("sesal", r"sesal dahulu"),
    ("paha", r"cubit paha"),
    ("muafakat", r"muafakat membawa berkat"),
    ("kencing", r"guru kencing berdiri"),
    ("payung", r"payung sebelum hujan"),
    ("bukit", r"lama-lama jadi bukit|lama-lama menjadi bukit"),
    ("tunggul", r"abu di atas tunggul"),
    ("induk", r"ayam kehilangan induk"),
    ("aur", r"aur dengan tebing"),
    ("kerbau", r"kerbau dicucuk hidung"),
    ("padi", r"resmi padi|ilmu padi"),
    ("enau", r"enau dalam belukar"),
    ("guru", r"Peribahasa [^.]{0,80}guru[^.]{0,80}\."),
    ("sepandai-pandai", r"tupai melompat"),
    ("sambil", r"sambil menyelam"),
]


def page_text(headword: str) -> tuple[str, str]:
    url = "https://prpm.dbp.gov.my/Cari1?keyword=" + urllib.parse.quote(headword)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (LESTARI data verification)"})
    with urllib.request.urlopen(req, timeout=60) as res:
        raw = res.read().decode("utf-8", errors="ignore")
    raw = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return url, re.sub(r"\s+", " ", text)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    evidence = json.loads(OUT.read_text()) if OUT.exists() else {}
    for headword, fragment in CANDIDATES:
        if headword in evidence and evidence[headword].get("snippets"):
            continue
        try:
            url, text = page_text(headword)
        except Exception as exc:  # network errors are recorded, not fatal
            evidence[headword] = {"url": None, "error": str(exc), "snippets": []}
            print(f"{headword}: ERROR {exc}", file=sys.stderr)
            continue
        snippets = []
        for m in re.finditer(fragment, text, flags=re.I):
            snippets.append(text[max(0, m.start() - 160): m.end() + 260].strip())
            if len(snippets) == 3:
                break
        evidence[headword] = {
            "url": url,
            "fragment": fragment,
            "snippets": snippets,
            "retrieved": time.strftime("%Y-%m-%d"),
        }
        print(f"{headword}: {len(snippets)} snippet(s)")
        OUT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2))
        time.sleep(1.5)  # be polite to the public server
    OUT.write_text(json.dumps(evidence, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
