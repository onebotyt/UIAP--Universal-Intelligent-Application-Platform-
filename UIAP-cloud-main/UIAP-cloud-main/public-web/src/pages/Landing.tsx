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
          <div className="feature-icon">☁️</div>
          <h3>Developer Cloud</h3>
          <p>Centrally manage your modules, plans, and organization setup with our easy-to-use developer portal.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Local-First Edge</h3>
          <p>Designed for organizations with intermittent internet. Fully operates offline using R307 fingerprint scanners.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📦</div>
          <h3>Modular Architecture</h3>
          <p>Install only what you need. From College Management to simple employee check-ins.</p>
        </div>
      </section>
    </div>
  );
}
