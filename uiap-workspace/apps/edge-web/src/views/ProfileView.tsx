import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function ProfileView() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('email', email);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      
      setProfileStatus({ type: 'success', message: 'Profile updated successfully! Refresh to see changes.' });
    } catch (err: any) {
      setProfileStatus({ type: 'error', message: err.message });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      setPasswordStatus({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      <div className="uiap-view-panel" style={{ marginBottom: '1.5rem' }}>
        <h2>User Profile</h2>
        <p style={{ color: 'var(--uiap-text-muted)' }}>Manage your personal account settings.</p>
        
        {profileStatus && (
          <div style={{ padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', background: profileStatus.type === 'error' ? 'var(--uiap-danger)' : 'var(--uiap-success)', color: 'white' }}>
            {profileStatus.message}
          </div>
        )}
        
        <form onSubmit={handleProfileSubmit}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '50%', background: 'var(--uiap-bg)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', 
                border: '2px solid var(--uiap-border)', overflow: 'hidden'
              }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{user?.username?.slice(0,2).toUpperCase()}</span>
                )}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label className="uiap-btn uiap-btn-secondary" style={{ cursor: 'pointer', display: 'block', textAlign: 'center', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                  Change Image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                </label>
                {avatarFile && <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'center' }}>{avatarFile.name}</p>}
              </div>
            </div>
            
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Username</label>
                <input type="text" className="uiap-input" value={user?.username || ''} disabled style={{ background: 'var(--uiap-bg)', opacity: 0.7 }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Email Address</label>
                <input type="email" className="uiap-input" placeholder="e.g., admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="uiap-btn uiap-btn-primary">Save Profile</button>
            </div>
          </div>
        </form>
      </div>

      <div className="uiap-view-panel">
        <h3>Security</h3>
        <p style={{ color: 'var(--uiap-text-muted)' }}>Update your account password.</p>
        
        {passwordStatus && (
          <div style={{ padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', background: passwordStatus.type === 'error' ? 'var(--uiap-danger)' : 'var(--uiap-success)', color: 'white' }}>
            {passwordStatus.message}
          </div>
        )}
        
        <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '400px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Current Password</label>
            <input type="password" required className="uiap-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>New Password</label>
            <input type="password" required minLength={8} className="uiap-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button type="submit" className="uiap-btn uiap-btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}
