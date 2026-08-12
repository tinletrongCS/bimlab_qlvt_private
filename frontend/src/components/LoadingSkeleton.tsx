type LoadingSkeletonProps = {
  variant?: "app" | "content" | "login";
};

function Lines({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="skeleton-line" />
      ))}
    </>
  );
}

export function LoadingSkeleton({ variant = "app" }: LoadingSkeletonProps) {
  if (variant === "login") {
    return (
      <main className="login-shell">
        <section className="login-blueprint">
          <div className="login-radial" />
          <div className="skeleton-login-card">
            <span className="skeleton-logo" />
            <span className="skeleton-line short" />
            <span className="skeleton-button" />
            <div className="skeleton-note">
              <span />
              <span />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const content = (
    <div className="skeleton-content" aria-busy="true" aria-live="polite">
      <div className="skeleton-hero">
        <div>
          <span className="skeleton-line eyebrow-line" />
          <span className="skeleton-line title-line" />
          <Lines count={2} />
        </div>
        <span className="skeleton-metric" />
      </div>
      <div className="skeleton-stats">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-stat">
            <span />
            <strong />
          </div>
        ))}
      </div>
      <div className="skeleton-panel">
        <span className="skeleton-line panel-title-line" />
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="skeleton-row" />
        ))}
      </div>
    </div>
  );

  if (variant === "content") return content;

  return (
    <main className="app-shell skeleton-shell">
      <aside className="sidebar skeleton-sidebar">
        <span className="skeleton-logo" />
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className="skeleton-nav-item" />
        ))}
        <span className="skeleton-user" />
      </aside>
      <section className="content">{content}</section>
    </main>
  );
}
