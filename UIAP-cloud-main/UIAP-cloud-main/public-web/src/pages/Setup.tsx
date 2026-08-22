import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Setup() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('');
  const [dbType, setDbType] = useState('mysql');
  const [txnRef, setTxnRef] = useState('');
  
  const navigate = useNavigate();
  const userStr = localStorage.getItem('uiap_user');
  
  useEffect(() => {
    if (!userStr) {
      navigate('/login');
    }
  }, [userStr, navigate]);

  const handleNext = () => setStep(step + 1);

  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('uiap_token');
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan, dbType, txnRef })
      });

      if (!res.ok) {
        throw new Error('Failed to complete setup');
      }

      alert('Setup completed! You are now entering your organization dashboard.');
      navigate('/dashboard');
    } catch (err) {
      alert('Error during setup. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <option value="mysql">MySQL (cPanel/Shared Hosting)</option>
              <option value="sqlite">SQLite (Local Storage)</option>
            </select>
          </div>
          
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
            {dbType === 'mysql' && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                <strong>MySQL:</strong> High security and robust data handling, but application may require higher RAM.
              </p>
            )}
            {dbType === 'sqlite' && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                <strong>SQLite:</strong> Faster application performance and lightweight, but lower security for multi-user scaling.
              </p>
            )}
          </div>

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
            <button className="btn-primary" onClick={handleComplete} disabled={(plan !== 'local' && !txnRef) || loading}>
              {loading ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
