// Lightweight heuristic language detector for the text composer.
// Not a parser — just scores a handful of telltale signals per language
// and picks the best match. Falls back to plain text when nothing scores.

const RULES = [
  {
    lang: 'json',
    test: (src) => {
      const trimmed = src.trim();
      if (!trimmed) return 0;
      if (!/^[[{]/.test(trimmed) || !/[\]}]$/.test(trimmed)) return 0;
      try {
        JSON.parse(trimmed);
        return 10;
      } catch {
        return 0;
      }
    },
  },
  {
    lang: 'html',
    test: (src) => {
      let score = 0;
      if (/^\s*<!doctype html/i.test(src)) score += 6;
      if (/<\/?(html|head|body|div|span|script|style|table|ul|li|a)\b/i.test(src)) score += 3;
      if (/<[a-z][\w-]*(\s[^>]*)?>[\s\S]*<\/[a-z][\w-]*>/i.test(src)) score += 2;
      return score;
    },
  },
  {
    lang: 'css',
    test: (src) => {
      let score = 0;
      if (/[.#]?[\w-]+\s*\{[^{}]*:[^{}]*\}/.test(src)) score += 3;
      if (/@media|@import|@keyframes/.test(src)) score += 2;
      if (/:\s*(#[0-9a-f]{3,8}|\d+(px|rem|em|%|vh|vw));/i.test(src)) score += 2;
      if (/<[a-z][\s\S]*>/i.test(src)) score -= 4; // looks like HTML instead
      return score;
    },
  },
  {
    lang: 'python',
    test: (src) => {
      let score = 0;
      if (/^\s*(def|class)\s+\w+.*:\s*$/m.test(src)) score += 4;
      if (/^\s*(import|from)\s+\w+/m.test(src)) score += 2;
      if (/:\s*$/m.test(src) && !/[{};]/.test(src)) score += 1;
      if (/\bself\b/.test(src)) score += 2;
      if (/^\s*#/m.test(src)) score += 1;
      if (/\bprint\(/.test(src)) score += 1;
      if (/[{};]/.test(src)) score -= 2;
      return score;
    },
  },
  {
    lang: 'bash',
    test: (src) => {
      let score = 0;
      if (/^#!.*\b(bash|sh|zsh)\b/m.test(src)) score += 6;
      if (/^\s*(sudo|cd|ls|grep|echo|export|mkdir|rm|chmod|curl|npm|git)\s/m.test(src)) score += 2;
      if (/\$\{?\w+\}?/.test(src)) score += 1;
      if (/^\s*(if|then|fi|for|do|done)\b/m.test(src)) score += 1;
      return score;
    },
  },
  {
    lang: 'javascript',
    test: (src) => {
      let score = 0;
      if (/\b(const|let|var)\s+\w+\s*=/.test(src)) score += 2;
      if (/\bfunction\s*\w*\s*\(/.test(src)) score += 2;
      if (/=>/.test(src)) score += 2;
      if (/\b(import|export)\s/.test(src)) score += 2;
      if (/console\.log\(/.test(src)) score += 2;
      if (/;\s*$/m.test(src)) score += 1;
      return score;
    },
  },
];

/**
 * Guess a language for the given source text.
 * Returns one of the LANGUAGES option values ('' for plain text).
 */
export function detectLanguage(source) {
  if (!source || !source.trim()) return '';

  let best = { lang: '', score: 0 };
  for (const rule of RULES) {
    const score = rule.test(source);
    if (score > best.score) best = { lang: rule.lang, score };
  }

  // Require a minimum confidence before committing to a guess.
  return best.score >= 3 ? best.lang : '';
}