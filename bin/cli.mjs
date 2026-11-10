#!/usr/bin/env node

import fs from 'node:fs';
import {
  cleanSubtitles,
  toIramuteqCorpus,
  estimateTranscriptionTime,
} from '../src/index.mjs';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`srt-vtt-cleaner-fr v1.0.0 — LE SCRIBE AUDIO (https://lescribeaudio.com/outils)

Usage :
  npx srt-vtt-cleaner-fr <fichier.srt|fichier.vtt> [options]
  npx srt-vtt-cleaner-fr --estimate <duree_minutes>

Options :
  -o, --output <chemin>       Écrit le résultat dans un fichier UTF-8 (sans BOM)
  --iramuteq                  Convertit la sortie au format corpus étoilé IRaMuTeQ (**** *locuteur_X)
  --id <identifiant>          Identifiant d'entretien pour IRaMuTeQ (défaut: entretien_01)
  --exclude-interviewer       Exclut les relances de l'enquêteur dans l'export IRaMuTeQ
  --no-merge                  Conserve une ligne par réplique sans fusion de paragraphes
  --no-french-typo            Désactive l'insertion des espaces insécables françaises
  --estimate <minutes>        Affiche l'estimation réaliste du temps de retranscription/relecture
  -h, --help                  Affiche cette aide
`);
}

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

const estimateIdx = args.indexOf('--estimate');
if (estimateIdx !== -1) {
  const mins = Number(args[estimateIdx + 1]);
  if (!Number.isFinite(mins) || mins <= 0) {
    console.error('Erreur : veuillez indiquer une durée en minutes valide (ex: --estimate 60).');
    process.exit(1);
  }
  const est = estimateTranscriptionTime(mins);
  console.log(JSON.stringify(est, null, 2));
  process.exit(0);
}

let inputPath = null;
let outputPath = null;
let iramuteq = false;
let corpusId = 'entretien_01';
let excludeInterviewer = false;
let mergeSentences = true;
let frenchTypography = true;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-o' || arg === '--output') {
    outputPath = args[++i];
  } else if (arg === '--iramuteq') {
    iramuteq = true;
  } else if (arg === '--id') {
    corpusId = args[++i] || 'entretien_01';
  } else if (arg === '--exclude-interviewer') {
    excludeInterviewer = true;
  } else if (arg === '--no-merge') {
    mergeSentences = false;
  } else if (arg === '--no-french-typo') {
    frenchTypography = false;
  } else if (!arg.startsWith('-') && !inputPath) {
    inputPath = arg;
  }
}

if (!inputPath) {
  console.error('Erreur : aucun fichier .srt ou .vtt spécifié.');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const cleaned = cleanSubtitles(raw, {
  mergeSentences: iramuteq ? false : mergeSentences,
  frenchTypography,
});

const outputText = iramuteq
  ? toIramuteqCorpus(cleaned.text, {
      id: corpusId,
      interviewerMode: excludeInterviewer ? 'exclude' : 'keep',
      splitBySpeakerStarred: !excludeInterviewer,
    })
  : `${cleaned.text}\n`;

if (outputPath) {
  fs.writeFileSync(outputPath, outputText, { encoding: 'utf8' });
  console.error(
    `OK : ${cleaned.wordCount} mots écrits dans ${outputPath} (${cleaned.removedCueCount} métadonnées/horodatages retirés).`
  );
} else {
  process.stdout.write(outputText);
}
