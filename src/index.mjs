/**
 * srt-vtt-cleaner-fr — Micro-librairie open-source (zéro dépendance)
 * Nettoyage de sous-titres .SRT / .VTT francophones, déduplication YouTube,
 * normalisation typographique française, conversion IRaMuTeQ et estimation
 * réaliste du temps de retranscription / relecture.
 *
 * Licence MIT — (c) 2026 LE SCRIBE AUDIO (https://lescribeaudio.com)
 */

const HTML_ENTITIES = {
  '&nbsp;': '\u00A0',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&laquo;': '«',
  '&raquo;': '»',
  '&hellip;': '…',
};

const DEFAULT_INTERVIEWER_LABELS = [
  'enqueteur',
  'enquetrice',
  'chercheur',
  'chercheuse',
  'intervieweur',
  'intervieweuse',
  'moderateur',
  'moderatrice',
  'doctorant',
  'doctorante',
];

/**
 * Décode les entités HTML courantes présentes dans les exports .srt / .vtt.
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
  return text
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos|laquo|raquo|hellip);/gi, (match) => {
      const lower = match.toLowerCase();
      return HTML_ENTITIES[lower] ?? match;
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Normalise une chaîne pour comparer les doublons et recouvrements de mots.
 * @param {string} str
 * @returns {string}
 */
