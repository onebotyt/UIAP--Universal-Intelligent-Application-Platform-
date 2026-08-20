import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Package } from 'lucide-react';

export function AnalyticsView() {
  const [stats, setStats] = useState<any>({ organizations: 0, modules: 0 });
  const [txData, setTxData] = useState<any[]>([]);
  const [planData, setPlanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('uiap_token');
      const res = await fetch('/dashboard/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        
        // Format dates for charts
        const formattedTx = data.charts.txByDate.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: item.revenue || 0
        }));
        setTxData(formattedTx.length > 0 ? formattedTx : [{ date: 'Today', revenue: 0 }]);
        
        setPlanData(data.charts.orgPlans.length > 0 ? data.charts.orgPlans : [{ plan: 'local', value: 0 }]);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div style={{ color: 'var(--dash-text-muted)' }}>Loading analytics...</div>;
  }

  return (
    <div>
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Live Analysis</h2>
          <p className="dash-subtitle">Overview of platform metrics and performance</p>
        </div>
      </div>

      <div className="dash-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        <div className="dash-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
              <Users size={20} />
            </div>
            <div style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem' }}>Total Organizations</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--dash-text)' }}>{stats.organizations}</div>
        </div>
        
        <div className="dash-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <Package size={20} />
            </div>
            <div style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem' }}>Published Modules</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--dash-text)' }}>{stats.modules}</div>
        </div>

        <div className="dash-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
              <TrendingUp size={20} />
            </div>
            <div style={{ color: 'var(--dash-text-muted)', fontSize: '0.9rem' }}>Platform Uptime</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--dash-text)' }}>99.9%</div>
        </div>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="dash-card">
          <h3 className="dash-card-title" style={{ marginBottom: '24px' }}>Revenue Overview (Last 7 Days)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--dash-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--dash-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--dash-bg)', borderColor: 'var(--dash-border)', color: 'var(--dash-text)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--dash-primary)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-card">
          <h3 className="dash-card-title" style={{ marginBottom: '24px' }}>Organizations by Plan</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" vertical={false} />
                <XAxis dataKey="plan" stroke="var(--dash-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--dash-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--dash-bg)', borderColor: 'var(--dash-border)', color: 'var(--dash-text)', borderRadius: '8px' }}
                  cursor={{ fill: 'var(--dash-border)', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
