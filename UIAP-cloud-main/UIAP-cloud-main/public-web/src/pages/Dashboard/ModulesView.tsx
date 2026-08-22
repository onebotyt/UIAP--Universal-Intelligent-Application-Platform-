import React, { useState, useEffect } from 'react';
import { Package, Plus, UploadCloud } from 'lucide-react';

export function ModulesView() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleSlug, setNewModuleSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const token = localStorage.getItem('uiap_token');
        const res = await fetch('/dashboard/modules', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setModules(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  const handleCreateModule = async () => {
    if (!newModuleName || !newModuleSlug) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('uiap_token');
      await fetch('/dashboard/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: newModuleSlug, display_name: newModuleName })
      });
      window.location.reload();
    } catch (err) {
      alert('Failed to create module');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Modules</h2>
          <p className="dash-subtitle">Registered UIAP module types</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} style={{ marginRight: '6px' }} />
          New module
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="dash-modal">
            <h3>Register New Module</h3>
            <div className="input-group">
              <label>Module Display Name</label>
              <input 
                type="text" 
                placeholder="e.g. Attendance Management" 
                className="dash-input"
                value={newModuleName}
                onChange={e => setNewModuleName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Module Slug</label>
              <input 
                type="text" 
                placeholder="e.g. uiap.attendance" 
                className="dash-input"
                value={newModuleSlug}
                onChange={e => setNewModuleSlug(e.target.value)}
              />
            </div>
            <div className="dash-modal-footer">
              <button className="dash-btn-ghost" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
              <button className="dash-btn-primary" onClick={handleCreateModule} disabled={!newModuleName || !newModuleSlug || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dash-empty">Loading modules...</div>
      ) : modules.length === 0 ? (
        <div className="dash-empty">
          <Package size={32} className="dash-empty-icon" />
          <p>No modules yet.</p>
          <span className="dash-empty-sub">Register your first module to start publishing versions.</span>
        </div>
      ) : (
        <div className="dash-grid">
          {modules.map(mod => (
            <div key={mod.id} className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h3 className="dash-card-title">{mod.display_name}</h3>
                  <span className="dash-card-slug">{mod.slug}</span>
                </div>
                <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => alert('Version management coming in v0.2')}>Versions</button>
              </div>
              <p className="dash-card-desc">{mod.description || 'No description provided.'}</p>
              <div className="dash-card-footer">
                <span className="dash-badge">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
