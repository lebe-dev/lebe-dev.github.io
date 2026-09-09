#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pymorphy3", "pyyaml"]
# ///
"""Precompute where glossary terms occur in a transcript or a book chapter.

The glossary lists terms in the nominative ("Випассана", "Пять препятствий"),
while the transcript inflects them ("випассану", "пяти препятствий"). Matching
those in the browser would mean shipping a Russian morphology engine to every
reader, so we do it here instead: pymorphy3 lemmatises both the terms and the
transcript, the two are matched lemma-by-lemma, and the resulting character
spans are written to a sidecar the Svelte component just slices strings with.

Run via `just glossary` (or `uv run scripts/glossary_terms.py`). The work is
incremental — a transcript whose text and terms are unchanged is skipped before
pymorphy is even imported, which keeps `just dev` instant.

Two kinds of source, one algorithm:

    src/data/podcasts/<slug>.<lang>.json   segments of a transcript
    src/content/books/<book>/<key>.md      blocks of a translated chapter

Output: the same name with .terms.json instead of the extension —
    {"version": N, "sourceHash": "...", "hits": [[block, from, to, term], ...]}
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

# Bump when the matching algorithm changes: it is part of the source hash, so
# every sidecar is regenerated on the next run.
VERSION = 1

ROOT = Path(__file__).resolve().parent.parent
PODCAST_DIR = ROOT / "src" / "data" / "podcasts"
BOOK_DIR = ROOT / "src" / "content" / "books"

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


@dataclass
class Document:
    """One text with a glossary: a transcript, or a translated book chapter."""

    path: Path
    label: str
    texts: list[str]
    glossary: list[dict]
    # Per text, spans no hit may touch. Empty for a transcript; for a chapter,
    # the *emphasis* runs — see load_chapter.
    masks: list[list[tuple[int, int]]]

    @property
    def sidecar(self) -> Path:
        return self.path.with_suffix(".terms.json")


def source_hash(doc: Document) -> str:
    """Fingerprint of everything the hits depend on — text, terms, algorithm.

    Definitions are deliberately left out: they are rendered straight from the
    glossary, so editing one must not force a regeneration.
    """
    payload = {
        "version": VERSION,
        "texts": doc.texts,
        "terms": [
            {
                "term": entry["term"],
                "aliases": entry.get("aliases", []),
                "ignore": entry.get("ignore", []),
            }
            for entry in doc.glossary
        ],
    }
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(blob).hexdigest()


# ---------------------------------------------------------------- loading ---

def load_transcript(path: Path) -> Document | None:
    """A podcast transcript: one text per spoken segment, no masked spans."""
    data = json.loads(path.read_text(encoding="utf-8"))
    glossary = data.get("glossary") or []
    texts = [segment["text"] for segment in data["transcript"]]
    return Document(path, path.name, texts, glossary, [[] for _ in texts])


# The chapter body uses a fixed subset of Markdown, parsed the same way here and
# in src/lib/bookBlocks.ts. Change one side and you must change the other.
FRONTMATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n", re.S)
BLOCK_SPLIT_RE = re.compile(r"\r?\n[ \t]*\r?\n")
EMPHASIS_RE = re.compile(r"\*([^*\n]+)\*")


def chapter_blocks(body: str) -> list[str]:
    """The chapter's blocks, markers stripped and wrapped lines joined."""
    out: list[str] = []
    for chunk in BLOCK_SPLIT_RE.split(body):
        lines = [line.strip() for line in chunk.splitlines()]
        lines = [line for line in lines if line]
        if not lines:
            continue
        joined = " ".join(lines)
        if lines[0].startswith("## "):
            out.append(joined[3:].strip())
        elif lines[0].startswith(">"):
            out.append(" ".join(re.sub(r"^>\s?", "", line) for line in lines).strip())
        else:
            out.append(joined)
    return out


