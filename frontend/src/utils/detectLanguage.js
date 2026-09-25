// Lightweight heuristic language detector for the text composer.
// Not a parser — just scores a handful of telltale signals per language
// and picks the best match. Falls back to plain text when nothing scores
// with enough confidence.

const RULES = [
  // ---- Structural / unambiguous formats first ----

  {
    lang: 'json',
    test: (src) => {
      const trimmed = src.trim();
      if (!trimmed) return 0;
      if (!/^[[{]/.test(trimmed) || !/[\]}]$/.test(trimmed)) return 0;
      try {
        JSON.parse(trimmed);
        return 12;
      } catch {
        return 0;
      }
    },
  },
  {
    lang: 'xml',
    test: (src) => {
      let score = 0;
      if (/^\s*<\?xml\b/i.test(src)) score += 8;
      if (/<[a-z][\w:-]*(\s[^>]*)?\/?>/i.test(src) && !/<!doctype html/i.test(src))
        score += 2;
      if (/xmlns(:\w+)?=/.test(src)) score += 3;
      if (/<\/[a-z][\w:-]*>/i.test(src)) score += 1;
      return score;
    },
  },
  {
    lang: 'html',
    test: (src) => {
      let score = 0;
      if (/^\s*<!doctype html/i.test(src)) score += 8;
      if (/<\/?(html|head|body|div|span|script|style|table|ul|li|a|button|form)\b/i.test(src))
        score += 3;
      if (/<[a-z][\w-]*(\s[^>]*)?>[\s\S]*<\/[a-z][\w-]*>/i.test(src)) score += 2;
      return score;
    },
  },
  {
    lang: 'yaml',
    test: (src) => {
      let score = 0;
      if (/^---\s*$/m.test(src)) score += 4;
      if (/^[ \t]*[\w.-]+:\s*(#.*)?$/m.test(src)) score += 2;
      if (/^[ \t]*-\s+\S/m.test(src)) score += 2;
      if (/^[ \t]*[\w.-]+:\s+\S/m.test(src)) score += 1;
      if (/[{};]/.test(src)) score -= 3;
      return score;
    },
  },
  {
    lang: 'markdown',
    test: (src) => {
      let score = 0;
      if (/^#{1,6}\s+\S/m.test(src)) score += 3;
      if (/^\s*[-*+]\s+\S/m.test(src)) score += 1;
      if (/```[\s\S]*```/.test(src)) score += 3;
      if (/\[[^\]]+\]\([^)]+\)/.test(src)) score += 2;
      if (/^\s*>\s+\S/m.test(src)) score += 1;
      if (/\*\*[^*]+\*\*/.test(src)) score += 1;
      if (/<[a-z][\s\S]*>/i.test(src)) score -= 2;
      return score;
    },
  },

  // ---- SQL ----
  {
    lang: 'sql',
    test: (src) => {
      let score = 0;
      if (/\b(select|insert into|update|delete from|create table|alter table|drop table)\b/i.test(src))
        score += 4;
      if (/\bfrom\s+[\w."]+/i.test(src)) score += 2;
      if (/\bwhere\b/i.test(src)) score += 1;
      if (/\bjoin\b/i.test(src)) score += 1;
      if (/;\s*$/m.test(src)) score += 1;
      return score;
    },
  },

  // ---- Shell ----
  {
    lang: 'bash',
    test: (src) => {
      let score = 0;
      if (/^#!.*\b(bash|sh|zsh)\b/m.test(src)) score += 8;
      if (/^\s*(sudo|cd|ls|grep|echo|export|mkdir|rm|chmod|curl|wget|npm|git|apt-get|brew)\s/m.test(src))
        score += 2;
      if (/\$\{?\w+\}?/.test(src)) score += 1;
      if (/^\s*(if|then|fi|for|do|done|esac|case)\b/m.test(src)) score += 1;
      if (/\|\s*(grep|awk|sed|xargs)\b/.test(src)) score += 2;
      return score;
    },
  },

  // ---- Python ----
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
      if (/\belif\b|\bNone\b|\bTrue\b|\bFalse\b/.test(src)) score += 1;
      if (/[{};]/.test(src)) score -= 2;
      return score;
    },
  },

  // ---- PHP ----
  {
    lang: 'php',
    test: (src) => {
      let score = 0;
      if (/<\?php/.test(src)) score += 8;
      if (/\$\w+\s*=/.test(src)) score += 2;
      if (/\b(function|echo|namespace|use)\s/.test(src)) score += 1;
      if (/->\w+\(/.test(src)) score += 1;
      return score;
    },
  },

  // ---- Rust ----
  {
    lang: 'rust',
    test: (src) => {
      let score = 0;
      if (/\bfn\s+\w+\s*\(/.test(src)) score += 4;
      if (/\blet\s+(mut\s+)?\w+/.test(src)) score += 2;
      if (/::</.test(src) || /\b\w+::\w+/.test(src)) score += 2;
      if (/\b(impl|trait|struct|enum|pub|match)\b/.test(src)) score += 2;
      if (/->\s*\w+.*\{/.test(src)) score += 1;
      if (/!\(/.test(src)) score += 1;
      return score;
    },
  },

  // ---- Go ----
  {
    lang: 'go',
    test: (src) => {
      let score = 0;
      if (/^\s*package\s+\w+/m.test(src)) score += 5;
      if (/\bfunc\s+\w*\s*\(/.test(src)) score += 3;
      if (/:=/.test(src)) score += 2;
      if (/^\s*import\s*\(/m.test(src)) score += 2;
      if (/\bfmt\.\w+\(/.test(src)) score += 2;
      return score;
    },
  },

  // ---- Java ----
  {
    lang: 'java',
    test: (src) => {
      let score = 0;
      if (/\b(public|private|protected)\s+(static\s+)?(class|void|final)\b/.test(src))
        score += 4;
      if (/\bSystem\.out\.println\(/.test(src)) score += 3;
      if (/^\s*package\s+[\w.]+;/m.test(src)) score += 2;
      if (/^\s*import\s+[\w.]+;/m.test(src)) score += 1;
      if (/\bnew\s+\w+\(/.test(src)) score += 1;
      return score;
    },
  },

  // ---- C++ ----
  {
    lang: 'cpp',
    test: (src) => {
      let score = 0;
      if (/#include\s*<[\w./]+>/.test(src)) score += 4;
      if (/\bstd::\w+/.test(src)) score += 3;
      if (/\b(cout|cin)\s*<<|>>/.test(src)) score += 2;
      if (/\busing namespace\s+std\b/.test(src)) score += 3;
      if (/\bint\s+main\s*\(/.test(src)) score += 2;
      return score;
    },
  },

  // ---- CSS ----
  {
    lang: 'css',
    test: (src) => {
      let score = 0;
      if (/[.#]?[\w-]+\s*\{[^{}]*:[^{}]*\}/.test(src)) score += 3;
      if (/@media|@import|@keyframes/.test(src)) score += 2;
      if (/:\s*(#[0-9a-f]{3,8}|\d+(px|rem|em|%|vh|vw));/i.test(src)) score += 2;
      if (/<[a-z][\s\S]*>/i.test(src)) score -= 4;
      return score;
    },
  },

  // ---- TypeScript (before plain JS: more specific syntax) ----
  {
    lang: 'typescript',
    test: (src) => {
      let score = 0;
      if (/:\s*(string|number|boolean|any|void|unknown|never)\b/.test(src)) score += 4;
      if (/\binterface\s+\w+/.test(src)) score += 4;
      if (/\btype\s+\w+\s*=/.test(src)) score += 3;
      if (/<\w+>\(/.test(src)) score += 1;
      if (/\bas\s+(const|\w+)\b/.test(src)) score += 1;
      if (/\bimplements\s+\w+/.test(src)) score += 2;
      return score;
    },
  },

  // ---- JavaScript ----
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

  return best.score >= 3 ? best.lang : '';
}