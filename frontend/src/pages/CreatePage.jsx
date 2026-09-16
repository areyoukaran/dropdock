import { lazy, Suspense, useEffect, useState } from 'react';
import DropZone from '../components/DropZone';
import FileList from '../components/FileList';
import DropOptions from '../components/DropOptions';
import ShareResult from '../components/ShareResult';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import {
  createFileDrop,
  createTextDrop,
  getHealth,
  ApiError,
} from '../api/client';

const TextComposer = lazy(() => import('../components/TextComposer'));

const DEFAULT_OPTIONS = {
  expiryMode: 'time',
  timeEnabled: true,
  downloadsEnabled: false,
  timeExpiry: '1d',
  maxDownloads: '',
  password: '',
};

export default function CreatePage() {
  const [mode, setMode] = useState('files'); // "files" | "text"
  const [files, setFiles] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [textLanguage, setTextLanguage] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [serviceError, setServiceError] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    getHealth().catch(() => {
      if (isCurrent) {
        setServiceError(
          "Couldn't reach the service. You can keep preparing your drop and try again shortly.",
        );
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleFilesSelected = (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasContent =
    mode === 'files' ? files.length > 0 : textContent.trim().length > 0;
  const hasExpiry =
    options.expiryMode === 'view_once' ||
    options.timeEnabled ||
    options.downloadsEnabled;
  const canSubmit = hasContent && hasExpiry;

  const handleSubmit = async () => {
    setError(null);

    if (
      options.expiryMode !== 'view_once' &&
      options.timeEnabled &&
      !options.timeExpiry
    ) {
      setError('Choose a time period for this drop.');
      return;
    }

    if (
      options.expiryMode !== 'view_once' &&
      options.downloadsEnabled &&
      (!Number.isInteger(Number(options.maxDownloads)) ||
        Number(options.maxDownloads) < 1)
    ) {
      setError('Enter how many downloads this drop should allow.');
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      const timeExpiry =
        options.expiryMode !== 'view_once' && options.timeEnabled
          ? options.timeExpiry
          : null;
      const maxDownloads =
        options.expiryMode !== 'view_once' && options.downloadsEnabled
          ? options.maxDownloads
          : null;
      let drop;
      if (mode === 'files') {
        drop = await createFileDrop(
          {
            files,
            expiryMode: options.expiryMode,
            timeExpiry,
            maxDownloads,
            password: options.password,
          },
          setProgress,
        );
      } else {
        drop = await createTextDrop({
          textContent,
          textLanguage,
          expiryMode: options.expiryMode,
          timeExpiry,
          maxDownloads,
          password: options.password,
        });
      }
      setResult(drop);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't create the drop. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFiles([]);
    setTextContent('');
    setTextLanguage('');
    setOptions(DEFAULT_OPTIONS);
    setError(null);
    setProgress(0);
  };

  if (result) {
    return (
      <div className="card">
        <ShareResult drop={result} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="card composer-shell">
      <div className="composer-panel left-panel">
        <div className="panel-heading">
          <h1>Share something simply.</h1>
          <span className="privacy-badge">Private by default</span>
        </div>
        <div
          className={`mode-tabs${mode === 'text' ? ' mode-tabs-text-active' : ''}`}
          role="tablist"
          aria-label="Drop content type"
        >
          <span className="mode-tab-indicator" aria-hidden="true" />
          <button
            type="button"
            className={
              mode === 'files' ? 'mode-tab mode-tab-active' : 'mode-tab'
            }
            onClick={() => setMode('files')}
            role="tab"
            aria-selected={mode === 'files'}
          >
            Files
          </button>
          <button
            type="button"
            className={
              mode === 'text' ? 'mode-tab mode-tab-active' : 'mode-tab'
            }
            onClick={() => setMode('text')}
            role="tab"
            aria-selected={mode === 'text'}
          >
            Text
          </button>
        </div>

        <div className="composer-surface">
          {mode === 'files' ? (
            <>
              <DropZone
                onFilesSelected={handleFilesSelected}
                disabled={isSubmitting}
                isEmpty={files.length === 0}
              />
              <FileList files={files} onRemove={handleRemoveFile} />
            </>
          ) : (
            <Suspense fallback={<p className="status-text">Loading editor…</p>}>
              <TextComposer
                value={textContent}
                language={textLanguage}
                onChange={setTextContent}
                onLanguageChange={setTextLanguage}
                disabled={isSubmitting}
              />
            </Suspense>
          )}
        </div>
      </div>

      <aside className="composer-panel right-panel">
        <div className="settings-heading">
          <p className="eyebrow">Drop settings</p>
        </div>
        <DropOptions options={options} onChange={setOptions} />

        {(serviceError || error) && (
          <ErrorBanner>{error || serviceError}</ErrorBanner>
        )}

        {isSubmitting && mode === 'files' && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="submit-row">
          <Button
            full
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating…' : 'Create drop'}
          </Button>
        </div>
      </aside>
    </div>
  );
}