function normalizeForComparison(str) {
  return str
    .toLowerCase()
    .replace(/[\u00A0\u202F]+/g, ' ')
    .replace(/[.,;!?«»"()[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retire la partie déjà présente à la fin de `previousText` lorsque `nextLine`
 * est un sous-titre glissant (rolling caption YouTube auto-généré).
 * @param {string} previousLine
 * @param {string} nextLine
 * @returns {string}
 */
function stripRollingOverlap(previousLine, nextLine) {
  if (!previousLine || !nextLine) return nextLine;

  const prevNorm = normalizeForComparison(previousLine);
  const nextNorm = normalizeForComparison(nextLine);

  if (!prevNorm || !nextNorm) return nextLine;
  if (prevNorm === nextNorm) return '';

  // Cas 1 : la ligne suivante commence intégralement par la ligne précédente
  const prevWordsRaw = previousLine.trim().split(/\s+/);
  const nextWordsRaw = nextLine.trim().split(/\s+/);
  const prevWordsNorm = prevWordsRaw.map(normalizeForComparison).filter(Boolean);
  const nextWordsNorm = nextWordsRaw.map(normalizeForComparison).filter(Boolean);

  if (prevWordsNorm.length === 0 || nextWordsNorm.length === 0) return nextLine;

  // Cas où nextLine est déjà entièrement contenu à la fin de previousLine
  if (nextWordsNorm.length <= prevWordsNorm.length) {
    const tail = prevWordsNorm.slice(prevWordsNorm.length - nextWordsNorm.length);
    if (tail.every((w, i) => w === nextWordsNorm[i])) {
      return '';
    }
  }

  // Recherche du plus grand recouvrement suffixe(previousLine) == préfixe(nextLine)
  const maxOverlap = Math.min(prevWordsNorm.length, nextWordsNorm.length);
  for (let k = maxOverlap; k >= 2; k--) {
    let matches = true;
    for (let i = 0; i < k; i++) {
      if (prevWordsNorm[prevWordsNorm.length - k + i] !== nextWordsNorm[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Compter k mots non vides dans nextWordsRaw et retourner le reste
      let consumedNorm = 0;
      let rawIdx = 0;
      while (rawIdx < nextWordsRaw.length && consumedNorm < k) {
        if (normalizeForComparison(nextWordsRaw[rawIdx])) {
          consumedNorm++;
        }
        rawIdx++;
      }
      return nextWordsRaw.slice(rawIdx).join(' ').trim();
    }
  }

  return nextLine;
}

/**
 * Applique les règles typographiques françaises (espaces insécables avant `: ; ? !`
 * et à l'intérieur des guillemets `« … »`), tout en préservant les URLs (`https://`)
 * et les horaires numériques (`14:30`).
 *
 * @param {string} text
 * @param {{ nbspChar?: string }} [options]
 * @returns {string}
 */
export function normalizeFrenchTypography(text, options = {}) {
  if (!text) return '';
  const nbsp = options.nbspChar ?? '\u00A0';

  // Protéger temporairement les URLs (http://, https://)
  const protectedTokens = [];
  let working = String(text).replace(/https?:\/\/[^\s)»>]+/gi, (url) => {
    const token = `__URL_TOKEN_${protectedTokens.length}__`;
    protectedTokens.push(url);
    return token;
  });

  // Guillemets français : « texte » -> «\u00A0texte\u00A0»
  working = working.replace(/«[\s\u00A0\u202F]*/g, `«${nbsp}`);
  working = working.replace(/[\s\u00A0\u202F]*»/g, `${nbsp}»`);

  // Ponctuation haute ; ? ! -> espace insécable avant le signe (sauf répétitions ?! ou !!)
  working = working.replace(/([^\s\u00A0\u202F!?])[\s\u00A0\u202F]*([;?!])/g, `$1${nbsp}$2`);
  working = working.replace(/[\s\u00A0\u202F]+([;?!])/g, `${nbsp}$1`);

  // Deux-points `:` -> espace insécable sauf entre deux chiffres (ex: 14:30 ou 00:12:45)
  working = working.replace(/([^\s\u00A0\u202F\d])[\s\u00A0\u202F]*:(?!\/)/g, `$1${nbsp}:`);
  working = working.replace(/(\d)[\s\u00A0\u202F]+:(?!\d)/g, `$1${nbsp}:`);

  // Nettoyage des espaces multiples normaux (sans toucher aux sauts de ligne ni aux insécables)
  working = working.replace(/[ \t]{2,}/g, ' ');

  // Restaurer les URLs protégées
  for (let i = 0; i < protectedTokens.length; i++) {
    working = working.replace(`__URL_TOKEN_${i}__`, protectedTokens[i]);
  }

  return working;
}

/**
 * Extrait et nettoie le texte parlé d'un fichier de sous-titres `.srt` ou `.vtt`.
 *
 * @param {string} rawInput Contenu brut du fichier `.srt` ou `.vtt`
 * @param {{
 *   deduplicateRolling?: boolean,
 *   mergeSentences?: boolean,
 *   frenchTypography?: boolean,
 *   nbspChar?: string,
 *   preserveSpeakers?: boolean
 * }} [options]
 * @returns {{
 *   text: string,
 *   lines: string[],
 *   wordCount: number,
 *   charCount: number,
 *   removedCueCount: number
 * }}
 */
export function cleanSubtitles(rawInput, options = {}) {
  const {
    deduplicateRolling = true,
    mergeSentences = true,
    frenchTypography = true,
    nbspChar = '\u00A0',
    preserveSpeakers = true,
  } = options;

  if (!rawInput || typeof rawInput !== 'string') {
    return { text: '', lines: [], wordCount: 0, charCount: 0, removedCueCount: 0 };
  }

  // Retrait éventuel du BOM UTF-8 et normalisation des fins de ligne
  const normalized = rawInput.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rawLines = normalized.split('\n');

  const timestampArrowRe = /^\s*(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}\s*-->\s*(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}/;
  const standaloneTimecodeRe = /^\s*\[?(?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?\]?\s*$/;
  const sequenceIndexRe = /^\s*\d+\s*$/;
  const vttHeaderRe = /^\s*(?:WEBVTT(?:\s.*)?|Kind:\s*.*|Language:\s*.*)\s*$/i;
  const vttBlockStartRe = /^\s*(?:NOTE|STYLE|REGION)(?:\s|$)/;

  const extractedLines = [];
  let inMetadataBlock = false;
  let removedCueCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    if (inMetadataBlock) {
      if (line.trim() === '') {
        inMetadataBlock = false;
      }
      continue;
    }

    if (vttBlockStartRe.test(line)) {
      inMetadataBlock = true;
      removedCueCount++;
      continue;
    }

    if (vttHeaderRe.test(line)) {
      removedCueCount++;
      continue;
    }

    if (timestampArrowRe.test(line) || standaloneTimecodeRe.test(line)) {
      removedCueCount++;
      continue;
    }

    // Identifiant numérique de séquence (suivi d'un timecode ou isolé entre lignes vides)
    if (sequenceIndexRe.test(line)) {
      const nextLine = rawLines[i + 1] ?? '';
      const prevLine = i > 0 ? rawLines[i - 1] : '';
      if (timestampArrowRe.test(nextLine) || prevLine.trim() === '') {
        removedCueCount++;
        continue;
      }
    }

    if (line.trim() === '') {
      continue;
    }

    let cleaned = line;

    // Balise vocale WebVTT : <v M. Martin>Texte</v> -> M. Martin : Texte
    if (preserveSpeakers) {
      cleaned = cleaned.replace(/<v(?:\.[^>\s]+)*\s+([^>]+)>/gi, (_, speaker) => `${speaker.trim()} : `);
    } else {
      cleaned = cleaned.replace(/<v(?:\.[^>\s]+)*\s+[^>]+>/gi, '');
    }

    // Suppression des horodatages inline YouTube (<00:00:01.420>), balises <c>, <i>, <b>, <u>, <font>, ASS {\an8}
    cleaned = cleaned
      .replace(/<(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3}>/g, '')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      .replace(/\{\\[a-zA-Z0-9]+[^}]*\}/g, '');

    // Suppression des horodatages en début de ligne type [00:12:34] ou (00:12)
    cleaned = cleaned.replace(/^\s*[\[(](?:\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d{1,3})?[\])]\s*/, '');

    cleaned = decodeEntities(cleaned).replace(/\s+/g, ' ').trim();

    if (!cleaned) continue;

    extractedLines.push(cleaned);
  }

  // Déduplication des lignes consécutives et des sous-titres glissants YouTube
  const dedupedLines = [];
  let lastComparableLine = '';

  for (const line of extractedLines) {
    if (!deduplicateRolling) {
      dedupedLines.push(line);
      continue;
    }

    const stripped = stripRollingOverlap(lastComparableLine, line);
    lastComparableLine = line;

    if (!stripped) {
      continue;
    }
    dedupedLines.push(stripped);
  }

  // Fusion intelligente des phrases ou conservation ligne par ligne
  const speakerPrefixRe = /^(?:-\s*)?([A-ZÀ-ÖØ-Ý][\wÀ-ÿ.' -]{0,35})\s*:\s+/;
  let finalLines = [];

  if (mergeSentences && dedupedLines.length > 0) {
    let currentParagraph = '';
    let segmentsInParagraph = 0;

    for (const segment of dedupedLines) {
      const startsNewSpeaker = preserveSpeakers && speakerPrefixRe.test(segment);

      if (!currentParagraph) {
        currentParagraph = segment;
        segmentsInParagraph = 1;
        continue;
      }

      if (startsNewSpeaker) {
        finalLines.push(currentParagraph.trim());
        currentParagraph = segment;
        segmentsInParagraph = 1;
        continue;
      }

      // Découpage en paragraphes respirants toutes les ~6 phrases terminées
      const endsSentence = /[.!?…»]\s*$/.test(currentParagraph);
      if (endsSentence && segmentsInParagraph >= 6) {
        finalLines.push(currentParagraph.trim());
        currentParagraph = segment;
        segmentsInParagraph = 1;
      } else {
        currentParagraph = `${currentParagraph} ${segment}`.replace(/\s+/g, ' ');
        segmentsInParagraph++;
      }
    }

    if (currentParagraph.trim()) {
      finalLines.push(currentParagraph.trim());
    }
  } else {
    finalLines = dedupedLines;
  }

  if (frenchTypography) {
    finalLines = finalLines.map((p) => normalizeFrenchTypography(p, { nbspChar }));
  }

  const joiner = mergeSentences ? '\n\n' : '\n';
  const text = finalLines.join(joiner).trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  return {
    text,
    lines: finalLines,
    wordCount: words.length,
    charCount: text.length,
    removedCueCount,
  };
}

/**
 * Normalise un identifiant de modalité étoilée IRaMuTeQ (ASCII/alphanumérique + underscore, sans `*` ni `-`).
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeIramuteqModality(raw) {
  if (!raw) return 'inconnu';
  const cleaned = String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^\*+/, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'inconnu';
}

/**
 * Convertit une transcription nettoyée (ou un ensemble de tours de parole `Locuteur : texte`)
 * en corpus étoilé compatible IRaMuTeQ / Alceste / TXM (UTF-8 sans BOM, zéro astérisque parasite).
 *
 * @param {string} transcriptText Texte nettoyé ou sous-titres bruts
 * @param {{
 *   id?: string,
 *   variables?: Record<string, string> | string[],
 *   interviewerMode?: 'keep' | 'tag' | 'exclude',
 *   interviewerLabels?: string[],
 *   splitBySpeakerStarred?: boolean,
 *   cleanInputFirst?: boolean
 * }} [options]
 * @returns {string}
 */
export function toIramuteqCorpus(transcriptText, options = {}) {
  const {
    id = 'entretien_01',
    variables = {},
    interviewerMode = 'keep',
    interviewerLabels = DEFAULT_INTERVIEWER_LABELS,
    splitBySpeakerStarred = true,
    cleanInputFirst = false,
  } = options;

  const baseText = cleanInputFirst
    ? cleanSubtitles(transcriptText, { mergeSentences: false }).text
    : String(transcriptText ?? '');

  // Retrait du BOM éventuel et purge stricte des astérisques dans le corps du discours
  const safeLines = baseText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\*/g, '').trim())
    .filter(Boolean);

  // Construction des modalités étoilées globales
  const baseModalities = [`*${sanitizeIramuteqModality(id)}`];
  if (Array.isArray(variables)) {
    for (const v of variables) {
      baseModalities.push(`*${sanitizeIramuteqModality(v)}`);
    }
  } else if (variables && typeof variables === 'object') {
    for (const [key, val] of Object.entries(variables)) {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        baseModalities.push(`*${sanitizeIramuteqModality(key)}_${sanitizeIramuteqModality(val)}`);
      }
    }
  }

  const interviewerSet = new Set(interviewerLabels.map((l) => sanitizeIramuteqModality(l)));
  const speakerLineRe = /^(?:-\s*)?([^:]{1,45}?)\s*[\u00A0\u202F]*:\s+(.+)$/;

  // Analyse des tours de parole
  const turns = [];
  for (const line of safeLines) {
    const match = line.match(speakerLineRe);
    if (match) {
      const rawSpeaker = match[1].trim();
      const spoken = match[2].trim();
      const speakerSlug = sanitizeIramuteqModality(rawSpeaker);
      const isInterviewer = Array.from(interviewerSet).some(
        (label) => speakerSlug === label || speakerSlug.startsWith(`${label}_`)
      );
      turns.push({ speakerSlug, isInterviewer, text: spoken });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += ` ${line}`;
    } else {
      turns.push({ speakerSlug: null, isInterviewer: false, text: line });
    }
  }

  if (turns.length === 0) {
    return `**** ${baseModalities.join(' ')}\n`;
  }

  const hasDetectedSpeakers = turns.some((t) => t.speakerSlug !== null);

  // Mode 1 : une unité étoilée `**** *id *locuteur_X` par tour/locuteur
  if (hasDetectedSpeakers && splitBySpeakerStarred && interviewerMode === 'keep') {
    const blocks = [];
    for (const turn of turns) {
      const locModality = `*locuteur_${turn.speakerSlug || 'principal'}`;
      blocks.push(`**** ${[...baseModalities, locModality].join(' ')}\n${turn.text}`);
    }
    return `${blocks.join('\n\n')}\n`;
  }

  // Mode 2 : en-tête unique `**** *id ...` avec filtrage ou balisage thématique `-*relance_enqueteur` / `-*locuteur_X`
  const outputLines = [`**** ${baseModalities.join(' ')}`];
  for (const turn of turns) {
    if (turn.isInterviewer && interviewerMode === 'exclude') {
      continue;
    }
    if (hasDetectedSpeakers && turn.speakerSlug) {
      if (turn.isInterviewer && interviewerMode === 'tag') {
        outputLines.push('-*relance_enqueteur');
      } else {
        outputLines.push(`-*locuteur_${turn.speakerSlug}`);
      }
    }
    outputLines.push(turn.text);
  }

  return `${outputLines.join('\n')}\n`;
}

/**
 * Calcule une estimation réaliste du volume de mots, du temps de frappe manuelle
 * au casque (4 à 7 h pour 1 h d'audio) et du temps de relecture intégrale après
 * pré-transcription IA en 2 passes (2 à 3 h pour 1 h d'audio, soit un temps de
 * rédaction divisé par 2), ainsi que le budget de relecture humaine certifiée
 * (60 € HT / h par deux transcripteurs successifs).
 *
 * @param {number} audioDurationMinutes Durée de l'enregistrement en minutes (> 0)
 * @param {{ wordsPerMinute?: number }} [options]
 */
export function estimateTranscriptionTime(audioDurationMinutes, options = {}) {
  const minutes = Number(audioDurationMinutes);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError('audioDurationMinutes doit être un nombre positif ou nul.');
  }

  const wordsPerMinute = options.wordsPerMinute ?? 150;
  const hours = minutes / 60;
  const round1 = (n) => Math.round(n * 10) / 10;
  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    audioDurationMinutes: round1(minutes),
    audioDurationHours: round2(hours),
    estimatedWords: Math.round(minutes * wordsPerMinute),
    manualTypingHours: {
      min: round1(hours * 4),
      max: round1(hours * 7),
      professionalMin: round1(hours * 4),
      professionalMax: round1(hours * 6),
      nonProfessionalMin: round1(hours * 5),
      nonProfessionalMax: round1(hours * 7),
    },
    twoPassAiProofreadingHours: {
      min: round1(hours * 2),
      max: round1(hours * 3),
    },
    timeDivisionFactor: 2,
    productivityGainPercent: 50,
    pricingReferenceEurHt: {
      aiTwoPassFromPerHour: 1.5,
      aiTwoPassPackPerHour: 2.5,
      aiTwoPassEstimateMin: round2(hours * 1.5),
      aiTwoPassEstimatePack: round2(hours * 2.75),
      humanDoubleProofreadingPerHour: 60.0,
      humanDoubleProofreadingPerMinute: 1.0,
      humanDoubleProofreadingTotal: round2(minutes * 1.0),
    },
  };
}
