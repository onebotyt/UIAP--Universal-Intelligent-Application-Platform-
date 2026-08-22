import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      localStorage.setItem('uiap_token', data.token);
      localStorage.setItem('uiap_user', JSON.stringify(data.user));
      
      if (data.user.role === 'admin') {
        navigate('/dashboard'); // Go to new React Developer Dashboard
      } else {
        if (data.user.organization?.status === 'pending_setup') {
          navigate('/setup');
        } else {
          // Send them to their org dashboard or download page
          navigate('/download');
        }
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back</h2>
      <p>Log into UIAP Cloud or Developer Portal</p>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleLogin}>
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
              Logging in...
            </span>
          ) : 'Log In'}
        </button>
      </form>
      
      <p style={{ marginTop: '1.5rem', marginBottom: 0 }}>
        Don't have an account? <a href="/register" style={{ color: 'var(--primary)' }}>Register now</a>
      </p>
    </div>
  );
}
