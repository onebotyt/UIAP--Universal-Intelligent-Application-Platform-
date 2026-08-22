import React from 'react';

export function Landing() {
  return (
    <>
      <div className="landing-page-jira">
        {/* White Hero Section */}
        <section className="jira-hero">
          <div className="jira-hero-content">
            <h1>Turn plans into agent-ready tasks</h1>
            <p className="jira-subtitle">The definitive Local-First biometric attendance solution and multi-tenant SaaS application platform for your organization.</p>
            <div className="jira-hero-cta">
              <a href="/register" className="btn-jira-primary">Get Started Free</a>
              <div className="cta-divider"><span>Or continue with</span></div>
              <a href="/download" className="btn-jira-outline">Download UIAP Edge</a>
            </div>
          </div>
          
          <div className="jira-hero-mockup">
            <div className="mockup-header">
              <span className="mockup-title">UIAP Logic has finished</span>
              <span className="mockup-meta">Only visible to you</span>
            </div>
            <p className="mockup-desc">Here's the first draft of the logic for your new user onboarding module.</p>
            <img src="/assets/hero_mockup.jpg" alt="Hero Mockup" className="mockup-img" />
          </div>
        </section>

        {/* Dark Features Grid Section */}
        <section className="jira-features-section">
          <div className="jira-features-inner">
            <div className="jira-works-with">
              <span className="works-title">WORKS WITH</span>
              <div className="works-logos">
                <span>Any Database</span>
                <span>R307 Scanners</span>
                <span>PostgreSQL</span>
                <span>Custom Modules</span>
              </div>
            </div>

            <div className="jira-features-grid">
              <div className="jira-feature">
                <div className="jf-icon">@</div>
                <h3>Multi-Tenant SaaS</h3>
                <p>UIAP Cloud acts as the central command for all your organizations. Manage subscriptions, modules, devices, and global settings from a single developer portal.</p>
              </div>

              <div className="jira-feature">
                <div className="jf-icon">{'</>'}</div>
                <h3>Local-First Edge</h3>
                <p>Designed for organizations with intermittent internet. Fully operates offline using R307 fingerprint scanners through the UIAP Edge Windows application.</p>
              </div>

              <div className="jira-feature">
                <div className="jf-icon">❖</div>
                <h3>Modular Architecture</h3>
                <p>Install only what you need. Extend functionality with signed ZIP modules tailored to your specific organizational requirements securely and seamlessly.</p>
              </div>

              <div className="jira-feature">
                <div className="jf-icon">✓</div>
                <h3>College Management</h3>
                <p>Built-in biometric attendance bundle with student, teacher, and department tracking. Complete local records with manual overrides.</p>
              </div>
              
              <div className="jira-feature">
                <div className="jf-icon">🔒</div>
                <h3>Enterprise Security</h3>
                <p>Data stays on your local PostgreSQL database. Cloud connection is only required for license verification and module updates.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
