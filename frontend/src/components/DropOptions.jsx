import './DropOptions.css';

const TIME_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
];

export default function DropOptions({ options, onChange }) {
  const {
    expiryMode,
    timeExpiry,
    maxDownloads,
    password,
    timeEnabled: storedTimeEnabled,
    downloadsEnabled: storedDownloadsEnabled,
  } = options;
  const isViewOnce = expiryMode === 'view_once';
  const timeEnabled = storedTimeEnabled ?? expiryMode === 'time';
  const downloadsEnabled =
    storedDownloadsEnabled ?? expiryMode === 'download_count';

  const updateOptions = (changes) => onChange({ ...options, ...changes });

  const setTimeEnabled = (enabled) => {
    updateOptions({
      timeEnabled: enabled,
      expiryMode: enabled
        ? 'time'
        : downloadsEnabled
          ? 'download_count'
          : 'time',
    });
  };

  const setDownloadsEnabled = (enabled) => {
    updateOptions({
      downloadsEnabled: enabled,
      expiryMode: enabled ? 'download_count' : timeEnabled ? 'time' : 'time',
    });
  };

  const setViewOnce = (enabled) => {
    updateOptions({
      expiryMode: enabled
        ? 'view_once'
        : timeEnabled
          ? 'time'
          : downloadsEnabled
            ? 'download_count'
            : 'time',
    });
  };

  const timeLabel =
    TIME_OPTIONS.find((option) => option.value === timeExpiry)?.label ??
    'a time period';
  const downloadLabel = maxDownloads
    ? `after ${maxDownloads} download${maxDownloads === '1' ? '' : 's'}`
    : 'after downloads';
  const summary = isViewOnce
    ? "Disappears after it's viewed once"
    : timeEnabled && downloadsEnabled
      ? `Expires in ${timeLabel} or ${downloadLabel}, whichever comes first`
      : timeEnabled
        ? `Expires in ${timeLabel}`
        : downloadsEnabled
          ? `Expires ${downloadLabel}`
          : 'No expiry set';

  return (
    <div className="drop-options">
      <div className={`expiry-controls${isViewOnce ? ' is-disabled' : ''}`}>
        <label className="option-toggle">
          <input
            type="checkbox"
            checked={!isViewOnce && timeEnabled}
            disabled={isViewOnce}
            onChange={(event) => setTimeEnabled(event.target.checked)}
          />
          <span className="checkbox-box" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8 3 3 7-7"
                stroke="var(--color-on-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Expire after a time period</span>
        </label>

        {!isViewOnce && timeEnabled && (
          <div className="pill-row">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  timeExpiry === option.value ? 'pill pill-active' : 'pill'
                }
                onClick={() => updateOptions({ timeExpiry: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <label className="option-toggle">
          <input
            type="checkbox"
            checked={!isViewOnce && downloadsEnabled}
            disabled={isViewOnce}
            onChange={(event) => setDownloadsEnabled(event.target.checked)}
          />
          <span className="checkbox-box" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8 3 3 7-7"
                stroke="var(--color-on-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Expire after N downloads</span>
        </label>

        <div
          className={`downloads-input-reveal${!isViewOnce && downloadsEnabled ? ' is-visible' : ''}`}
          aria-hidden={isViewOnce || !downloadsEnabled}
        >
          <div className="downloads-input-inner">
            <input
              id="max-downloads"
              type="number"
              min={1}
              max={1000}
              className="text-input"
              value={maxDownloads}
              disabled={isViewOnce || !downloadsEnabled}
              onChange={(event) =>
                updateOptions({ maxDownloads: event.target.value })
              }
              placeholder="5"
            />
          </div>
        </div>
      </div>

      <label className={`view-once-toggle${isViewOnce ? ' is-selected' : ''}`}>
        <input
          type="checkbox"
          checked={isViewOnce}
          onChange={(event) => setViewOnce(event.target.checked)}
        />
        <span className="checkbox-box" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8 3 3 7-7"
              stroke="var(--color-on-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>View once</span>
      </label>

      <p
        className={`expiry-summary${!isViewOnce && !timeEnabled && !downloadsEnabled ? ' is-warning' : ''}`}
      >
        {summary}
      </p>

      <div className="option-group password-group">
        <label className="option-label" htmlFor="drop-password">
          Password <span className="option-optional">(optional)</span>
        </label>
        <input
          id="drop-password"
          type="password"
          className="text-input"
          value={password}
          onChange={(event) => updateOptions({ password: event.target.value })}
          placeholder="Add a password"
          autoComplete="new-password"
          minLength={4}
        />
        {password && password.length > 0 && password.length < 4 && (
          <p className="password-hint">At least 4 characters</p>
        )}
      </div>
    </div>
  );
}
