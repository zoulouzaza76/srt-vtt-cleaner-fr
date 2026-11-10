"""
srt_vtt_cleaner_fr — Micro-librairie Python (zéro dépendance externe)
Nettoyage de sous-titres .SRT / .VTT francophones, déduplication YouTube,
normalisation typographique française, conversion IRaMuTeQ (**** *locuteur_X)
et estimation réaliste du temps de retranscription / relecture.

Licence MIT — (c) 2026 LE SCRIBE AUDIO (https://lescribeaudio.com)
"""

from .cleaner import (
    CleanSubtitlesResult,
    clean_subtitles,
    estimate_transcription_time,
    normalize_french_typography,
    sanitize_iramuteq_modality,
    to_iramuteq_corpus,
)

__all__ = [
    "CleanSubtitlesResult",
    "clean_subtitles",
    "estimate_transcription_time",
    "normalize_french_typography",
    "sanitize_iramuteq_modality",
    "to_iramuteq_corpus",
]

__version__ = "1.0.0"
