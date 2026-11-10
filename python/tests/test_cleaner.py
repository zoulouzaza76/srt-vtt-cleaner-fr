import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from srt_vtt_cleaner_fr import (  # noqa: E402
    clean_subtitles,
    estimate_transcription_time,
    normalize_french_typography,
    to_iramuteq_corpus,
)


class TestSrtVttCleanerFr(unittest.TestCase):
    def test_youtube_rolling_vtt_deduplication(self) -> None:
        vtt = """WEBVTT
Kind: captions
Language: fr

00:00:01.000 --> 00:00:03.200 align:start position:0%
Bonjour<00:00:01.500><c> à</c><00:00:01.800><c> toutes</c> et à tous

00:00:03.200 --> 00:00:05.800 align:start position:0%
Bonjour à toutes et à tous
bienvenue dans ce séminaire !

00:00:05.800 --> 00:00:08.500 align:start position:0%
bienvenue dans ce séminaire !
Nous analysons l'entretien qualitatif ?
"""
        res = clean_subtitles(vtt)
        self.assertEqual(
            res.text,
            "Bonjour à toutes et à tous bienvenue dans ce séminaire\u00A0! Nous analysons l'entretien qualitatif\u00A0?",
        )
        self.assertGreaterEqual(res.removed_cue_count, 4)

    def test_french_typography_protects_urls_and_times(self) -> None:
        raw = "Rendez-vous sur https://lescribeaudio.com/outils à 14:30 : êtes-vous prêt ? « Oui ! »"
        norm = normalize_french_typography(raw)
        self.assertIn("https://lescribeaudio.com/outils", norm)
        self.assertIn("14:30\u00A0:", norm)
        self.assertIn("prêt\u00A0?", norm)
        self.assertIn("«\u00A0Oui\u00A0!\u00A0»", norm)

    def test_iramuteq_corpus_conversion(self) -> None:
        transcript = (
            "Enquêteur : Quel est votre *rôle* dans l'équipe ?\n"
            "Enquêté P1 : Je coordonne les analyses *qualitatives* depuis trois ans."
        )
        starred = to_iramuteq_corpus(
            transcript,
            corpus_id="entretien_01",
            variables={"sexe": "F", "age": "35_44"},
        )
        self.assertIn("**** *entretien_01 *sexe_f *age_35_44 *locuteur_enqueteur", starred)
        self.assertIn("**** *entretien_01 *sexe_f *age_35_44 *locuteur_enquete_p1", starred)
        self.assertNotIn("*rôle*", starred)

        filtered = to_iramuteq_corpus(
            transcript,
            corpus_id="entretien_01",
            interviewer_mode="exclude",
        )
        self.assertNotIn("Quel est votre", filtered)
        self.assertIn("-*locuteur_enquete_p1", filtered)

    def test_estimate_transcription_time(self) -> None:
        est = estimate_transcription_time(90)
        self.assertEqual(est["estimated_words"], 13500)
        self.assertEqual(est["manual_typing_hours"]["min"], 6.0)
        self.assertEqual(est["manual_typing_hours"]["max"], 10.5)
        self.assertEqual(est["two_pass_ai_proofreading_hours"]["min"], 3.0)
        self.assertEqual(est["two_pass_ai_proofreading_hours"]["max"], 4.5)
        self.assertEqual(est["time_division_factor"], 2)
        self.assertEqual(
            est["pricing_reference_eur_ht"]["human_double_proofreading_total"], 90.0
        )


if __name__ == "__main__":
    unittest.main()
