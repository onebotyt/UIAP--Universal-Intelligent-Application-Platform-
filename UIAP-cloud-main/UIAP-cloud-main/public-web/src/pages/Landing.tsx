import React from 'react';

export function Landing() {
  return (
    <div className="landing-page">
      <section className="hero">
        <h1>Unified Identity & Attendance Platform</h1>
        <p className="subtitle">The definitive Local-First biometric attendance solution for your organization.</p>
        <div className="hero-cta">
          <a href="/register" className="btn-primary">Get Started Free</a>
          <a href="/download" className="btn-ghost">Download UIAP Edge</a>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <h3>Developer Cloud</h3>
          <p>Centrally manage your modules, plans, and organization setup with our easy-to-use developer portal.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h3>Local-First Edge</h3>
          <p>Designed for organizations with intermittent internet. Fully operates offline using R307 fingerprint scanners.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <h3>Modular Architecture</h3>
          <p>Install only what you need. From College Management to simple employee check-ins.</p>
        </div>
      </section>
    </div>
  );
}
