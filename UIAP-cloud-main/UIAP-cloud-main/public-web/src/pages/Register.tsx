import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgName })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // Store token and redirect to setup since new orgs are 'pending_setup'
      localStorage.setItem('uiap_token', data.token);
      localStorage.setItem('uiap_user', JSON.stringify(data.user));
      navigate('/setup');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create your Account</h2>
      <p>Start your UIAP Cloud Organization</p>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleRegister}>
        <div className="input-group">
          <label>Organization Name</label>
          <input 
            type="text" 
            required 
            value={orgName} 
            onChange={e => setOrgName(e.target.value)} 
            placeholder="e.g. Acme Corp" 
          />
        </div>
        <div className="input-group">
          <label>Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="admin@example.com" 
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            required 
            minLength={8}
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••" 
          />
        </div>
        
        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg style={{ animation: 'spin 1s linear infinite', width: '1.25rem', height: '1.25rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </span>
          ) : 'Register for Free'}
        </button>
      </form>
      
      <p style={{ marginTop: '1.5rem', marginBottom: 0 }}>
        Already have an account? <a href="/login" style={{ color: 'var(--primary)' }}>Log in</a>
      </p>
    </div>
  );
}
