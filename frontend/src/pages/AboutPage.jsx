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
          DROPDOCK FAQ
        </span>

        <h1>
          Common questions,
          <br />
          <span>simple answers.</span>
        </h1>

        <p>
          Everything you need to know about sharing
          files and text with DropDock.
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
            <h2>What is DropDock?</h2>

            <p>
              DropDock lets you share files or text through
              a temporary link. No account is needed, and
              shared content is designed to disappear.
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
            <h2>How long does a drop stay available?</h2>

            <p>
              You choose an expiration time when you create
              it. You can also use a download limit or
              view-once access for more control.
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
            <h2>How many files can I upload?</h2>

            <p>
              A drop can contain up to 5 files. Each file
              can be up to 50 MB, and the complete drop can
              be up to 100 MB.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">04</div>
          <div className="info-feature-icon"><IconControl /></div>
          <div className="info-feature-content">
            <h2>Can I protect a drop with a password?</h2>
            <p>
              Yes. Add a password before creating the drop.
              Anyone opening the link will need that password
              before they can view or download the content.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">05</div>
          <div className="info-feature-icon"><IconDrop /></div>
          <div className="info-feature-content">
            <h2>Can I download all files at once?</h2>
            <p>
              Yes. Multi-file drops include a Download ZIP
              option, so you can save the available files
              together in one archive.
            </p>
          </div>
        </section>

        <section className="info-feature">
          <div className="info-feature-index">06</div>
          <div className="info-feature-icon"><IconUser /></div>
          <div className="info-feature-content">
            <h2>Does DropDock keep my files forever?</h2>
            <p>
              No. Drops are temporary. They become unavailable
              after their expiry time, download limit, or
              view-once access has been used.
            </p>
          </div>
        </section>

      </div>

      <div className="info-bottom">
        <span>
          Share simply. Keep control.
        </span>

        <Link to="/">
          Back to DropDock <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}