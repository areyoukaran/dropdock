import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {
  getCodeMirrorExtensions,
  useCodeMirrorTheme,
} from '../utils/codemirror';
import './TextComposer.css';

const LANGUAGES = [
  { value: '', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export default function TextComposer({
  value,
  language,
  onChange,
  onLanguageChange,
  disabled,
}) {
  const theme = useCodeMirrorTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandButtonRef = useRef(null);
  const modalRef = useRef(null);
  const languageLabel =
    LANGUAGES.find((option) => option.value === language)?.label ??
    'Plain text';

  useEffect(() => {
    if (!isExpanded) return undefined;
    const expandButton = expandButtonRef.current;

    const focusableSelector =
      'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusFirstControl = () => {
      modalRef.current?.querySelector(focusableSelector)?.focus();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [
        ...(modalRef.current?.querySelectorAll(focusableSelector) ?? []),
      ];
      if (!focusable.length) return;
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;
      event.preventDefault();
      focusable[nextIndex].focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    focusFirstControl();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      expandButton?.focus();
    };
  }, [isExpanded]);

  return (
    <div className="text-composer">
      <div className="text-composer-editor-wrap">
        <CodeMirror
          className="code-mirror-surface text-composer-editor"
          value={value}
          onChange={onChange}
          extensions={getCodeMirrorExtensions(language)}
          theme={theme}
          basicSetup
        placeholder="Paste text or code…"
          disabled={disabled}
          height="240px"
        />
        <button
          type="button"
          className="editor-icon-button editor-expand-button"
          ref={expandButtonRef}
          onClick={() => setIsExpanded(true)}
          aria-label="Expand editor"
          title="Expand editor"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 2H2v4M10 2h4v4M14 10v4h-4M2 10v4h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <select
        className="text-composer-lang"
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={disabled}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>

      {isExpanded && (
        <div
          className="editor-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsExpanded(false);
          }}
        >
          <section
            className="editor-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-editor-title"
          >
            <header className="editor-modal-header">
              <div>
                <p className="editor-modal-eyebrow">Editing</p>
                <h2 id="expanded-editor-title">{languageLabel}</h2>
              </div>
              <div className="editor-modal-actions">
                <select
                  className="text-composer-lang editor-modal-language"
                  value={language}
                  onChange={(event) => onLanguageChange(event.target.value)}
                  disabled={disabled}
                  aria-label="Language"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="editor-icon-button"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Close editor"
                >
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="m3 3 10 10M13 3 3 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </header>
            <CodeMirror
              className="code-mirror-surface editor-modal-editor"
              value={value}
              onChange={onChange}
              extensions={getCodeMirrorExtensions(language)}
              theme={theme}
              basicSetup
              disabled={disabled}
              height="calc(90vh - 120px)"
            />
          </section>
        </div>
      )}
    </div>
  );
}
