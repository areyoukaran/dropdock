import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {
  getCodeMirrorExtensions,
  useCodeMirrorTheme,
} from '../utils/codemirror';
import { detectLanguage } from '../utils/detectLanguage';
import './TextComposer.css';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

const AUTO = 'auto';

function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      className={`settings-switch${checked ? ' is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

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

  // Syntax highlighting is "on" whenever a real language or auto-detect is
  // selected; it's "off" (plain text) when language is ''.
  const [syntaxEnabled, setSyntaxEnabled] = useState(language !== '');
  // Remember the last non-empty selection so re-enabling the switch
  // restores it instead of defaulting back to auto every time.
  const [lastSelection, setLastSelection] = useState(
    language !== '' ? language : AUTO,
  );

  const detectedLanguage = useMemo(
    () => (syntaxEnabled && language === AUTO ? detectLanguage(value) : ''),
    [syntaxEnabled, language, value],
  );

  // The language actually handed to CodeMirror/highlighting: resolve
  // 'auto' down to a concrete guess (or plain text if nothing matches).
  const effectiveLanguage = syntaxEnabled
    ? language === AUTO
      ? detectedLanguage
      : language
    : '';

  const handleSyntaxToggle = (enabled) => {
    setSyntaxEnabled(enabled);
    onLanguageChange(enabled ? lastSelection : '');
  };

  const handleLanguageSelect = (nextValue) => {
    setLastSelection(nextValue);
    onLanguageChange(nextValue);
  };

  const languageLabel = !syntaxEnabled
    ? 'Plain text'
    : language === AUTO
      ? detectedLanguage
        ? `Auto · ${LANGUAGES.find((option) => option.value === detectedLanguage)?.label}`
        : 'Auto-detect'
      : (LANGUAGES.find((option) => option.value === language)?.label ??
        'Plain text');

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
          extensions={getCodeMirrorExtensions(effectiveLanguage)}
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
      <div className="text-composer-syntax-row">
        <Switch
          checked={syntaxEnabled}
          onChange={handleSyntaxToggle}
          label="Syntax highlighting"
          disabled={disabled}
        />
        <span className="text-composer-syntax-label">Syntax highlighting</span>

        {syntaxEnabled && (
          <select
            className="text-composer-lang"
            value={language}
            onChange={(e) => handleLanguageSelect(e.target.value)}
            disabled={disabled}
          >
            <option value={AUTO}>Auto-detect</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>

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
                <Switch
                  checked={syntaxEnabled}
                  onChange={handleSyntaxToggle}
                  label="Syntax highlighting"
                  disabled={disabled}
                />
                {syntaxEnabled && (
                  <select
                    className="text-composer-lang editor-modal-language"
                    value={language}
                    onChange={(event) => handleLanguageSelect(event.target.value)}
                    disabled={disabled}
                    aria-label="Language"
                  >
                    <option value={AUTO}>Auto-detect</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                )}
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
              extensions={getCodeMirrorExtensions(effectiveLanguage)}
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
