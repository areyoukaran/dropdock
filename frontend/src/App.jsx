import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import './App.css';

const ReceivePage = lazy(() => import('./pages/ReceivePage'));

function Header({ theme, setTheme }) {
  return (
    <header className="app-header">
      <div className="top-bar">
        <Link to="/" className="brand">
          DropDock
        </Link>

        <div className="theme-toggle" aria-label="Theme switcher">
          <button
            type="button"
            className={
              theme === 'light' ? 'theme-option segment-active' : 'theme-option'
            }
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={
              theme === 'dark' ? 'theme-option segment-active' : 'theme-option'
            }
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <p>No signup. Links expire on their own.</p>
    </footer>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem('dropzone-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const handleSetTheme = (nextTheme) => {
    setTheme(nextTheme);
    window.localStorage.setItem('dropzone-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell" data-theme={theme}>
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
