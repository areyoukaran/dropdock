import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './ShareResult.css';

function expiryLabel(drop) {
  if (drop.expiry_mode === 'time' && drop.expires_at) {
    const date = new Date(drop.expires_at);
    return `Expires ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(
      undefined,
      { hour: 'numeric', minute: '2-digit' },
    )}`;
  }
  if (drop.expiry_mode === 'download_count') {
    return `Expires after ${drop.max_downloads} download${drop.max_downloads === 1 ? '' : 's'}`;
  }
  if (drop.expiry_mode === 'view_once') {
    return "Disappears after it's viewed once";
  }
  return null;
}

export default function ShareResult({ drop, onReset }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(drop.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="share-result">
      <div className="share-check">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="var(--color-success)" />
          <path
            d="M8 14.5l4 4 8-9"
            stroke="var(--color-on-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="share-title">Your drop is ready</h2>
      {expiryLabel(drop) && <p className="share-expiry">{expiryLabel(drop)}</p>}

      <div className="share-qr">
        <QRCodeSVG
          value={drop.share_url}
          size={148}
          bgColor="transparent"
          fgColor="var(--color-ink)"
        />
      </div>

      <div className="share-link-row">
        <input
          readOnly
          className="share-link-input"
          value={drop.share_url}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="share-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {drop.has_password && (
        <p className="share-note">Password protected — share it separately.</p>
      )}

      <button type="button" className="share-reset" onClick={onReset}>
        Create another drop
      </button>
    </div>
  );
}
