import { useEffect, useMemo } from 'react';
import './FileList.css';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function isImage(file) {
  return file.type.startsWith('image/');
}

export default function FileList({ files, onRemove }) {
  const imageUrls = useMemo(() => {
    const urls = new Map();
    files.forEach((file, index) => {
      if (isImage(file)) urls.set(index, URL.createObjectURL(file));
    });
    return urls;
  }, [files]);

  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  if (!files.length) return null;

  return (
    <ul className="file-list">
      {files.map((file, i) => (
        <li key={`${file.name}-${i}`} className="file-row">
          <div className="file-row-icon">
            {isImage(file) ? (
              <img src={imageUrls.get(i)} alt="" className="file-thumb" />
            ) : (
              <div className="file-generic-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 2h6l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 2v4h4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="file-row-meta">
            <span className="file-row-name" title={file.name}>{file.name}</span>
            <span className="file-row-size">{formatBytes(file.size)}</span>
          </div>
          <button
            type="button"
            className="file-row-remove"
            onClick={() => onRemove(i)}
            aria-label={`Remove ${file.name}`}
            title="Remove file"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
