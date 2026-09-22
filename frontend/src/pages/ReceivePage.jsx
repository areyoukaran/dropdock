import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import CodeMirror from '@uiw/react-codemirror';
import {
  getCodeMirrorExtensions,
  useCodeMirrorTheme,
} from '../utils/codemirror';
import {
  getDropMeta,
  unlockTextDrop,
  unlockFileDrop,
  getDownloadUrl,
  ApiError,
} from '../api/client';
import { copyText } from '../utils/clipboard';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function ReceivePage() {
  const theme = useCodeMirrorTheme();

  const { slug } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [unlockedFiles, setUnlockedFiles] = useState(null);
  const [consumedNotice, setConsumedNotice] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    // oxlint-disable-next-line react(set-state-in-effect)
    setLoading(true);
    setNotFound(false);
    setError(null);
    getDropMeta(slug)
      .then((nextMeta) => {
        if (isCurrent) setMeta(nextMeta);
      })
      .catch((nextError) => {
        if (!isCurrent) return;
        if (nextError instanceof ApiError && nextError.status === 404) {
          setNotFound(true);
        } else {
          setError(
            nextError instanceof ApiError
              ? nextError.message
              : "Couldn't load this drop.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  const handleUnlockText = async () => {
    if (unlocking) return;
    setError(null);
    setUnlocking(true);
    try {
      const content = await unlockTextDrop(slug, password || undefined);
      setTextContent(content);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open this drop.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleUnlockFiles = async () => {
    if (unlocking) return;
    setError(null);
    setUnlocking(true);
    try {
      const files = await unlockFileDrop(slug, password || undefined);
      setUnlockedFiles(files);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open this drop.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownload = async (fileId) => {
    setError(null);
    try {
      const result = await getDownloadUrl(slug, fileId, password || undefined);
      window.location.assign(result.url);
      if (meta.files.length === 1) {
        setConsumedNotice('Download started.');
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't download this file.",
      );
    }
  };

  if (loading) {
    return (
      <div className="card receive-loading-card">
        <div
          className="receive-skeleton"
          role="status"
          aria-label="Loading drop"
        >
          <span className="skeleton-line skeleton-eyebrow" />
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line skeleton-copy" />
          <div className="skeleton-content">
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-short" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="card receive-card">
        <div className="status-block">
          <h2 className="status-title">Drop not found</h2>
          <p className="status-body">
            This link doesn't lead anywhere — it may have been mistyped.
          </p>
        </div>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="card receive-card">
        <ErrorBanner>{error}</ErrorBanner>
      </div>
    );
  }

  if (meta.is_expired) {
    return (
      <div className="card receive-card">
        <div className="status-block">
          <h2 className="status-title">This drop is gone</h2>
          <p className="status-body">
            It has expired, been fully downloaded, or already been viewed.
          </p>
        </div>
      </div>
    );
  }

  const isTextDrop = meta.drop_type === 'text';
  const isFilesUnlocked = unlockedFiles !== null;
  const needsPassword =
    meta.requires_password && !(isTextDrop ? textContent : isFilesUnlocked);
  const showTextUnlock = isTextDrop && !textContent;
  const showFilesUnlock = !isTextDrop && needsPassword;
  // Filenames/sizes come from meta only when the drop has no password; once
  // a password is required, they only ever come from the unlock response —
  // meta.files is intentionally empty for protected drops (see backend).
  const filesToShow = isFilesUnlocked ? unlockedFiles : meta.files;

  return (
    <div className="card receive-card">
      {isTextDrop && (
        <div className="receive-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="var(--color-accent)" />
            <path
              d="M18 16h9l5 5v11a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2Z"
              stroke="var(--color-on-accent)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M27 16v6h5M20 28h8M20 32h5"
              stroke="var(--color-on-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div className="status-block">
        <h2 className="status-title">
          {isTextDrop
            ? 'Shared text'
            : filesToShow.length > 1 || (needsPassword && !isFilesUnlocked)
              ? 'Shared files'
              : 'Shared file'}
        </h2>
      </div>

      {(showTextUnlock || showFilesUnlock) && (
        <div className="unlock-row">
          {needsPassword && (
            <div className="password-field">
              <input
                type={passwordVisible ? 'text' : 'password'}
                className="text-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="password-visibility-toggle"
                onClick={() => setPasswordVisible((v) => !v)}
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={passwordVisible}
              >
                {passwordVisible ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M2 2l14 14M7.5 7.6a2.1 2.1 0 0 0 2.9 2.9M5 4.8C3 6 1.8 7.7 1.3 9c1 2.6 3.9 5.5 7.7 5.5 1.3 0 2.5-.3 3.6-.9M11 3.9c-.6-.2-1.3-.3-2-.3-3.8 0-6.7 2.9-7.7 5.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M1.3 9c1-2.6 3.9-5.5 7.7-5.5S15.7 6.4 16.7 9c-1 2.6-3.9 5.5-7.7 5.5S2.3 11.6 1.3 9Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="9"
                      cy="9"
                      r="2.1"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}

          {isTextDrop ? (
            <Button onClick={handleUnlockText} disabled={unlocking}>
              {unlocking ? 'Opening…' : needsPassword ? 'Unlock' : 'Open text'}
            </Button>
          ) : (
            <Button onClick={handleUnlockFiles} disabled={unlocking}>
              {unlocking ? 'Opening…' : 'Unlock'}
            </Button>
          )}
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isTextDrop && textContent && (
        <div className="received-text">
          <div className="received-text-toolbar">
            <span className="received-text-hint">
              Shared text · select to copy part of it
            </span>
            <button
              type="button"
              className="received-copy-btn"
              onClick={async () => {
                try {
                  const copiedSuccessfully = await copyText(
                    textContent.text_content,
                  );
                  if (!copiedSuccessfully) throw new Error('copy failed');
                  setTextCopied(true);
                  window.setTimeout(() => setTextCopied(false), 1600);
                } catch {
                  setError("Couldn't copy the text.");
                }
              }}
            >
              {textCopied ? 'Copied' : 'Copy all'}
            </button>
          </div>
          <CodeMirror
            className="code-mirror-surface received-code-editor"
            value={textContent.text_content}
            extensions={getCodeMirrorExtensions(
              textContent.text_language,
              false,
            )}
            theme={theme}
            basicSetup
            editable={false}
            readOnly
            height="240px"
          />
        </div>
      )}

      {!isTextDrop && !needsPassword && (
        <ul className="download-list">
          {filesToShow.map((file) => (
            <li key={file.id} className="download-row">
              <div className="download-row-meta">
                <span className="file-row-name">{file.original_filename}</span>
                <span className="file-row-size">
                  {formatBytes(file.size_bytes)}
                </span>
              </div>
              <Button size="sm" onClick={() => handleDownload(file.id)}>
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}

      {consumedNotice && <p className="status-note">{consumedNotice}</p>}
    </div>
  );
}