def load_chapter(path: Path) -> Document | None:
    """A translated book chapter: one text per block, emphasis runs masked.

    A term inside *emphasis* is left alone on purpose. The renderer slices the
    block at the hit offsets and only then looks for the asterisks, so a hit
    that crossed one would strand an unclosed marker mid-paragraph. Refusing
    those hits is what lets both sides stay this simple.
    """
    import yaml

    raw = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(raw)
    if not match:
        print(f"{path}: no frontmatter", file=sys.stderr)
        return None

    front = yaml.safe_load(match.group(1)) or {}
    body = raw[match.end():]
    texts = chapter_blocks(body)
    masks = [[(m.start(), m.end()) for m in EMPHASIS_RE.finditer(text)] for text in texts]
    label = f"{path.parent.name}/{path.name}"
    return Document(path, label, texts, front.get("glossary") or [], masks)


def documents() -> list[Document]:
    """Every source with a glossary to compute, transcripts first."""
    found: list[Document] = []
    for path in sorted(PODCAST_DIR.glob("*.json")):
        if path.name.endswith(".terms.json"):
            continue
        doc = load_transcript(path)
        if doc:
            found.append(doc)
    for path in sorted(BOOK_DIR.glob("*/*.md")):
        doc = load_chapter(path)
        if doc:
            found.append(doc)
    return found


# --------------------------------------------------------------- matching ---

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


def find_hits(doc: Document, matcher: Matcher) -> tuple[list[list[int]], list[int]]:
    """Character spans of every glossary term occurrence, plus a per-term count."""
    # A term is a sequence of words; each word is the set of keys it may take.
    patterns: list[tuple[int, list[frozenset[str]]]] = []
    for index, entry in enumerate(doc.glossary):
        for alias in entry_aliases(entry):
            patterns.append((index, [matcher.keys(t) for t in TOKEN_RE.findall(alias)]))

    counts = [0] * len(doc.glossary)
    hits: list[list[int]] = []

    for seg_index, text in enumerate(doc.texts):
        if any(ord(ch) > 0xFFFF for ch in text):
            # Offsets are consumed as JS string indices, which are UTF-16 units.
            raise SystemExit(f"{doc.label}: block {seg_index} contains astral characters")

        masked = doc.masks[seg_index]
        tokens = [(m.start(), m.end(), matcher.keys(m.group())) for m in TOKEN_RE.finditer(text)]

        found: list[tuple[int, int, int]] = []
        for term_index, pattern in patterns:
            span = len(pattern)
            for i in range(len(tokens) - span + 1):
                if all(pattern[j] & tokens[i + j][2] for j in range(span)):
                    start, end = tokens[i][0], tokens[i + span - 1][1]
                    if any(start < stop and begin < end for begin, stop in masked):
                        continue
                    found.append((start, end, term_index))

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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenerate even if unchanged")
    parser.add_argument("--quiet", action="store_true", help="only report problems")
    args = parser.parse_args()

    docs = documents()
    if not docs:
        print(f"No sources found in {PODCAST_DIR} or {BOOK_DIR}", file=sys.stderr)
        return 1

    stale: list[tuple[Document, str]] = []
    removed = 0

    for doc in docs:
        if not doc.glossary:
            # A glossary can be removed again; don't leave the hits behind.
            if doc.sidecar.exists():
                doc.sidecar.unlink()
                removed += 1
            continue

        wanted = source_hash(doc)
        if not args.force and doc.sidecar.exists():
            try:
                current = json.loads(doc.sidecar.read_text(encoding="utf-8")).get("sourceHash")
            except json.JSONDecodeError:
                current = None
            if current == wanted:
                continue

        stale.append((doc, wanted))

    if not stale:
        if removed and not args.quiet:
            print(f"✓ Glossary hits up to date ({removed} stale sidecar(s) removed)")
        elif not args.quiet:
            print("✓ Glossary hits up to date")
        return 0

    matcher = Matcher()  # imports pymorphy3 and loads its dictionaries
    missing = 0

    for doc, wanted in stale:
        hits, counts = find_hits(doc, matcher)
        doc.sidecar.write_text(render_sidecar(wanted, hits), encoding="utf-8")

        print(f"\n{doc.label} — {len(hits)} hit(s)")
        for entry, count in zip(doc.glossary, counts):
            if count:
                if not args.quiet:
                    print(f"  {count:4d}  {entry['term']}")
            else:
                missing += 1
                print(f"     ·  {entry['term']}  ⚠ not found in the text")

    if missing:
        print(
            f"\n⚠ {missing} term(s) never matched. Add spellings via `aliases` in the "
            "glossary entry, or leave them — they still show up in the glossary section."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
