from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Union

DEFAULT_INTERVIEWER_LABELS: tuple[str, ...] = (
    "enqueteur",
    "enquetrice",
    "chercheur",
    "chercheuse",
    "intervieweur",
    "intervieweuse",
    "moderateur",
    "moderatrice",
    "doctorant",
    "doctorante",
)

_TIMESTAMP_ARROW_RE = re.compile(
    r"^\s*(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}"
)
_STANDALONE_TIMECODE_RE = re.compile(r"^\s*\[?(?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?\]?\s*$")
_SEQUENCE_INDEX_RE = re.compile(r"^\s*\d+\s*$")
_VTT_HEADER_RE = re.compile(r"^\s*(?:WEBVTT(?:\s.*)?|Kind:\s*.*|Language:\s*.*)\s*$", re.IGNORECASE)
_VTT_BLOCK_START_RE = re.compile(r"^\s*(?:NOTE|STYLE|REGION)(?:\s|$)")
_VOICE_TAG_RE = re.compile(r"<v(?:\.[^>\s]+)*\s+([^>]+)>", re.IGNORECASE)
_INLINE_TIMECODE_TAG_RE = re.compile(r"<(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}>")
_HTML_TAG_RE = re.compile(r"</?[a-zA-Z][^>]*>")
_ASS_TAG_RE = re.compile(r"\{\\[a-zA-Z0-9]+[^}]*\}")
_LEADING_TIMECODE_RE = re.compile(r"^\s*[\[(](?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?[\])]\s*")
_SPEAKER_PREFIX_RE = re.compile(r"^(?:-\s*)?([A-ZÀ-ÖØ-Ý][\wÀ-ÿ.' -]{0,35})\s*:\s+")
_SPEAKER_LINE_RE = re.compile(r"^(?:-\s*)?([^:]{1,45}?)\s*[\u00A0\u202F]*:\s+(.+)$")


@dataclass(frozen=True)
class CleanSubtitlesResult:
    text: str
    lines: List[str]
    word_count: int
    char_count: int
    removed_cue_count: int


