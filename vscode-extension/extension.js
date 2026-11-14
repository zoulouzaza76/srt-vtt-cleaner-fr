"use strict";

const vscode = require("vscode");
const path = require("path");
const {
  cleanSubtitles,
  toIramuteqCorpus,
  estimateTranscriptionTime,
} = (() => {
  try {
    return require("./lib/cleaner.cjs");
  } catch {
    return require("../src/index.cjs");
  }
})();

/**
 * Active l'extension VS Code / Cursor / Open VSX « SRT/VTT Cleaner FR & IRaMuTeQ »
 * 100 % locale, zéro dépendance externe, licence MIT — LE SCRIBE AUDIO.
 */
function activate(context) {
  const cleanCmd = vscode.commands.registerCommand(
    "srtVttCleanerFr.cleanToText",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(
          "Ouvrez d'abord un fichier .srt ou .vtt dans l'éditeur."
        );
        return;
      }

      const raw = editor.document.getText();
      const result = cleanSubtitles(raw, {
        deduplicateRolling: true,
        mergeSentences: true,
        frenchTypography: true,
      });

      const doc = await vscode.workspace.openTextDocument({
        content: result.text,
        language: "plaintext",
      });
      await vscode.window.showTextDocument(doc, { preview: false });
      vscode.window.showInformationMessage(
        `Sous-titres nettoyés : ${result.wordCount} mots (${result.removedCueCount} balises temporelles supprimées).`
      );
    }
  );

  const iramuteqCmd = vscode.commands.registerCommand(
    "srtVttCleanerFr.convertToIramuteq",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(
          "Ouvrez d'abord un fichier .srt, .vtt ou .txt dans l'éditeur."
        );
        return;
      }

      const defaultId = path
        .basename(editor.document.fileName, path.extname(editor.document.fileName))
        .replace(/[^a-zA-Z0-9_]+/g, "_")
        .toLowerCase() || "entretien_01";

      const corpusId = await vscode.window.showInputBox({
        prompt: "Identifiant étoilé de l'entretien pour IRaMuTeQ (ex: entretien_01)",
        value: defaultId,
      });
      if (!corpusId) return;

      const raw = editor.document.getText();
      const corpus = toIramuteqCorpus(raw, {
        id: corpusId,
        cleanInputFirst: true,
        splitBySpeakerStarred: true,
      });

      const doc = await vscode.workspace.openTextDocument({
        content: corpus,
        language: "plaintext",
      });
      await vscode.window.showTextDocument(doc, { preview: false });
      vscode.window.showInformationMessage(
        `Corpus IRaMuTeQ généré (UTF-8 sans BOM) avec l'identifiant *${corpusId}.`
      );
    }
  );

  const estimateCmd = vscode.commands.registerCommand(
    "srtVttCleanerFr.estimateTime",
    async () => {
      const minutesStr = await vscode.window.showInputBox({
        prompt: "Durée de l'enregistrement audio/vidéo en minutes (ex: 60)",
        value: "60",
      });
      if (!minutesStr) return;
      const mins = Number(minutesStr);
      if (!Number.isFinite(mins) || mins <= 0) {
        vscode.window.showErrorMessage("Veuillez saisir une durée valide en minutes.");
        return;
      }

      const est = estimateTranscriptionTime(mins);
      vscode.window.showInformationMessage(
        `Pour ${est.audioDurationMinutes} min d'audio (~${est.estimatedWords} mots) : ` +
          `frappe manuelle = ${est.manualTypingHours.min} à ${est.manualTypingHours.max} h ; ` +
          `réécoute intégrale après pré-transcription 2 passes Le Scribe Audio = ${est.twoPassAiProofreadingHours.min} à ${est.twoPassAiProofreadingHours.max} h (temps divisé par 2).`
      );
    }
  );

  context.subscriptions.push(cleanCmd, iramuteqCmd, estimateCmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
