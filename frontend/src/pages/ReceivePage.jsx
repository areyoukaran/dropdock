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
  getDownloadUrl,
  ApiError,
} from '../api/client';

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
  const [error, setError] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [consumedNotice, setConsumedNotice] = useState(null);

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
    setError(null);
    try {
      const content = await unlockTextDrop(slug, password || undefined);
      setTextContent(content);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open this drop.");
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
      <div className="card">
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
      <div className="card">
        <ErrorBanner>{error}</ErrorBanner>
      </div>
    );
  }

  if (meta.is_expired) {
    return (
      <div className="card">
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
  const needsPassword = meta.requires_password && !textContent;
  const showTextUnlock = isTextDrop && !textContent;

  return (
    <div className="card">
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
            : meta.files.length > 1
              ? 'Shared files'
              : 'Shared file'}
        </h2>
      </div>

      {showTextUnlock && (
        <div className="unlock-row">
          {needsPassword && (
            <input
              type="password"
              className="text-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          )}

          {isTextDrop ? (
            <Button onClick={handleUnlockText}>
              {needsPassword ? 'Unlock' : 'Open text'}
            </Button>
          ) : (
            <p className="status-body">
              Enter the password, then tap a file below to download it.
            </p>
          )}
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isTextDrop && textContent && (
        <div className="received-text">
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

      {!isTextDrop && (!needsPassword || meta.requires_password) && (
        <ul className="download-list">
          {meta.files.map((file) => (
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
