import { useEffect, useState } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';
import { java } from '@codemirror/lang-java';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { indentWithTab, selectAll } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import '../components/CodeMirror.css';

const LANGUAGE_EXTENSIONS = {
  javascript,
  typescript: () => javascript({ typescript: true }),
  go,
  java,
  cpp,
  rust,
  php,
  sql,
  html,
  xml,
  css,
  json,
  yaml,
  markdown,
};

export function getCodeMirrorExtensions(language, includeTabIndent = true) {
  const languageExtension = LANGUAGE_EXTENSIONS[language];
  const extensions = [EditorView.lineWrapping];

  if (languageExtension) extensions.push(languageExtension());

  extensions.push(
    keymap.of(
      includeTabIndent
        ? [indentWithTab, { key: 'Mod-a', run: selectAll }]
        : [{ key: 'Mod-a', run: selectAll }],
    ),
  );
  return extensions;
}

export function useCodeMirrorTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const updateTheme = () => {
      setTheme(
        document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      );
    };
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