def _normalize_for_comparison(value: str) -> str:
    lowered = value.lower()
    lowered = re.sub(r"[\u00A0\u202F]+", " ", lowered)
    lowered = re.sub(r'[.,;!?«»"()\[\]]+', "", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered.strip()


def _strip_rolling_overlap(previous_line: str, next_line: str) -> str:
    if not previous_line or not next_line:
        return next_line

    prev_norm = _normalize_for_comparison(previous_line)
    next_norm = _normalize_for_comparison(next_line)

    if not prev_norm or not next_norm:
        return next_line
    if prev_norm == next_norm:
        return ""

    prev_words_raw = previous_line.strip().split()
    next_words_raw = next_line.strip().split()
    prev_words_norm = [w for w in (_normalize_for_comparison(t) for t in prev_words_raw) if w]
    next_words_norm = [w for w in (_normalize_for_comparison(t) for t in next_words_raw) if w]

    if not prev_words_norm or not next_words_norm:
        return next_line

    if len(next_words_norm) <= len(prev_words_norm):
        if prev_words_norm[-len(next_words_norm) :] == next_words_norm:
            return ""

    max_overlap = min(len(prev_words_norm), len(next_words_norm))
    for k in range(max_overlap, 1, -1):
        if prev_words_norm[-k:] == next_words_norm[:k]:
            consumed = 0
            raw_idx = 0
            while raw_idx < len(next_words_raw) and consumed < k:
                if _normalize_for_comparison(next_words_raw[raw_idx]):
                    consumed += 1
                raw_idx += 1
            return " ".join(next_words_raw[raw_idx:]).strip()

    return next_line


def normalize_french_typography(text: str, nbsp_char: str = "\u00A0") -> str:
    """Insère les espaces insécables françaises avant `: ; ? !` et dans `« … »` sans altérer les URLs ni les heures."""
    if not text:
        return ""

    protected_urls: List[str] = []

    def _protect(match: re.Match[str]) -> str:
        token = f"__URL_TOKEN_{len(protected_urls)}__"
        protected_urls.append(match.group(0))
        return token

    working = re.sub(r"https?://[^\s)»>]+", _protect, str(text), flags=re.IGNORECASE)
    working = re.sub(r"«[\s\u00A0\u202F]*", f"«{nbsp_char}", working)
    working = re.sub(r"[\s\u00A0\u202F]*»", f"{nbsp_char}»", working)

    working = re.sub(r"([^\s\u00A0\u202F!?])[\s\u00A0\u202F]*([;?!])", rf"\1{nbsp_char}\2", working)
    working = re.sub(r"[\s\u00A0\u202F]+([;?!])", rf"{nbsp_char}\1", working)

    working = re.sub(r"([^\s\u00A0\u202F\d])[\s\u00A0\u202F]*:(?!/)", rf"\1{nbsp_char}:", working)
    working = re.sub(r"(\d)[\s\u00A0\u202F]+:(?!\d)", rf"\1{nbsp_char}:", working)
    working = re.sub(r"[ \t]{2,}", " ", working)

    for idx, url in enumerate(protected_urls):
        working = working.replace(f"__URL_TOKEN_{idx}__", url)

    return working


def clean_subtitles(
    raw_input: str,
    *,
    deduplicate_rolling: bool = True,
    merge_sentences: bool = True,
    french_typography: bool = True,
    nbsp_char: str = "\u00A0",
    preserve_speakers: bool = True,
) -> CleanSubtitlesResult:
    """Nettoie un fichier .srt ou .vtt et restitue un texte fluide et dédupliqué."""
    if not raw_input or not isinstance(raw_input, str):
        return CleanSubtitlesResult(text="", lines=[], word_count=0, char_count=0, removed_cue_count=0)

    normalized = raw_input.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    raw_lines = normalized.split("\n")

    extracted_lines: List[str] = []
    in_metadata_block = False
    removed_cue_count = 0

    for idx, line in enumerate(raw_lines):
        if in_metadata_block:
            if line.strip() == "":
                in_metadata_block = False
            continue

        if _VTT_BLOCK_START_RE.match(line):
            in_metadata_block = True
            removed_cue_count += 1
            continue

        if _VTT_HEADER_RE.match(line):
            removed_cue_count += 1
            continue

        if _TIMESTAMP_ARROW_RE.match(line) or _STANDALONE_TIMECODE_RE.match(line):
            removed_cue_count += 1
            continue

        if _SEQUENCE_INDEX_RE.match(line):
            next_line = raw_lines[idx + 1] if idx + 1 < len(raw_lines) else ""
            prev_line = raw_lines[idx - 1] if idx > 0 else ""
            if _TIMESTAMP_ARROW_RE.match(next_line) or prev_line.strip() == "":
                removed_cue_count += 1
                continue

        if line.strip() == "":
            continue

        cleaned = line
        if preserve_speakers:
            cleaned = _VOICE_TAG_RE.sub(lambda m: f"{m.group(1).strip()} : ", cleaned)
        else:
            cleaned = _VOICE_TAG_RE.sub("", cleaned)

        cleaned = _INLINE_TIMECODE_TAG_RE.sub("", cleaned)
        cleaned = _HTML_TAG_RE.sub("", cleaned)
        cleaned = _ASS_TAG_RE.sub("", cleaned)
        cleaned = _LEADING_TIMECODE_RE.sub("", cleaned)
        cleaned = html.unescape(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if cleaned:
            extracted_lines.append(cleaned)

    deduped_lines: List[str] = []
    last_comparable_line = ""
    for line in extracted_lines:
        if not deduplicate_rolling:
            deduped_lines.append(line)
            continue
        stripped = _strip_rolling_overlap(last_comparable_line, line)
        last_comparable_line = line
        if stripped:
            deduped_lines.append(stripped)

    final_lines: List[str] = []
    if merge_sentences and deduped_lines:
        current_paragraph = ""
        segments_in_paragraph = 0

        for segment in deduped_lines:
            starts_new_speaker = preserve_speakers and bool(_SPEAKER_PREFIX_RE.match(segment))
            if not current_paragraph:
                current_paragraph = segment
                segments_in_paragraph = 1
                continue

            if starts_new_speaker:
                final_lines.append(current_paragraph.strip())
                current_paragraph = segment
                segments_in_paragraph = 1
                continue

            ends_sentence = bool(re.search(r"[.!?…»]\s*$", current_paragraph))
            if ends_sentence and segments_in_paragraph >= 6:
                final_lines.append(current_paragraph.strip())
                current_paragraph = segment
                segments_in_paragraph = 1
            else:
                current_paragraph = re.sub(r"\s+", " ", f"{current_paragraph} {segment}")
                segments_in_paragraph += 1

        if current_paragraph.strip():
            final_lines.append(current_paragraph.strip())
    else:
        final_lines = deduped_lines

    if french_typography:
        final_lines = [normalize_french_typography(p, nbsp_char=nbsp_char) for p in final_lines]

    joiner = "\n\n" if merge_sentences else "\n"
    text = joiner.join(final_lines).strip()
    words = text.split() if text else []

    return CleanSubtitlesResult(
        text=text,
        lines=final_lines,
        word_count=len(words),
        char_count=len(text),
        removed_cue_count=removed_cue_count,
    )


def sanitize_iramuteq_modality(raw: str) -> str:
    if not raw:
        return "inconnu"
    decomposed = unicodedata.normalize("NFD", str(raw))
    no_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    cleaned = no_accents.lower().lstrip("*")
    cleaned = re.sub(r"[^a-z0-9_]+", "_", cleaned).strip("_")
    return cleaned or "inconnu"


def to_iramuteq_corpus(
    transcript_text: str,
    *,
    corpus_id: str = "entretien_01",
    variables: Optional[Union[Dict[str, str], Sequence[str]]] = None,
    interviewer_mode: str = "keep",
    interviewer_labels: Iterable[str] = DEFAULT_INTERVIEWER_LABELS,
    split_by_speaker_starred: bool = True,
    clean_input_first: bool = False,
) -> str:
    """Convertit un texte transcrit au format corpus étoilé IRaMuTeQ / Alceste / TXM (UTF-8 sans BOM)."""
    base_text = (
        clean_subtitles(transcript_text, merge_sentences=False).text
        if clean_input_first
        else str(transcript_text or "")
    )

    safe_lines = [
        line.replace("*", "").strip()
        for line in base_text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    safe_lines = [line for line in safe_lines if line]

    base_modalities: List[str] = [f"*{sanitize_iramuteq_modality(corpus_id)}"]
    if isinstance(variables, dict):
        for k, v in variables.items():
            if v is not None and str(v).strip():
                base_modalities.append(
                    f"*{sanitize_iramuteq_modality(k)}_{sanitize_iramuteq_modality(v)}"
                )
    elif variables is not None:
        for item in variables:
            base_modalities.append(f"*{sanitize_iramuteq_modality(item)}")

    interviewer_set = {sanitize_iramuteq_modality(lbl) for lbl in interviewer_labels}

    turns: List[Dict[str, object]] = []
    for line in safe_lines:
        match = _SPEAKER_LINE_RE.match(line)
        if match:
            speaker_slug = sanitize_iramuteq_modality(match.group(1).strip())
            spoken = match.group(2).strip()
            is_interviewer = any(
                speaker_slug == lbl or speaker_slug.startswith(f"{lbl}_")
                for lbl in interviewer_set
            )
            turns.append(
                {"speaker_slug": speaker_slug, "is_interviewer": is_interviewer, "text": spoken}
            )
        elif turns:
            turns[-1]["text"] = f"{turns[-1]['text']} {line}"
        else:
            turns.append({"speaker_slug": None, "is_interviewer": False, "text": line})

    if not turns:
        return f"**** {' '.join(base_modalities)}\n"

    has_speakers = any(t["speaker_slug"] is not None for t in turns)

    if has_speakers and split_by_speaker_starred and interviewer_mode == "keep":
        blocks = []
        for turn in turns:
            slug = turn["speaker_slug"] or "principal"
            header = " ".join([*base_modalities, f"*locuteur_{slug}"])
            blocks.append(f"**** {header}\n{turn['text']}")
        return "\n\n".join(blocks) + "\n"

    output_lines = [f"**** {' '.join(base_modalities)}"]
    for turn in turns:
        if turn["is_interviewer"] and interviewer_mode == "exclude":
            continue
        if has_speakers and turn["speaker_slug"]:
            if turn["is_interviewer"] and interviewer_mode == "tag":
                output_lines.append("-*relance_enqueteur")
            else:
                output_lines.append(f"-*locuteur_{turn['speaker_slug']}")
        output_lines.append(str(turn["text"]))

    return "\n".join(output_lines) + "\n"


def estimate_transcription_time(
    audio_duration_minutes: float,
    *,
    words_per_minute: int = 150,
) -> Dict[str, object]:
    """
    Calcule le temps réaliste de frappe manuelle au casque (4 à 7 h pour 1 h d'audio)
    contre la réécoute intégrale avec pré-transcription IA en 2 passes (2 à 3 h pour 1 h d'audio,
    soit un temps de rédaction divisé par 2), ainsi que le coût de relecture humaine (60 € HT/h).
    """
    minutes = float(audio_duration_minutes)
    if minutes < 0:
        raise ValueError("audio_duration_minutes doit être un nombre positif ou nul.")

    hours = minutes / 60.0
    return {
        "audio_duration_minutes": round(minutes, 1),
        "audio_duration_hours": round(hours, 2),
        "estimated_words": round(minutes * words_per_minute),
        "manual_typing_hours": {
            "min": round(hours * 4, 1),
            "max": round(hours * 7, 1),
            "professional_min": round(hours * 4, 1),
            "professional_max": round(hours * 6, 1),
            "non_professional_min": round(hours * 5, 1),
            "non_professional_max": round(hours * 7, 1),
        },
        "two_pass_ai_proofreading_hours": {
            "min": round(hours * 2, 1),
            "max": round(hours * 3, 1),
        },
        "time_division_factor": 2,
        "productivity_gain_percent": 50,
        "pricing_reference_eur_ht": {
            "ai_two_pass_from_per_hour": 1.5,
            "ai_two_pass_pack_per_hour": 2.5,
            "ai_two_pass_estimate_min": round(hours * 1.5, 2),
            "ai_two_pass_estimate_pack": round(hours * 2.75, 2),
            "human_double_proofreading_per_hour": 60.0,
            "human_double_proofreading_per_minute": 1.0,
            "human_double_proofreading_total": round(minutes * 1.0, 2),
        },
    }
