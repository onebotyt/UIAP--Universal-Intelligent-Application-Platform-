import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { branding } from '../config/branding';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        login(data.user);
      } else {
        setError(data.error?.message || 'Login failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uiap-login-page">
      <div className="uiap-login-card">
        <div className="uiap-login-brand">
          <div className="uiap-login-logo">◆</div>
          <div>
            <h1>{branding.applicationName}</h1>
            <p>{branding.applicationFullName}</p>
          </div>
        </div>

        {error && <div className="uiap-login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="uiap-login-form">
          <div className="uiap-input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="uiap-input"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="uiap-input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="uiap-input"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="uiap-login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
