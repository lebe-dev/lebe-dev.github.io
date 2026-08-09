#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pymorphy3"]
# ///
"""Precompute where podcast glossary terms occur in their transcripts.

The glossary lists terms in the nominative ("Випассана", "Пять препятствий"),
while the transcript inflects them ("випассану", "пяти препятствий"). Matching
those in the browser would mean shipping a Russian morphology engine to every
reader, so we do it here instead: pymorphy3 lemmatises both the terms and the
transcript, the two are matched lemma-by-lemma, and the resulting character
spans are written to a sidecar the Svelte component just slices strings with.

Run via `just glossary` (or `uv run scripts/glossary_terms.py`). The work is
incremental — a transcript whose text and terms are unchanged is skipped before
pymorphy is even imported, which keeps `just dev` instant.

Output: src/data/podcasts/<slug>.<lang>.terms.json
    {"version": N, "sourceHash": "...", "hits": [[segment, from, to, term], ...]}
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

# Bump when the matching algorithm changes: it is part of the source hash, so
# every sidecar is regenerated on the next run.
VERSION = 1

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "src" / "data" / "podcasts"

CYRILLIC = re.compile(r"[Ѐ-ӿ]")
LATIN = re.compile(r"[A-Za-z]")

# Words are matched whole, so "дзен" never lights up inside "дзенский". Hyphens
# and apostrophes stay inside the token ("инсайт-нянов", "О'Фэллон"), and the
# letter class has to be Unicode-wide — transliterations carry diacritics
# ("Ensō", "āchārya-muṣṭi") that an A-Za-z class would cut the word at.
TOKEN_RE = re.compile(r"[^\W_]+(?:[-'’][^\W_]+)*")

# A one-word Cyrillic alias shorter than this is dropped: too likely to collide
# with an ordinary word once lemmatised.
MIN_ALIAS_LEN = 4

QUOTES = "«»\"“”'‘’"


def normalize(word: str) -> str:
    """Lowercase and fold ё → е, the way both sides of a comparison are keyed."""
    return word.lower().replace("ё", "е")


def is_latin(text: str) -> bool:
    return bool(LATIN.search(text)) and not CYRILLIC.search(text)


def split_top_level(text: str, separators: str = "/,") -> list[str]:
    """Split on separators that are outside parentheses.

    "Нирвана / Ниббана (Nirvana / Nibbana)" has a slash on both levels, and only
    the outer one separates two names.
    """
    parts: list[str] = []
    depth = 0
    current = ""
    for char in text:
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        if char in separators and depth == 0:
            parts.append(current)
            current = ""
            continue
        current += char
    parts.append(current)
    return parts


def split_aliases(term: str) -> list[str]:
    """Every spelling of a glossary term worth looking for in the transcript.

    The `term` field packs several things into one string:

        "Дзен (Zen)"                        → "Дзен", "Zen"
        "Нирвикальпа (Nirvikalpa, самадхи)" → "Нирвикальпа", "Nirvikalpa"
        "Сати (пали)"                       → "Сати"
        "Стрим-энтри / Вступление в поток"  → both halves

    Slashes and commas separate equal names, so each part is kept. A
    parenthetical is only kept when it is Latin script — those are unambiguous
    transliterations or English originals. Cyrillic parentheticals are just as
    often a language or domain marker ("пали", "философия сознания") that would
    match unrelated sentences, so they are dropped; add the useful ones by hand
    via `aliases`.
    """
    aliases: list[str] = []
    for part in split_top_level(term):
        part = part.strip()
        if not part:
            continue
        parens = re.findall(r"\(([^)]*)\)", part)
        head = re.sub(r"\([^)]*\)", " ", part).strip().strip(QUOTES).strip()
        if head:
            aliases.append(head)
        for paren in parens:
            for piece in paren.split(","):
                piece = piece.strip().strip(QUOTES).strip()
                if piece and is_latin(piece):
                    aliases.append(piece)
    return aliases


def entry_aliases(entry: dict) -> list[str]:
    """Auto-derived spellings plus the hand-written `aliases`/`ignore` overrides."""
    ignore = {normalize(a) for a in entry.get("ignore", [])}
    aliases = split_aliases(entry["term"]) + list(entry.get("aliases", []))

    out: list[str] = []
    seen: set[str] = set()
    for alias in aliases:
        key = normalize(alias)
        if not key or key in seen or key in ignore:
            continue
        tokens = TOKEN_RE.findall(alias)
        if not tokens:
            continue
        if len(tokens) == 1 and not is_latin(alias) and len(tokens[0]) < MIN_ALIAS_LEN:
            continue
        seen.add(key)
        out.append(alias)
    return out


def source_hash(transcript: dict) -> str:
    """Fingerprint of everything the hits depend on — text, terms, algorithm.

    Definitions are deliberately left out: they are rendered straight from the
    glossary, so editing one must not force a regeneration.
    """
    payload = {
        "version": VERSION,
        "texts": [segment["text"] for segment in transcript["transcript"]],
        "terms": [
            {
                "term": entry["term"],
                "aliases": entry.get("aliases", []),
                "ignore": entry.get("ignore", []),
            }
            for entry in transcript.get("glossary", [])
        ],
    }
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(blob).hexdigest()


class Matcher:
    """Lemma-keyed word matching, backed by pymorphy3."""

    def __init__(self) -> None:
        import pymorphy3

        self.morph = pymorphy3.MorphAnalyzer()
        self._cache: dict[str, frozenset[str]] = {}

    def keys(self, token: str) -> frozenset[str]:
        """Everything a word could be: its own spelling plus every lemma of it.

        Two tokens match when their key sets overlap, which makes the comparison
        symmetric — the term side and the text side go through the same
        function, so "випассана" ∩ {"випассану", "випассана"} hits.
        """
        word = normalize(token)
        cached = self._cache.get(word)
        if cached is not None:
            return cached

        keys = {word}
        # Latin words have no Russian morphology to speak of, and pymorphy would
        # only invent noise for them.
        if CYRILLIC.search(word):
            keys.update(normalize(parse.normal_form) for parse in self.morph.parse(word))

        result = frozenset(keys)
        self._cache[word] = result
        return result


def find_hits(transcript: dict, matcher: Matcher, path: Path) -> tuple[list[list[int]], list[int]]:
    """Character spans of every glossary term occurrence, plus a per-term count."""
    glossary = transcript["glossary"]
    # A term is a sequence of words; each word is the set of keys it may take.
    patterns: list[tuple[int, list[frozenset[str]]]] = []
    for index, entry in enumerate(glossary):
        for alias in entry_aliases(entry):
            patterns.append((index, [matcher.keys(t) for t in TOKEN_RE.findall(alias)]))

    counts = [0] * len(glossary)
    hits: list[list[int]] = []

    for seg_index, segment in enumerate(transcript["transcript"]):
        text = segment["text"]
        if any(ord(ch) > 0xFFFF for ch in text):
            # Offsets are consumed as JS string indices, which are UTF-16 units.
            raise SystemExit(f"{path.name}: segment {seg_index} contains astral characters")

        tokens = [(m.start(), m.end(), matcher.keys(m.group())) for m in TOKEN_RE.finditer(text)]

        found: list[tuple[int, int, int]] = []
        for term_index, pattern in patterns:
            span = len(pattern)
            for i in range(len(tokens) - span + 1):
                if all(pattern[j] & tokens[i + j][2] for j in range(span)):
                    found.append((tokens[i][0], tokens[i + span - 1][1], term_index))

        # Longest match wins where two terms overlap ("Випассана" inside a
        # longer phrase), and nothing is highlighted twice.
        taken_until = -1
        for start, end, term_index in sorted(found, key=lambda h: (h[0], -h[1])):
            if start < taken_until:
                continue
            taken_until = end
            counts[term_index] += 1
            hits.append([seg_index, start, end, term_index])

    return hits, counts


def render_sidecar(source: str, hits: list[list[int]]) -> str:
    """One hit per line — json.dumps would put each of the four numbers on its own."""
    rows = ",\n    ".join(json.dumps(hit) for hit in hits)
    return (
        "{\n"
        '  "_generated": "scripts/glossary_terms.py — do not edit, run `just glossary`",\n'
        f'  "version": {VERSION},\n'
        f'  "sourceHash": "{source}",\n'
        '  "hits": [\n'
        f"    {rows}\n"
        "  ]\n"
        "}\n"
    )


def sidecar_path(path: Path) -> Path:
    return path.with_suffix(".terms.json")


def is_transcript(path: Path) -> bool:
    return not path.name.endswith(".terms.json")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenerate even if unchanged")
    parser.add_argument("--quiet", action="store_true", help="only report problems")
    args = parser.parse_args()

    transcripts = sorted(p for p in DATA_DIR.glob("*.json") if is_transcript(p))
    if not transcripts:
        print(f"No transcripts found in {DATA_DIR}", file=sys.stderr)
        return 1

    stale: list[tuple[Path, dict, str]] = []
    removed = 0

    for path in transcripts:
        transcript = json.loads(path.read_text(encoding="utf-8"))
        sidecar = sidecar_path(path)

        if not transcript.get("glossary"):
            # A glossary can be removed again; don't leave the hits behind.
            if sidecar.exists():
                sidecar.unlink()
                removed += 1
            continue

        wanted = source_hash(transcript)
        if not args.force and sidecar.exists():
            try:
                current = json.loads(sidecar.read_text(encoding="utf-8")).get("sourceHash")
            except json.JSONDecodeError:
                current = None
            if current == wanted:
                continue

        stale.append((path, transcript, wanted))

    if not stale:
        if removed and not args.quiet:
            print(f"✓ Glossary hits up to date ({removed} stale sidecar(s) removed)")
        elif not args.quiet:
            print("✓ Glossary hits up to date")
        return 0

    matcher = Matcher()  # imports pymorphy3 and loads its dictionaries
    missing = 0

    for path, transcript, wanted in stale:
        hits, counts = find_hits(transcript, matcher, path)
        sidecar_path(path).write_text(render_sidecar(wanted, hits), encoding="utf-8")

        print(f"\n{path.name} — {len(hits)} hit(s)")
        for entry, count in zip(transcript["glossary"], counts):
            if count:
                if not args.quiet:
                    print(f"  {count:4d}  {entry['term']}")
            else:
                missing += 1
                print(f"     ·  {entry['term']}  ⚠ not found in the transcript")

    if missing:
        print(
            f"\n⚠ {missing} term(s) never matched. Add spellings via `aliases` in the "
            "glossary entry, or leave them — they still show up in the glossary section."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
