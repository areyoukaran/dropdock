import { Link } from 'react-router-dom';

function IconDrop() {
  return (
    <svg viewBox="0 0 24 28" fill="none" aria-hidden="true">
      <path
        d="M12 1.5S3.5 11.4 3.5 17.3C3.5 22.4 7.3 26 12 26s8.5-3.6 8.5-8.7C20.5 11.4 12 1.5 12 1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 12.2c-1.8 2.2-2.7 3.8-2.7 5.1 0 1.7 1.2 3 2.7 3s2.7-1.3 2.7-3c0-1.3-.9-2.9-2.7-5.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconControl() {
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
        d="M12 7v5l3.2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export default function AboutPage() {
  return (
    <section className="info-page">
      <header className="info-hero">

        <span className="info-eyebrow">
          ABOUT DROPDOCK
        </span>

        <h1>
          Share files,
          <br />
          <span>don't store them.</span>
        </h1>

        <p>
          DropDock is built for temporary sharing.
          Send files or text through a link without
          creating an account or leaving them around
          forever.
        </p>
      </header>

      <div className="info-sections">

        <section className="info-feature">
          <div className="info-feature-index">
            01
          </div>

          <div className="info-feature-icon">
            <IconControl />
          </div>

          <div className="info-feature-content">
            <h2>Temporary by design</h2>

            <p>
              Create a drop, share the link, and let it
              disappear when its job is done. Set an
              expiration time or limit how many times it
              can be accessed.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">
            02
          </div>

          <div className="info-feature-icon">
            <IconDrop />
          </div>

          <div className="info-feature-content">
            <h2>Control the drop</h2>

            <p>
              Choose expiration, download limits,
              view-once access, or add a password when
              you need an extra layer of control.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">
            03
          </div>

          <div className="info-feature-icon">
            <IconUser />
          </div>

          <div className="info-feature-content">
            <h2>No account required</h2>

            <p>
              No profile. No signup. No dashboard.
              Create a drop, share the link, and you're
              done.
            </p>
          </div>
        </section>

      </div>

      <div className="info-bottom">
        <span>
          Share. Don't store.
        </span>

        <Link to="/">
          Back to DropDock <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}