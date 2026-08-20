import React, { useState, useEffect } from 'react';
import { Package, Plus, UploadCloud } from 'lucide-react';

export function ModulesView() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Modules</h2>
          <p className="dash-subtitle">Registered UIAP module types</p>
        </div>
        <button className="btn-primary">
          <Plus size={16} style={{ marginRight: '6px' }} />
          New module
        </button>
      </div>

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
                <button className="btn-ghost" style={{ padding: '6px 12px' }}>Versions</button>
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
