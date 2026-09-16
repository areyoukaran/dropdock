export default function ErrorBanner({ children }) {
  return (
    <div className="form-error" role="alert">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2.25 14 13H2L8 2.25Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 5.75v3.5M8 11.25h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}
