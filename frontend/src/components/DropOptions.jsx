import './DropOptions.css';
import ErrorBanner from './ErrorBanner';

const TIME_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
];

function IconClock() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}
function IconDownload() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 17v3h16v-3"/></svg>;
}
function IconEye() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>;
}
function IconLock() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>;
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`settings-switch${checked ? ' is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function DropOptions({ options, onChange, passwordError }) {
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
  const downloadsEnabled = storedDownloadsEnabled ?? expiryMode === 'download_count';

  const updateOptions = (changes) => onChange({ ...options, ...changes });

 const setTimeEnabled = (enabled) => {
    updateOptions({
      timeEnabled: enabled,
    });
  };

  const setDownloadsEnabled = (enabled) => {
    updateOptions({
      downloadsEnabled: enabled,
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

  return (
    <div className="drop-options">
      <section className="settings-section expiration-section">
        <div className="setting-intro">
          <span className="setting-icon"><IconClock /></span>
          <div>
            <div className="setting-title">Expiration</div>
            <div className="setting-description">Files will be automatically deleted</div>
          </div>
        </div>
        <div className="pill-row">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`pill${timeExpiry === option.value && !isViewOnce ? ' pill-active' : ''}`}
              disabled={isViewOnce}
              onClick={() => updateOptions({ timeExpiry: option.value, timeEnabled: true })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="download-limit-section">
        <section className="setting-row">
          <span className="setting-icon"><IconDownload /></span>

          <div className="setting-copy">
            <div className="setting-title">Limit downloads</div>
            <div className="setting-description">
              Set a maximum number of downloads
            </div>
          </div>

          <Switch
            checked={!isViewOnce && downloadsEnabled}
            onChange={setDownloadsEnabled}
            label="Limit downloads"
          />
        </section>

        {downloadsEnabled && !isViewOnce && (
          <div className="download-limit-input">
            <input
              id="max-downloads"
              type="number"
              min={1}
              max={1000}
              value={maxDownloads}
              onChange={(event) =>
                updateOptions({ maxDownloads: event.target.value })
              }
              placeholder="5"
              aria-label="Maximum downloads"
            />
          </div>
        )}
      </div>

      <section className="setting-row view-once-section">
        <span className="setting-icon"><IconEye /></span>
        <div className="setting-copy">
          <div className="setting-title">View once</div>
          <div className="setting-description">File can only be viewed one time</div>
        </div>
        <Switch checked={isViewOnce} onChange={setViewOnce} label="View once" />
      </section>

      <section className="settings-section password-setting">
        <div className="setting-intro">
          <span className="setting-icon"><IconLock /></span>
          <div className="setting-copy">
            <div className="setting-title">
              Password <span className="option-optional">(optional)</span>
            </div>
            <div className="setting-description">
              Add a password to restrict access
            </div>
          </div>
        </div>

        <input
          id="drop-password"
          type="password"
          className="password-input"
          value={password}
          onChange={(event) => updateOptions({ password: event.target.value })}
          placeholder="Enter a password"
          autoComplete="new-password"
          minLength={4}
          aria-invalid={passwordError ? 'true' : 'false'}
        />

        {passwordError && (
          <ErrorBanner>{passwordError}</ErrorBanner>
        )}
      </section>
    </div>
  );
}