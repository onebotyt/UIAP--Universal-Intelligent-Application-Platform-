import React, { useState, useEffect } from 'react';
import { UserCircle, Upload, Save } from 'lucide-react';

export function ProfileView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('uiap_user') || '{}');
    if (user.email) setEmail(user.email);
    if (user.avatar_url) setAvatarUrl(user.avatar_url);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setAvatarUrl(e.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const token = localStorage.getItem('uiap_token');
    const formData = new FormData();
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage('Profile updated successfully!');
        localStorage.setItem('uiap_user', JSON.stringify(data.user));
        setAvatarUrl(data.user.avatar_url);
        setPassword('');
      } else {
        setMessage(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Profile Settings</h2>
          <p className="dash-subtitle">Manage your account information and preferences</p>
        </div>
      </div>

      <div className="dash-card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserCircle size={48} color="var(--dash-text-muted)" />
              )}
            </div>
            <div>
              <label htmlFor="avatar-upload" className="dash-btn-ghost" style={{ cursor: 'pointer', border: '1px solid var(--dash-border)' }}>
                <Upload size={16} style={{ marginRight: '8px' }} />
                Upload New Photo
              </label>
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--dash-text-muted)', fontWeight: 500 }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="dash-input"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--dash-text-muted)', fontWeight: 500 }}>New Password (Optional)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Leave blank to keep current password"
              className="dash-input"
            />
          </div>

          {message && (
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: message.includes('success') ? 'rgba(79, 209, 197, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.includes('success') ? 'var(--dash-primary)' : '#ef4444' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="dash-btn-primary" disabled={loading}>
              <Save size={16} style={{ marginRight: '8px' }} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
