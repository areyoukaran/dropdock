import { Link } from 'react-router-dom';

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3.1-5 8.5-5 8.5 5 8.5 5-3.1 5-8.5 5-8.5-5-8.5-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M5.5 20c.7-3.6 3-5.5 6.5-5.5s5.8 1.9 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrivacyPage() {
  return (
    <section className="info-page">

      <header className="info-hero">

        <span className="info-eyebrow">
          PRIVACY
        </span>

        <h1>
          Private by
          <br />
          <span>default.</span>
        </h1>

        <p>
          DropDock is designed around temporary
          sharing, minimal data collection, and no
          account requirement.
        </p>
      </header>

      <div className="info-sections">

        <section className="info-feature">
          <div className="info-feature-index">
            01
          </div>

          <div className="info-feature-icon">
            <IconUser />
          </div>

          <div className="info-feature-content">
            <h2>No accounts</h2>

            <p>
              DropDock does not require an account to
              create or access a drop. There is no profile
              or personal dashboard to maintain.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">
            02
          </div>

          <div className="info-feature-icon">
            <IconClock />
          </div>

          <div className="info-feature-content">
            <h2>Temporary access</h2>

            <p>
              Drops can expire automatically based on
              the limits selected when they are created.
              Download limits and view-once access can
              further restrict availability.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">
            03
          </div>

          <div className="info-feature-icon">
            <IconLock />
          </div>

          <div className="info-feature-content">
            <h2>Password protection</h2>

            <p>
              A drop can optionally be protected with a
              password. Protected content requires the
              correct password before access is granted.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">
            04
          </div>

          <div className="info-feature-icon">
            <IconEye />
          </div>

          <div className="info-feature-content">
            <h2>Minimal by default</h2>

            <p>
              DropDock does not require an advertising
              profile or account to use the service.
              Drops are designed around temporary access
              rather than permanent storage.
            </p>
          </div>
        </section>

      </div>

      <div className="info-bottom">
        <span>
          Private by default.
        </span>

        <Link to="/">
          Back to DropDock
          <span aria-hidden="true">→</span>
        </Link>
      </div>

    </section>
  );
}

export default PrivacyPage;