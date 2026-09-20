import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DropDock from '../components/DropDock';
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
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() =>
    searchParams.get('mode') === 'text' ? 'text' : 'files',
  );
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
    let retryTimer;

    const checkHealth = async () => {
      try {
        await getHealth();

        if (isCurrent) {
          setServiceError(null);
        }
      } catch {
        if (isCurrent) {
          // Render may be waking from a cold start.
          // Retry instead of permanently showing an error.
          retryTimer = setTimeout(checkHealth, 5000);
        }
      }
    };

    checkHealth();

    return () => {
      isCurrent = false;
      clearTimeout(retryTimer);
    };
  }, []);


  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'files' || requestedMode === 'text') {
      setMode(requestedMode);
    }
  }, [searchParams]);


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

    if (options.password && options.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    // expiryMode can be null in DropOptions' internal state only when both
    // the time and download toggles are off — a state the submit button is
    // already disabled for (see hasExpiry above). Resolving a concrete
    // mode here regardless keeps the payload valid even if that guard is
    // ever loosened later, rather than relying solely on the disabled
    // button as the only thing preventing a null expiry_mode from
    // reaching the API.
    const resolvedExpiryMode =
      options.expiryMode ??
      (options.timeEnabled ? 'time' : options.downloadsEnabled ? 'download_count' : 'time');

    try {
      const timeExpiry =
        resolvedExpiryMode !== 'view_once' && options.timeEnabled
          ? options.timeExpiry
          : null;
      const maxDownloads =
        resolvedExpiryMode !== 'view_once' && options.downloadsEnabled
          ? options.maxDownloads
          : null;
      let drop;
      if (mode === 'files') {
        drop = await createFileDrop(
          {
            files,
            expiryMode: resolvedExpiryMode,
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
          expiryMode: resolvedExpiryMode,
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
    <div id="drop-composer" className="card composer-shell">
      <div className="composer-panel left-panel">
        <div className="panel-heading">
          <h1>Share files, <span>effortlessly.</span></h1>
          <p className="panel-description">Fast. Private. No signup. Files and text that disappear when you’re done.</p>
        </div>
        <div
          className={`mode-tabs${mode === 'text' ? ' mode-tabs-text-active' : ''}`}
          role="tablist"
          aria-label="Drop content type"
        >
          <span className="mode-tab-indicator" aria-hidden="true" />
          <button
            type="button"
            className={mode === 'files' ? 'mode-tab mode-tab-active' : 'mode-tab'}
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
              <DropDock
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
            {isSubmitting ? 'Creating…' : <>Create drop <span className="create-arrow" aria-hidden="true">→</span></>}
          </Button>
        </div>
        <p className="privacy-note"><span className="privacy-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/><path d="M12 14v3"/></svg></span> Private by default. No accounts. No tracking.</p>
      </aside>
    </div>
  );
}