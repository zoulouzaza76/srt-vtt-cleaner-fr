import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import {
  cleanSubtitles,
  normalizeFrenchTypography,
  toIramuteqCorpus,
  estimateTranscriptionTime,
} from '../src/index.mjs';

const require = createRequire(import.meta.url);
const cjsLib = require('../src/index.cjs');

test('cleanSubtitles déduplique les sous-titres glissants YouTube (.vtt) et nettoie les balises <c>', () => {
  const youtubeVtt = `WEBVTT
Kind: captions
Language: fr

00:00:01.000 --> 00:00:03.200 align:start position:0%
Bonjour<00:00:01.500><c> à</c><00:00:01.800><c> toutes</c> et à tous

00:00:03.200 --> 00:00:05.800 align:start position:0%
Bonjour à toutes et à tous
bienvenue dans ce séminaire !

00:00:05.800 --> 00:00:08.500 align:start position:0%
bienvenue dans ce séminaire !
Nous allons analyser l'enquête qualitative ?
`;

  const result = cleanSubtitles(youtubeVtt);
  assert.equal(
    result.text,
    "Bonjour à toutes et à tous bienvenue dans ce séminaire\u00A0! Nous allons analyser l'enquête qualitative\u00A0?"
  );
  assert.ok(result.wordCount >= 14);
  assert.ok(result.removedCueCount >= 4);
});

test('cleanSubtitles nettoie un fichier .srt Teams/Whisper avec balises <i> et locuteurs', () => {
  const srt = `1
00:00:00,500 --> 00:00:04,100
<i>M. Martin : Bonjour Mme Dubois ; comment allez-vous ?</i>

2
00:00:04,200 --> 00:00:08,900
Mme Dubois : Très bien : nous commençons l'entretien à 14:30.
`;

  const res = cleanSubtitles(srt);
  assert.equal(
    res.text,
    "M. Martin\u00A0: Bonjour Mme Dubois\u00A0; comment allez-vous\u00A0?\n\nMme Dubois\u00A0: Très bien\u00A0: nous commençons l'entretien à 14:30."
  );
});

test('normalizeFrenchTypography protège les URLs https:// et les heures numériques 14:30', () => {
  const input = 'Consultez https://lescribeaudio.com/outils avant 14:30 : est-ce clair ? « Oui ! »';
  const out = normalizeFrenchTypography(input);
  assert.ok(out.includes('https://lescribeaudio.com/outils'));
  assert.ok(out.includes('14:30\u00A0:'));
  assert.ok(out.includes('clair\u00A0?'));
  assert.ok(out.includes('«\u00A0Oui\u00A0!\u00A0»'));
});

test('toIramuteqCorpus génère les lignes étoilées **** *locuteur_X et purge les astérisques parasites', () => {
  const transcript = `Enquêteur : Pouvez-vous décrire votre *poste* actuel ?
Enquêté P1 : Je travaille au laboratoire depuis cinq ans *environ*.`;

  const starredBySpeaker = toIramuteqCorpus(transcript, {
    id: 'entretien_01',
    variables: { sexe: 'F', age: '35_44' },
  });

  assert.ok(starredBySpeaker.includes('**** *entretien_01 *sexe_f *age_35_44 *locuteur_enqueteur'));
  assert.ok(starredBySpeaker.includes('**** *entretien_01 *sexe_f *age_35_44 *locuteur_enquete_p1'));
  assert.ok(!starredBySpeaker.includes('*poste*'));
  assert.ok(starredBySpeaker.includes('poste actuel'));

  const excludedInterviewer = toIramuteqCorpus(transcript, {
    id: 'entretien_01',
    interviewerMode: 'exclude',
  });
  assert.ok(!excludedInterviewer.includes('Pouvez-vous décrire'));
  assert.ok(excludedInterviewer.includes('-*locuteur_enquete_p1'));
});

test('estimateTranscriptionTime respecte les temps réalistes (4-7h manuel vs 2-3h en 2 passes, relecture humaine 60 € HT/h)', () => {
  const est = estimateTranscriptionTime(60);
  assert.equal(est.estimatedWords, 9000);
  assert.equal(est.manualTypingHours.min, 4);
  assert.equal(est.manualTypingHours.max, 7);
  assert.equal(est.twoPassAiProofreadingHours.min, 2);
  assert.equal(est.twoPassAiProofreadingHours.max, 3);
  assert.equal(est.timeDivisionFactor, 2);
  assert.equal(est.pricingReferenceEurHt.humanDoubleProofreadingPerHour, 60);
  assert.equal(est.pricingReferenceEurHt.humanDoubleProofreadingTotal, 60);
});

test('Compatibilité CommonJS (index.cjs) expose les mêmes fonctions', () => {
  const cjsRes = cjsLib.cleanSubtitles('1\n00:00:01,000 --> 00:00:02,000\nSalut !');
  assert.equal(cjsRes.text, 'Salut\u00A0!');
});
