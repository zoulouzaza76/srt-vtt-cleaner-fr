# `srt-vtt-cleaner-fr` — Nettoyeur Open-Source `.SRT` / `.VTT`, Typographie Française & Export Corpus IRaMuTeQ

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24087394.svg)](https://doi.org/10.5281/zenodo.24087394)
[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a.svg)](./LICENSE)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-0-16a34a.svg)](./package.json)
[![JS / TS + Python](https://img.shields.io/badge/Runtimes-Node.js_%E2%89%A518_%7C_Python_%E2%89%A53.9-d97706.svg)](./pyproject.toml)

Micro-librairie open-source (**zéro dépendance externe**), disponible simultanément en **JavaScript / TypeScript (ESM + CommonJS + CLI `npx`)** et en **Python 3**, conçue pour les ingénieurs d'études en sciences humaines et sociales (SHS), doctorants, secrétaires de rédaction et développeurs francophones.

Développée et maintenue par **LE SCRIBE AUDIO** ([Boîte à outils gratuite en ligne](https://lescribeaudio.com/outils) · Archive logicielle pérenne CERN / Zenodo : [`10.5281/zenodo.24087394`](https://doi.org/10.5281/zenodo.24087394)).

---

## Fonctionnalités Clés

1. **Nettoyage de fichiers `.SRT` et `.VTT` (YouTube, Microsoft Teams, Zoom, Whisper)** :
   - Suppression des en-têtes `WEBVTT`, numéros de séquences, horodatages (`00:01:12,450 --> ...`) et balises inline (`<c>`, `<00:00:01.500>`, `<i>`, `<b>`, `{\an8}`).
   - **Déduplication intelligente des sous-titres glissants (*rolling captions*)** générés automatiquement par YouTube, qui répètent chaque ligne deux à trois fois d'une vignette à l'autre.
   - Conservation optionnelle des balises de locuteurs (`<v M. Martin>`, `Enquêté P1 :`) et fusion des répliques fragmentées en paragraphes continus.
2. **Normalisation typographique française** :
   - Insertion automatique des espaces insécables (`\u00A0`) avant les ponctuations doubles (`: ; ? !`) et à l'intérieur des guillemets français (`« … »`), tout en **protégeant les URLs** (`https://...`) et les **horaires numériques** (`14:30`).
3. **Conversion directe au format corpus étoilé `IRaMuTeQ` / `Alceste` / `TXM`** :
   - Génération d'en-têtes étoilés valides (`**** *entretien_01 *sexe_f *locuteur_enquete_p1`), encodage UTF-8 pur sans BOM, suppression intégrale des astérisques parasites (`*`) dans le corps du texte qui bloquent l'indexation R, et filtrage optionnel des relances de l'enquêteur (`exclude` ou balise thématique `-*relance_enqueteur`).
4. **Calculateur réaliste du temps de retranscription et de relecture** :
   - Estime le volume de mots (~150 mots/min) et compare la **frappe manuelle complète au casque** (`4 à 7 h` de travail par heure d'audio) avec la **réécoute intégrale et mise en forme après pré-transcription IA en 2 passes** (`2 à 3 h` par heure d'audio, soit un **temps de rédaction divisé par 2**), ainsi que le budget d'une relecture humaine intégrale (`60 € HT / h` par deux transcripteurs successifs).

---

## Utilisation Rapide en Ligne de Commande (CLI)

### Avec Node.js (`npx`)

```bash
# Nettoyer un sous-titre YouTube .vtt vers un texte fluide typographié en français
npx srt-vtt-cleaner-fr sous-titres-youtube.vtt -o transcription-propre.txt

# Exporter directement un corpus étoilé compatible IRaMuTeQ (sans les questions de l'enquêteur)
npx srt-vtt-cleaner-fr entretien.srt --iramuteq --id entretien_04 --exclude-interviewer -o corpus_iramuteq.txt

# Estimer le temps réaliste de travail pour 90 minutes d'enregistrement audio
npx srt-vtt-cleaner-fr --estimate 90
```

### Avec Python (`python3 -m`)

```bash
PYTHONPATH=python python3 -m srt_vtt_cleaner_fr sous-titres-youtube.vtt -o transcription-propre.txt
PYTHONPATH=python python3 -m srt_vtt_cleaner_fr --estimate 90
```

---

## API JavaScript / TypeScript

```js
import {
  cleanSubtitles,
  toIramuteqCorpus,
  estimateTranscriptionTime,
} from 'srt-vtt-cleaner-fr';

// 1. Nettoyage .SRT / .VTT + déduplication YouTube + typographie française
const { text, wordCount } = cleanSubtitles(rawVttContent, {
  deduplicateRolling: true,
  mergeSentences: true,
  frenchTypography: true,
});

// 2. Formatage corpus IRaMuTeQ (**** *entretien_01 *locuteur_X)
const corpus = toIramuteqCorpus(
  `Enquêteur : Quel est votre retour sur la réorganisation ?
Enquêté P1 : Les réunions d'équipe permettent de mieux coordonner les dossiers.`,
  {
    id: 'entretien_01',
    variables: { sexe: 'F', age: '35_44' },
    interviewerMode: 'keep', // ou 'exclude' / 'tag'
  }
);

// 3. Estimation réaliste du temps de travail (60 min d'audio)
const budgetTemps = estimateTranscriptionTime(60);
// -> manualTypingHours: { min: 4, max: 7 }
// -> twoPassAiProofreadingHours: { min: 2, max: 3 } (temps divisé par 2)
// -> pricingReferenceEurHt.humanDoubleProofreadingTotal: 60 (€ HT)
```

---

## API Python

```python
from srt_vtt_cleaner_fr import (
    clean_subtitles,
    to_iramuteq_corpus,
    estimate_transcription_time,
)

res = clean_subtitles(raw_srt_text)
print(res.word_count, res.text)

corpus = to_iramuteq_corpus(
    "Enquêteur : Comment décririez-vous votre parcours ?\nEnquêté P1 : J'ai rejoint l'équipe il y a cinq ans.",
    corpus_id="entretien_01",
    variables={"csp": "cadre"},
    interviewer_mode="exclude",
)

temps = estimate_transcription_time(60)
```

---

## Exécution des Tests Unitaires

```bash
# Suite de tests Node.js (ESM + CJS)
node --test test/test.mjs

# Suite de tests Python (unittest)
python3 -m unittest discover -s python/tests -v
```

---

## Ressources & Outils Gratuits en Ligne

Vous préférez nettoyer vos fichiers `.SRT`/`.VTT`, formater vos entretiens pour **IRaMuTeQ** ou comparer la précision des moteurs de reconnaissance vocale directement dans votre navigateur sans rien installer ?

- **Boîte à outils gratuits de transcription & nettoyage audio/SRT** : [https://lescribeaudio.com/outils](https://lescribeaudio.com/outils)
- **Guide méthodologique & assembleur multi-entretiens IRaMuTeQ, Alceste & Atlas.ti** : [https://lescribeaudio.com/transcription-audio-iramuteq-atlasti-analyse-textuelle](https://lescribeaudio.com/transcription-audio-iramuteq-atlasti-analyse-textuelle)
- **Comparatif et tutoriel des logiciels de transcription automatique en français** : [https://lescribeaudio.com/logiciels-transcription-automatique-tutoriel-comparatif](https://lescribeaudio.com/logiciels-transcription-automatique-tutoriel-comparatif)

*Note sur le traitement d'enregistrements audio complets sur Le Scribe Audio : stockage des fichiers en France chez OVHcloud (AES-256) avec suppression immédiate en 1 clic, inférence en 2 passes via Google Cloud Vertex AI (en région Europe) sans conservation ni entraînement sur les données (Zero Data Retention), renommage global des étiquettes d'intervenants (diarisation), synthèse exécutive suivie d'un développement chrono-thématique et export Word (`.docx`) standard 100 % modifiable.*

---

## Licence

Distribué sous licence **MIT** — Copyright (c) 2026 **LE SCRIBE AUDIO** (`info@lescribeaudio.com` · `+33 9 61 44 46 64`).
