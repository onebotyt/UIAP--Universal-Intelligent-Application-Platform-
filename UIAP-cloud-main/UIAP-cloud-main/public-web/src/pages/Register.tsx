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
          {loading ? 'Registering...' : 'Register for Free'}
        </button>
      </form>
      
      <p style={{ marginTop: '1.5rem', marginBottom: 0 }}>
        Already have an account? <a href="/login" style={{ color: 'var(--primary)' }}>Log in</a>
      </p>
    </div>
  );
}
