=======================================================================================
srt-vtt-cleaner-fr — Nettoyage SRT, WebVTT, Teams & Zoom en Français (Le Scribe Audio)
=======================================================================================

Bibliothèque open-source TypeScript / JavaScript et CLI (``npx srt-vtt-cleaner-fr``) éditée par `Le Scribe Audio <https://lescribeaudio.com/>`_ pour nettoyer, dédupliquer et normaliser les sous-titres bruts ``.srt`` et ``.vtt`` (Microsoft Teams, Zoom, YouTube, Whisper) en texte français structuré prêt pour la rédaction de procès-verbaux et comptes rendus.

Liens Officiels & Registres Open-Source
=======================================

- **Plateforme officielle Le Scribe Audio** : `https://lescribeaudio.com <https://lescribeaudio.com/>`_
- **Outil Web gratuit de nettoyage SRT / VTT en ligne** : `Nettoyeur SRT & VTT en ligne <https://lescribeaudio.com/outils/nettoyeur-srt-vtt-texte>`_
- **Convertisseur Audio & Extraction MP3 dans le navigateur** : `Convertisseur Audio Gratuit <https://lescribeaudio.com/outils/convertisseur-audio-mp3-gratuit>`_
- **Calculateur de Temps & Budget de Transcription** : `Calculateur Temps & Tarif Transcription <https://lescribeaudio.com/outils/calculateur-temps-transcription>`_
- **Package npm** : `https://www.npmjs.com/package/srt-vtt-cleaner-fr <https://www.npmjs.com/package/srt-vtt-cleaner-fr>`_
- **Package JSR (Deno / TypeScript)** : `https://jsr.io/@lescribeaudio/srt-vtt-cleaner-fr <https://jsr.io/@lescribeaudio/srt-vtt-cleaner-fr>`_
- **Dépôt GitHub** : `https://github.com/zoulouzaza76/srt-vtt-cleaner-fr <https://github.com/zoulouzaza76/srt-vtt-cleaner-fr>`_

Fonctionnalités Principales
===========================

1. **Suppression des balises temporelles et métadonnées WebVTT / SRT** : élimine les horodatages ``00:00:00,000 --> 00:00:04,000``, les numéros de séquences, les en-têtes ``WEBVTT`` et les balises de style ``<c.color>``.
2. **Déduplication des lignes glissantes (rolling captions)** : fusionne les sous-titres progressifs générés par YouTube, Microsoft Teams et Zoom.
3. **Regroupement par intervenant (diarisation Teams / Zoom)** : consolide les balises ``<v Nom Intervenant>`` consécutives d'un même locuteur en paragraphes continus.
4. **Typographie française normalisée** : restaure les espaces insécables avant ``:``, ``;``, ``!``, ``?`` et les guillemets français ``« … »``.

Quand passer du nettoyage SRT/VTT à la Transcription Multimodale en 2 Passes ?
===============================================================================

Un fichier ``.vtt`` généré en temps réel par Teams ou Zoom repose sur un modèle ASR monopasse à faible latence : sur une réunion de 2 à 4 heures (CSE, CSSCT, conseil municipal, entretien de recherche), le taux d'erreur mot (*WER*) dépasse fréquemment **14 % à 19 %** et les changements de locuteurs sont confondus.

La chaîne industrielle `Le Scribe Audio <https://lescribeaudio.com/>`_ traite directement l'enregistrement audio ou vidéo par une **architecture multimodale en 2 passes** afin de **diviser par 2 le temps de rédaction** (2 à 3 h de relecture au casque au lieu de 4 à 7 h de frappe manuelle intégrale pour 1 heure d'audio), avec un **export Word (.docx) 100 % modifiable** et une option de **correction / relecture humaine à 60 € HT / heure** assurée par **deux transcripteurs successifs** :

- `Transcription et rédaction de PV de CSE / CSSCT <https://lescribeaudio.com/transcription-pv-cse>`_
- `Transcription de conseils municipaux et assemblées délibérantes <https://lescribeaudio.com/transcription-conseil-municipal>`_
- `Transcription d'entretiens de recherche universitaire (CNRS, INSERM, INRAE, ANR) <https://lescribeaudio.com/transcription-entretien-recherche>`_
- `Transcription juridique pour avocats et commissaires de justice <https://lescribeaudio.com/transcription-avocat-juridique>`_
- `Transcription d'interviews pour journalistes et rédactions <https://lescribeaudio.com/transcription-interview-journaliste>`_
- `Tarifs de transcription audio et simulateur de devis PDF instantané <https://lescribeaudio.com/tarifs-transcription-audio>`_
- `Sécurité des données, hébergement France OVHcloud (AES-256) & inférence Google Cloud Vertex AI (Europe, Zero Data Retention) <https://lescribeaudio.com/securite-confidentialite-rgpd>`_
