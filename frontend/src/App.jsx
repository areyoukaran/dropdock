import { lazy, Suspense, useEffect,useLayoutEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation} from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import './App.css';

const ReceivePage = lazy(() => import('./pages/ReceivePage'));

function IconSun() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.5 15.1A8.7 8.7 0 0 1 8.9 3.5a8.8 8.8 0 1 0 11.6 11.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className={`theme-switch ${
        theme === 'dark' ? 'is-dark' : 'is-light'
      }`}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      onClick={onToggle}
    >
      <span className="theme-option theme-option-sun">
        <IconSun />
      </span>

      <span className="theme-option theme-option-moon">
        <IconMoon />
      </span>

      <span className="theme-knob" aria-hidden="true">
        {theme === 'dark' ? <IconMoon /> : <IconSun />}
      </span>
    </button>
  );
}

function Header({ theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <Link
        to="/"
        className="brand"
        aria-label="DropDock home"
      >
        <span className="brand-mark" aria-hidden="true">
          <svg
            viewBox="0 0 36 44"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 2
                C18 2 4 18.2 4 27.7
                C4 35.8 10.2 42 18 42
                C25.8 42 32 35.8 32 27.7
                C32 18.2 18 2 18 2Z"
              fill="currentColor"
            />

            <path
              d="M18 18.2
                C14.6 22.3 12.9 25.3 12.9 27.9
                C12.9 31.1 15.2 33.6 18 33.6
                C20.8 33.6 23.1 31.1 23.1 27.9
                C23.1 25.3 21.4 22.3 18 18.2Z"
              fill="var(--color-bg)"
            />
          </svg>
        </span>

        <span className="brand-word">
          DropDock
        </span>
      </Link>

      <div className="header-right">
        <Link className="header-page-link" to="/about">
          About
        </Link>

        <Link className="header-page-link" to="/privacy">
          Privacy
        </Link>

        <ThemeToggle
          theme={theme}
          onToggle={onToggleTheme}
        />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-wave" aria-hidden="true">
        <svg
          viewBox="0 0 1536 170"
          preserveAspectRatio="none"
        >
          <path
            d="M0 45C155 0 220 92 390 52c161-38 244-4 379 34 155 43 245-34 379-12 149 25 210 78 388 14v82H0Z"
            fill="var(--wave-1)"
          />

          <path
            d="M0 93c166-43 261 32 411 2 164-33 226-3 370 28 155 34 238-38 385-13 145 25 212 67 370 5v55H0Z"
            fill="var(--wave-2)"
          />

          <path
            d="M0 121c145-40 262 13 400 3 161-12 257 15 381 27 163 16 255-37 395-17 151 21 205 47 360 5v31H0Z"
            fill="var(--wave-3)"
          />
        </svg>
      </div>

      <div className="footer-links">
        <Link to="/about">About</Link>

        <Link to="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const main = document.querySelector('.app-main');

      if (main) {
        main.scrollTop = 0;
        main.scrollLeft = 0;
      }
    };

    resetScroll();

    const frame = requestAnimationFrame(() => {
      resetScroll();

      requestAnimationFrame(() => {
        resetScroll();
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme =
      window.localStorage.getItem('dropdock-theme');

    if (
      storedTheme === 'light' ||
      storedTheme === 'dark'
    ) {
      return storedTheme;
    }

    return window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
      ? 'dark'
      : 'light';
  });

  const handleSetTheme = (event) => {
    const nextTheme =
      theme === 'light' ? 'dark' : 'light';

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

    const applyTheme = () => {
      setTheme(nextTheme);

      window.localStorage.setItem(
        'dropdock-theme',
        nextTheme,
      );
    };

    if (
      reducedMotion ||
      !document.startViewTransition
    ) {
      applyTheme();
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      rect.left + rect.width / 2;

    const y =
      rect.top + rect.height / 2;

    const transition =
      document.startViewTransition(
        applyTheme,
      );

    transition.ready.then(() => {
      const maxX = Math.max(
        x,
        window.innerWidth - x,
      );

      const maxY = Math.max(
        y,
        window.innerHeight - y,
      );

      const radius = Math.hypot(
        maxX,
        maxY,
      );

      document.documentElement.animate(
        [
          {
            clipPath: `circle(
              0px at ${x}px ${y}px
            )`,
          },
          {
            clipPath: `circle(
              ${radius}px at ${x}px ${y}px
            )`,
          },
        ],
        {
          duration: 500,

          easing:
            'cubic-bezier(0.22, 0.61, 0.36, 1)',

          fill: 'both',

          pseudoElement:
            '::view-transition-new(root)',
        },
      );
    });
  };

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    const color =
      getComputedStyle(
        document.documentElement,
      )
        .getPropertyValue(
          '--color-bg',
        )
        .trim();

    document
      .querySelector(
        'meta[name="theme-color"]',
      )
      ?.setAttribute(
        'content',
        color,
      );
  }, [theme]);

  return (
    <BrowserRouter>
      <ScrollToTop />

      <div className="app-shell">

        <Header
          theme={theme}
          onToggleTheme={handleSetTheme}
        />

        <main className="app-main">
          <Routes>

            <Route
              path="/"
              element={<CreatePage />}
            />

            <Route
              path="/about"
              element={<AboutPage />}
            />

            <Route
              path="/privacy"
              element={<PrivacyPage />}
            />

            <Route
              path="/d/:slug"
              element={
                <Suspense
                  fallback={
                    <p className="status-text">
                      Loading drop…
                    </p>
                  }
                >
                  <ReceivePage />
                </Suspense>
              }
            />

          </Routes>
        </main>

        <Footer />

      </div>
    </BrowserRouter>
  );
}