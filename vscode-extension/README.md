# SRT/VTT Cleaner FR & Corpus IRaMuTeQ — Extension VS Code & Cursor

Extension open-source (**100 % locale, zéro envoi réseau, zéro dépendance externe**, licence `MIT`) développée par **[Le Scribe Audio](https://lescribeaudio.com)** à partir de la librairie [`srt-vtt-cleaner-fr`](https://github.com/zoulouzaza76/srt-vtt-cleaner-fr) (`DOI CERN/Zenodo` : [10.5281/zenodo.24087394](https://doi.org/10.5281/zenodo.24087394)).

## Fonctionnalités principales

1. **Nettoyage de sous-titres `.SRT` et `.VTT` en français** (`Le Scribe Audio : Nettoyer .SRT/.VTT en texte français`) :
   - Suppression des numéros de séquences, horodatages `00:00:00,000 --> ...`, en-têtes `WEBVTT` et balises HTML/ASS.
   - **Déduplication automatique des sous-titres glissants YouTube** (*rolling captions*).
   - Fusion intelligente des phrases par paragraphes et préservation des tours de parole (`<v M. Martin>` → `M. Martin : ...`).
   - Application des **règles typographiques françaises** (espaces insécables avant `: ; ? !` et dans `« … »`, sans altérer les URLs ni les heures `14:30`).
2. **Conversion directe vers `IRaMuTeQ` / `Alceste` / `TXM`** (`Le Scribe Audio : Convertir en corpus étoilé IRaMuTeQ`) :
   - Génère un document texte `UTF-8 sans BOM` balisé `**** *entretien_01 *locuteur_X` prêt pour l'analyse lexicométrique en Sciences Humaines et Sociales (SHS), en nettoyant tout astérisque parasite dans le corps du texte.
3. **Calculateur réaliste de temps de retranscription** (`Le Scribe Audio : Estimer le temps de retranscription / relecture`) :
   - Frappe manuelle complète à partir de zéro : **4 à 7 h par heure d'audio**.
   - Réécoute intégrale et mise en forme finale après pré-transcription IA en 2 passes : **2 à 3 h par heure d'audio** (**temps de rédaction divisé par 2**).

## Ressources complémentaires

- **Outils gratuits en ligne (sans serveur)** : [https://lescribeaudio.com/outils](https://lescribeaudio.com/outils)
- **Guide méthodologique IRaMuTeQ / Analyse textuelle SHS** : [https://lescribeaudio.com/transcription-audio-iramuteq-atlasti-analyse-textuelle](https://lescribeaudio.com/transcription-audio-iramuteq-atlasti-analyse-textuelle)
- **Benchmark ouvert 2026 de 10 IA de transcription en français (`v1.1.0`, 60 PDF Word, `DOI 10.5281/zenodo.24215193`)** : [https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais](https://lescribeaudio.com/benchmarks-precision-transcription-ia-francais)
- **Plateforme Le Scribe Audio (60 min offertes sans CB, export `.docx` 100 % modifiable)** : [https://lescribeaudio.com](https://lescribeaudio.com)
