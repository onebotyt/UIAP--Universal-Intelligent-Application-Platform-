import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield } from 'lucide-react';

export function OrganizationsView() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const token = localStorage.getItem('uiap_token');
        const res = await fetch('/dashboard/organizations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setOrgs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Organizations</h2>
          <p className="dash-subtitle">Licensed customers running UIAP Edge</p>
        </div>
        <button className="btn-primary">
          <Plus size={16} style={{ marginRight: '6px' }} />
          New organization
        </button>
      </div>

      {loading ? (
        <div className="dash-empty">Loading organizations...</div>
      ) : orgs.length === 0 ? (
        <div className="dash-empty">
          <Users size={32} className="dash-empty-icon" />
          <p>No organizations yet.</p>
        </div>
      ) : (
        <div className="dash-grid">
          {orgs.map(org => (
            <div key={org.id} className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h3 className="dash-card-title">{org.name}</h3>
                  <span className="dash-card-slug">Plan: {org.plan_type}</span>
                </div>
                <button className="btn-ghost" style={{ padding: '6px 12px' }}>Details</button>
              </div>
              <p className="dash-card-desc">Status: {org.status}</p>
              <div className="dash-card-footer">
                <span className="dash-badge"><Shield size={12} style={{marginRight: '4px'}}/> Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
