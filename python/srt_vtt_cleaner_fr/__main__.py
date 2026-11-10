from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .cleaner import clean_subtitles, estimate_transcription_time, to_iramuteq_corpus


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="srt-vtt-cleaner-fr",
        description="Nettoyeur .SRT/.VTT francophone, export corpus IRaMuTeQ et estimateur de temps.",
    )
    parser.add_argument("input", nargs="?", help="Chemin du fichier .srt ou .vtt")
    parser.add_argument("-o", "--output", help="Fichier de sortie UTF-8 sans BOM")
    parser.add_argument("--iramuteq", action="store_true", help="Formater en corpus étoilé IRaMuTeQ")
    parser.add_argument("--id", default="entretien_01", help="Identifiant d'entretien IRaMuTeQ")
    parser.add_argument(
        "--exclude-interviewer",
        action="store_true",
        help="Exclure les relances de l'enquêteur",
    )
    parser.add_argument("--no-merge", action="store_true", help="Ne pas fusionner les lignes")
    parser.add_argument("--no-french-typo", action="store_true", help="Désactiver les insécables")
    parser.add_argument("--estimate", type=float, help="Estimer le temps pour N minutes d'audio")

    args = parser.parse_args(argv)

    if args.estimate is not None:
        print(json.dumps(estimate_transcription_time(args.estimate), indent=2, ensure_ascii=False))
        return 0

    if not args.input:
        parser.print_help()
        return 1

    raw = Path(args.input).read_text(encoding="utf-8")
    cleaned = clean_subtitles(
        raw,
        merge_sentences=False if args.iramuteq else not args.no_merge,
        french_typography=not args.no_french_typo,
    )

    output_text = (
        to_iramuteq_corpus(
            cleaned.text,
            corpus_id=args.id,
            interviewer_mode="exclude" if args.exclude_interviewer else "keep",
            split_by_speaker_starred=not args.exclude_interviewer,
        )
        if args.iramuteq
        else f"{cleaned.text}\n"
    )

    if args.output:
        Path(args.output).write_text(output_text, encoding="utf-8")
    else:
        sys.stdout.write(output_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
