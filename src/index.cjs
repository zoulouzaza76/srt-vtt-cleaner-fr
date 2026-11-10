'use strict';

/**
 * Pont CommonJS vers l'implémentation ESM sans dépendance externe.
 * Permet `const cleaner = await import('srt-vtt-cleaner-fr')` ou l'usage CJS synchrone.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const esmPath = path.join(__dirname, 'index.mjs');
const esmSource = fs
  .readFileSync(esmPath, 'utf8')
  .replace(/^export\s+function\s+(\w+)/gm, 'function $1');

const exportedNames = [
  'normalizeFrenchTypography',
  'cleanSubtitles',
  'sanitizeIramuteqModality',
  'toIramuteqCorpus',
  'estimateTranscriptionTime',
];

const cjsFooter = `\nmodule.exports = { ${exportedNames.join(', ')} };\n`;
const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(esmSource + cjsFooter, sandbox, { filename: esmPath });

module.exports = sandbox.module.exports;
