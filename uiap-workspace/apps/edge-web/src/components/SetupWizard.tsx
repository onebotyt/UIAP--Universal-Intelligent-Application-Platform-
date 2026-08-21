import React, { useState } from 'react';
import { branding } from '../config/branding';

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('local');
  const [dbType, setDbType] = useState('sqlite');
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleNextToDb = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleNextToPaymentOrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plan === 'local') {
      handleSubmit(); // Local is free, skip payment
    } else {
      setStep(3); // Go to payment
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('plan', plan);
      formData.append('dbType', dbType);
      formData.append('transactionRef', transactionRef);
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      const res = await fetch('/api/setup/finalize', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Setup failed.');
      }

      setSuccess(true);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 || success) {
    return (
      <div className="uiap-login-page">
        <div className="uiap-login-card">
          <div className="uiap-login-brand">
            <div className="uiap-login-logo">◆</div>
            <div>
              <h1>{branding.applicationName}</h1>
              <p>Pending Verification</p>
            </div>
          </div>
          <div className="uiap-setup-success" style={{ textAlign: 'center', padding: '20px' }}>
            <h2 style={{ color: '#F0B429' }}>⏳ Verification Pending</h2>
            <p style={{ marginTop: '10px', color: 'var(--uiap-text-muted)' }}>
              {plan === 'local'
                ? 'Your local setup is complete. You may refresh the page to log in.'
                : 'Your payment is awaiting developer approval. Please check back later.'}
            </p>
            {plan !== 'local' && (
              <p style={{ marginTop: '10px', fontSize: '0.9em', color: 'var(--uiap-text-dim)' }}>
                Transaction Ref: {transactionRef}
              </p>
            )}
            <button
              className="uiap-login-btn"
              style={{ marginTop: '20px' }}
              onClick={() => window.location.reload()}
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="uiap-login-page">
      <div className="uiap-login-card">
        <div className="uiap-login-brand">
          <div className="uiap-login-logo">◆</div>
          <div>
            <h1>{branding.applicationName}</h1>
            <p>First-Run Setup</p>
          </div>
        </div>

        {error && <div className="uiap-login-error">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNextToDb} className="uiap-login-form">
            <div className="uiap-setup-info">
              <p>Step 1: Choose Organization Plan</p>
            </div>
            <div className="uiap-input-group">
              <label>Select your plan:</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="uiap-input">
                <option value="local">Local Only - Free</option>
                <option value="cloud">Cloud Basic - $9.99/mo</option>
                <option value="hybrid">Hybrid Pro - $29.99/mo</option>
              </select>
            </div>
            <button type="submit" className="uiap-login-btn">
              Next
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNextToPaymentOrSubmit} className="uiap-login-form">
            <div className="uiap-setup-info">
              <p>Step 2: Local Database Setup</p>
            </div>
            <div className="uiap-input-group">
              <label>Database Type for Local Storage</label>
              <select
                value={dbType}
                onChange={(e) => setDbType(e.target.value)}
                className="uiap-input"
              >
                <option value="sqlite">SQLite (Built-in)</option>
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
              </select>
            </div>
            <p style={{ fontSize: '0.85em', color: 'var(--uiap-text-dim)', marginBottom: '15px' }}>
              Select the database engine to use for local offline storage.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="uiap-login-btn ghost"
                style={{ background: 'transparent', border: '1px solid var(--uiap-border)', color: 'var(--uiap-text-muted)' }}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button type="submit" className="uiap-login-btn">
                {plan === 'local' ? 'Complete Setup' : 'Next: Payment'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="uiap-login-form"
          >
            <div className="uiap-setup-info">
              <p>Step 3: Manual Payment</p>
            </div>

            <div
              style={{
                background: 'var(--uiap-panel-raised)',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '15px',
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=pay-uiap"
                alt="Payment QR"
                style={{ borderRadius: '8px' }}
              />
              <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
                Scan to pay {plan === 'cloud' ? '$9.99' : '$29.99'}
              </p>
            </div>

            <div className="uiap-input-group">
              <label>Transaction ID / Reference Number</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="uiap-input"
                placeholder="e.g. TXN-123456789"
                required
                disabled={loading}
              />
            </div>
            
            <div className="uiap-input-group" style={{ marginTop: '10px', marginBottom: '15px' }}>
              <label>Payment Screenshot (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="uiap-input"
                style={{ padding: '0.4rem 0.5rem', cursor: 'pointer' }}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="uiap-login-btn ghost"
                style={{ background: 'transparent', border: '1px solid var(--uiap-border)', color: 'var(--uiap-text-muted)' }}
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button type="submit" className="uiap-login-btn" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
