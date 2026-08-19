import React from 'react';

export function Download() {
  return (
    <div className="landing-page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1>Download UIAP Edge</h1>
      <p className="subtitle">Get the latest Windows installer for your local or hybrid organization.</p>
      
      <div className="auth-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <h3>Windows Installer (64-bit)</h3>
        <p>Requires Windows 10 or higher. Connects directly to your R307 fingerprint scanner.</p>
        {/* Update this GitHub URL to match your actual repository and release path */}
        <a href="https://github.com/UIAP-Platform/uiap-workspace/releases/latest/download/UIAP-Edge-v0.1.0.exe" className="btn-primary" style={{ display: 'block', padding: '1rem', fontSize: '1.2rem', marginTop: '2rem' }}>
          ⬇ Download UIAP-Edge-v0.1.0.exe
        </a>
      </div>

      <div style={{ marginTop: '4rem', color: 'var(--text-muted)' }}>
        <p>Looking for the Web Dashboard?</p>
        <a href="/login" style={{ color: 'var(--primary)' }}>Go to your Organization Login</a>
      </div>
    </div>
  );
}
