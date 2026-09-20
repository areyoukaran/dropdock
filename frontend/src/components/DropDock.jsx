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
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length) onFilesSelected(files);
          e.target.value = '';
        }}
      />
      <div className="dropzone-icon">
        <svg width="66" height="66" viewBox="0 0 64 64" fill="none">
          <path d="M20 42h-4a12 12 0 0 1-2-23.8A18 18 0 0 1 48 22a11 11 0 0 1-1 22h-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M32 48V25m0 0-9 9m9-9 9 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
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
