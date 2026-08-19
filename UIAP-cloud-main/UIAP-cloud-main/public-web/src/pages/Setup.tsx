import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Setup() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('');
  const [dbType, setDbType] = useState('postgresql');
  const [txnRef, setTxnRef] = useState('');
  
  const navigate = useNavigate();
  const userStr = localStorage.getItem('uiap_user');
  
  useEffect(() => {
    if (!userStr) {
      navigate('/login');
    }
  }, [userStr, navigate]);

  const handleNext = () => setStep(step + 1);

  const handleComplete = async () => {
    // In a real flow, this would call a /api/setup endpoint to finalize the org settings
    alert('Setup completed! Waiting for verification.');
    navigate('/download');
  };

  return (
    <div className="auth-container" style={{ maxWidth: '600px' }}>
      <h2>Organization Setup</h2>
      <p>Configure your UIAP installation</p>
      
      {step === 1 && (
        <div className="step-content">
          <h3>Step 1: Choose your Plan</h3>
          <div className="input-group" style={{ flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
            <label className="plan-card" style={plan === 'local' ? { borderColor: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' } : {}}>
              <input type="radio" name="plan" value="local" onChange={() => setPlan('local')} />
              <div>
                <strong>Local Only</strong><br/>
                $0 / month<br/>
                <small>Run on your own network.</small>
              </div>
            </label>
            <label className="plan-card" style={plan === 'cloud' ? { borderColor: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' } : {}}>
              <input type="radio" name="plan" value="cloud" onChange={() => setPlan('cloud')} />
              <div>
                <strong>Cloud Basic</strong><br/>
                $9.99 / month<br/>
                <small>No server needed.</small>
              </div>
            </label>
            <label className="plan-card" style={plan === 'hybrid' ? { borderColor: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' } : {}}>
              <input type="radio" name="plan" value="hybrid" onChange={() => setPlan('hybrid')} />
              <div>
                <strong>Hybrid Pro</strong><br/>
                $29.99 / month<br/>
                <small>Cloud + Local sync.</small>
              </div>
            </label>
          </div>
          <button className="btn-primary" onClick={handleNext} disabled={!plan} style={{ marginTop: '2rem' }}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <h3>Step 2: Database Configuration</h3>
          <div className="input-group">
            <label>Database Type</label>
            <select value={dbType} onChange={e => setDbType(e.target.value)}>
              <option value="postgresql">PostgreSQL (Cloud Native)</option>
              {plan === 'local' && (
                <>
                  <option value="sqlite">SQLite (Local Storage)</option>
                  <option value="mysql">MySQL</option>
                </>
              )}
            </select>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Note: Cloud plans enforce PostgreSQL for security and scalability. Local plans allow SQLite or MySQL.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={handleNext}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h3>Step 3: Verification</h3>
          {plan !== 'local' ? (
            <>
              <p>Please scan the QR code to pay for your chosen plan.</p>
              <div style={{ background: 'white', padding: '1rem', width: '200px', margin: '0 auto', borderRadius: '8px' }}>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=UIAP_PAYMENT_DEMO" alt="QR Code" style={{ width: '100%' }} />
              </div>
              <div className="input-group" style={{ marginTop: '2rem' }}>
                <label>Transaction Reference ID</label>
                <input type="text" value={txnRef} onChange={e => setTxnRef(e.target.value)} placeholder="e.g. TXN-12345" />
              </div>
            </>
          ) : (
            <p>Your local plan requires no payment! You can proceed to download UIAP Edge.</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={handleComplete} disabled={plan !== 'local' && !txnRef}>Finish Setup</button>
          </div>
        </div>
      )}
    </div>
  );
}
