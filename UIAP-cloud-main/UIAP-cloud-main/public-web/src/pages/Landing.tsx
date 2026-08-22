import React from 'react';

export function Landing() {
  return (
    <>
      {/* Background Glowing Orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>
      <div className="glow-orb glow-orb-3"></div>

      <div className="landing-page">
        <section className="hero">
          <h1>Universal Intelligent Application Platform</h1>
          <p className="subtitle">The definitive Local-First biometric attendance solution and multi-tenant SaaS application platform for your organization.</p>
          <div className="hero-cta">
            <a href="/register" className="btn-primary">Get Started Free</a>
            <a href="/download" className="btn-ghost">Download UIAP Edge</a>
          </div>
        </section>

        <section className="features">
          {/* Main Large Card */}
          <div className="feature-card">
            <div>
              <div className="feature-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3>Multi-Tenant SaaS Power</h3>
              <p>UIAP Cloud acts as the central command for all your organizations. Manage subscriptions, modules, devices, and global settings from a single, beautiful developer portal.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h3>Local-First Edge</h3>
            <p>Designed for organizations with intermittent internet. Fully operates offline using R307 fingerprint scanners through the UIAP Edge Windows application.</p>
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
            <p>Install only what you need. Extend functionality with signed ZIP modules tailored to your specific organizational requirements.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>College Management</h3>
            <p>Built-in biometric attendance bundle with student, teacher, and department tracking. Complete local records with manual overrides.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Enterprise Security</h3>
            <p>Data stays on your local PostgreSQL database. Cloud connection is only required for license verification and module updates.</p>
          </div>
        </section>
      </div>
    </>
  );
}
