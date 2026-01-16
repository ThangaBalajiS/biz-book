'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AachiMasalaPage() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('credit'); // 'credit' or 'purchase'
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Check for action param
    const action = searchParams.get('action');
    if (action === 'credit' || action === 'purchase') {
      setModalType(action);
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [txnRes, settingsRes] = await Promise.all([
        fetch('/api/transactions?affectsAachiMasala=true'),
        fetch('/api/settings'),
      ]);
      
      const txns = await txnRes.json();
      const settings = await settingsRes.json();
      
      setTransactions(txns);
      setSettings(settings);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modalType === 'credit' ? 'AACHI_MASALA_CREDIT' : 'AACHI_MASALA_PURCHASE',
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate running balance
  const calculateRunningBalance = () => {
    const openingBalance = settings?.openingAachiMasalaBalance || 0;
    let balance = openingBalance;
    
    // Sort by date ascending, then by createdAt ascending for consistent ordering
    const sorted = [...transactions].sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      // For same date, sort by createdAt
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    return sorted.map(txn => {
      if (txn.type === 'AACHI_MASALA_CREDIT') {
        balance += txn.amount;
      } else {
        balance -= txn.amount;
      }
      return { ...txn, runningBalance: balance };
    }).reverse(); // Reverse to show newest first
  };

  const getTypeLabel = (type) => {
    const labels = {
      AACHI_MASALA_CREDIT: 'Credit (Transfer from Bank)',
      AACHI_MASALA_PURCHASE: 'Purchase',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const transactionsWithBalance = calculateRunningBalance();
  const currentBalance = transactions.length > 0 
    ? transactionsWithBalance[0]?.runningBalance 
    : settings?.openingAachiMasalaBalance || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Aachi Masala Account</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-success"
            onClick={() => { setModalType('credit'); setShowModal(true); }}
          >
            + Credit (Add Money)
          </button>
          <button
            className="btn btn-danger"
            onClick={() => { setModalType('purchase'); setShowModal(true); }}
          >
            - Purchase
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Opening Balance</div>
          <div className="stat-value">{formatCurrency(settings?.openingAachiMasalaBalance || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Balance</div>
          <div className={`stat-value ${currentBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(currentBalance)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Transactions</h2>
        
        {transactionsWithBalance.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Credit</th>
                  <th style={{ textAlign: 'right' }}>Debit</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((txn) => {
                  const isCredit = txn.type === 'AACHI_MASALA_CREDIT';
                  return (
                    <tr key={txn._id}>
                      <td>{formatDate(txn.date)}</td>
                      <td>
                        <div>
                          <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`} style={{ marginRight: '0.5rem' }}>
                            {getTypeLabel(txn.type)}
                          </span>
                          {txn.description && <span style={{ color: 'var(--text-secondary)' }}> - {txn.description}</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isCredit && (
                          <span className="amount credit">+{formatCurrency(txn.amount)}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isCredit && (
                          <span className="amount debit">-{formatCurrency(txn.amount)}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="amount">
                          {formatCurrency(txn.runningBalance)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-icon btn-secondary"
                          onClick={() => handleDelete(txn._id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🌶️</div>
            <div className="empty-state-title">No transactions yet</div>
            <p>Add your first transaction to get started</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalType === 'credit' ? 'Add Credit (Transfer from Bank)' : 'Add Purchase'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${modalType === 'credit' ? 'btn-success' : 'btn-danger'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalType === 'credit' ? 'Add Credit' : 'Add Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
