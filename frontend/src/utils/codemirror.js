import { useEffect, useState } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { indentWithTab, selectAll } from '@codemirror/commands';
import { EditorView, keymap } from '@codemirror/view';
import '../components/CodeMirror.css';

const LANGUAGE_EXTENSIONS = {
  javascript,
  python,
  html,
  css,
  json,
};

export function getCodeMirrorExtensions(language, includeTabIndent = true) {
  const languageExtension = LANGUAGE_EXTENSIONS[language];
  const extensions = [EditorView.lineWrapping];

  if (languageExtension) extensions.push(languageExtension());

  if (includeTabIndent) {
    extensions.push(
      keymap.of([
        indentWithTab,
        { key: 'Mod-a', run: selectAll },
      ]),
    );
  } else {
    extensions.push(
      keymap.of([
        { key: 'Mod-a', run: selectAll },
      ]),
    );
  }
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
