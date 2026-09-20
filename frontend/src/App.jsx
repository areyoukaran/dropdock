import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import './App.css';

const ReceivePage = lazy(() => import('./pages/ReceivePage'));

function IconSun() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ThemeToggle({ theme, setTheme }) {
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme(nextTheme)}
    >
      <span className="theme-sun"><IconSun /></span>
      <span className={`theme-track ${theme === 'dark' ? 'is-dark' : ''}`} aria-hidden="true">
        <span className="theme-knob" />
      </span>
    </button>
  );
}

function Header({ theme, setTheme }) {
  return (
    <header className="app-header">
      <Link to="/" className="brand" aria-label="DropDock home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 36 44" fill="none">
            <path d="M18 2C18 2 4 18.2 4 27.7 4 35.8 10.2 42 18 42s14-6.2 14-14.3C32 18.2 18 2 18 2Z" fill="currentColor"/>
            <path d="M18 18.2c-3.4 4.1-5.1 7.1-5.1 9.7 0 3.2 2.3 5.7 5.1 5.7s5.1-2.5 5.1-5.7c0-2.6-1.7-5.6-5.1-9.7Z" fill="var(--color-bg)"/>
          </svg>
        </span>
        <span className="brand-word">DropDock</span>
      </Link>

      <div className="header-right">
        <a href="#about">About</a>
        <a href="#privacy">Privacy</a>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer id="about" className="app-footer">
      <div className="footer-wave" aria-hidden="true">
        <svg viewBox="0 0 1536 170" preserveAspectRatio="none">
          <path d="M0 45C155 0 220 92 390 52c161-38 244-4 379 34 155 43 245-34 379-12 149 25 210 78 388 14v82H0Z" fill="var(--wave-1)"/>
          <path d="M0 93c166-43 261 32 411 2 164-33 226-3 370 28 155 34 238-38 385-13 145 25 212 67 370 5v55H0Z" fill="var(--wave-2)"/>
          <path d="M0 121c145-40 262 13 400 3 161-12 257 15 381 27 163 16 255-37 395-17 151 21 205 47 360 5v31H0Z" fill="var(--wave-3)"/>
        </svg>
      </div>
      <div className="footer-links">
        <a href="#about">About</a>
        <a id="privacy" href="#privacy">Privacy</a>
      </div>
    </footer>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem('dropdock-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const handleSetTheme = (nextTheme) => {
    setTheme(nextTheme);
    window.localStorage.setItem('dropdock-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header theme={theme} setTheme={handleSetTheme} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<CreatePage />} />
            <Route
              path="/d/:slug"
              element={
                <Suspense fallback={<p className="status-text">Loading drop…</p>}>
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
