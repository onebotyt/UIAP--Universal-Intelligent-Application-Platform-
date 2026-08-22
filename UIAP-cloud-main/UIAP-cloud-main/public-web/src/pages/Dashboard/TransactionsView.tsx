import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X } from 'lucide-react';

export function TransactionsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('uiap_token');
        const res = await fetch('/dashboard/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setTransactions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <div>
          <h2 className="dash-title">Transactions (Pending Verification)</h2>
          <p className="dash-subtitle">Manual QR payments awaiting approval</p>
        </div>
      </div>

      {loading ? (
        <div className="dash-empty">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="dash-empty">
          <CreditCard size={32} className="dash-empty-icon" />
          <p>No pending transactions.</p>
        </div>
      ) : (
        <div className="dash-grid">
          {transactions.map(tx => (
            <div key={tx.id} className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h3 className="dash-card-title">{tx.org_name || 'Unknown Org'}</h3>
                  <span className="dash-card-slug">Amount: ${tx.amount_usd}</span>
                </div>
              </div>
              <p className="dash-card-desc">Ref: {tx.transaction_ref}</p>
              <div className="dash-card-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  className="btn-ghost" 
                  style={{ color: 'var(--red)' }}
                  onClick={async () => {
                    const token = localStorage.getItem('uiap_token');
                    await fetch(`/dashboard/transactions/${tx.id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    setTransactions(transactions.filter(t => t.id !== tx.id));
                  }}
                >
                  <X size={14} style={{ marginRight: '4px' }} /> Reject
                </button>
                <button 
                  className="btn-primary" 
                  style={{ padding: '4px 10px' }}
                  onClick={async () => {
                    const token = localStorage.getItem('uiap_token');
                    await fetch(`/dashboard/transactions/${tx.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    setTransactions(transactions.filter(t => t.id !== tx.id));
                  }}
                >
                  <Check size={14} style={{ marginRight: '4px' }} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
