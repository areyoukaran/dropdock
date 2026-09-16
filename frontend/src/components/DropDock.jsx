import { useCallback, useRef, useState } from 'react';
import './DropDock.css';

export default function DropDock({ onFilesSelected, disabled, isEmpty }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFilesSelected(files);
    },
    [onFilesSelected, disabled],
  );

  const handlePaste = useCallback(
    (e) => {
      if (disabled) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) onFilesSelected([file]);
      }
    },
    [onFilesSelected, disabled],
  );

  return (
    <div
      className={`dropzone${isEmpty ? ' dropzone-idle' : ''}${isDragOver ? ' dropzone-active' : ''}${disabled ? ' dropzone-disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        inputRef.current?.click();
      }}
      tabIndex={0}
      role="button"
      aria-disabled={disabled}
      aria-label="Upload files by dropping, pasting, or clicking to browse"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length) onFilesSelected(files);
          e.target.value = '';
        }}
      />
      <div className="dropzone-icon">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 6v20M20 6l-7 7M20 6l7 7"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
            transform="translate(1 1)"
          />
          <path
            d="M20 6v20M20 6l-7 7M20 6l7 7"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 27v3a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3v-3"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="dropzone-title">Drop files here</p>
      <p className="dropzone-subtitle">Drag and drop, or click to browse</p>
      <p className="dropzone-hint">
        Paste an image directly from your clipboard
      </p>
    </div>
  );
}
