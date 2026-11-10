export interface CleanSubtitlesOptions {
  /** Déduplique les sous-titres glissants auto-générés (YouTube, Whisper, Teams). Défaut: true */
  deduplicateRolling?: boolean;
  /** Fusionne les lignes fragmentées en paragraphes continus par locuteur. Défaut: true */
  mergeSentences?: boolean;
  /** Insère les espaces insécables françaises avant `: ; ? !` et dans `« … »`. Défaut: true */
  frenchTypography?: boolean;
  /** Caractère d'espace insécable utilisé (`\u00A0` par défaut, ou `\u202F`). */
  nbspChar?: string;
  /** Conserve les étiquettes de locuteurs (`<v M. Martin>`, `Enquêté P1 :`). Défaut: true */
  preserveSpeakers?: boolean;
}

export interface CleanSubtitlesResult {
  text: string;
  lines: string[];
  wordCount: number;
  charCount: number;
  removedCueCount: number;
}

export interface IramuteqCorpusOptions {
  /** Identifiant de l'entretien (ex: `"entretien_01"`). */
  id?: string;
  /** Variables étoilées socio-démographiques (objet `{ sexe: 'F', age: '35_44' }` ou tableau `['sexe_f']`). */
  variables?: Record<string, string> | string[];
  /** Traitement des relances de l'enquêteur : `'keep'`, `'tag'` (`-*relance_enqueteur`) ou `'exclude'`. */
  interviewerMode?: 'keep' | 'tag' | 'exclude';
  /** Étiquettes reconnues comme appartenant au chercheur / enquêteur. */
  interviewerLabels?: string[];
  /** Génère une ligne étoilée `**** *id *locuteur_X` à chaque changement d'intervenant. Défaut: true */
  splitBySpeakerStarred?: boolean;
  /** Nettoie d'abord l'entrée comme un fichier `.srt`/`.vtt`. Défaut: false */
  cleanInputFirst?: boolean;
}

export interface TranscriptionTimeEstimate {
  audioDurationMinutes: number;
  audioDurationHours: number;
  estimatedWords: number;
  manualTypingHours: {
    min: number;
    max: number;
    professionalMin: number;
    professionalMax: number;
    nonProfessionalMin: number;
    nonProfessionalMax: number;
  };
  twoPassAiProofreadingHours: {
    min: number;
    max: number;
    };
  timeDivisionFactor: 2;
  productivityGainPercent: 50;
  pricingReferenceEurHt: {
    aiTwoPassFromPerHour: number;
    aiTwoPassPackPerHour: number;
    aiTwoPassEstimateMin: number;
    aiTwoPassEstimatePack: number;
    humanDoubleProofreadingPerHour: number;
    humanDoubleProofreadingPerMinute: number;
    humanDoubleProofreadingTotal: number;
  };
}

export function normalizeFrenchTypography(text: string, options?: { nbspChar?: string }): string;
export function cleanSubtitles(rawInput: string, options?: CleanSubtitlesOptions): CleanSubtitlesResult;
export function sanitizeIramuteqModality(raw: string): string;
export function toIramuteqCorpus(transcriptText: string, options?: IramuteqCorpusOptions): string;
export function estimateTranscriptionTime(
  audioDurationMinutes: number,
  options?: { wordsPerMinute?: number }
): TranscriptionTimeEstimate;
