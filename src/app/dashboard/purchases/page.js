'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PurchasesPage() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
  });
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    
    if (searchParams.get('action') === 'add') {
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      let url = '/api/transactions?type=OWN_PURCHASE';
      if (filters.fromDate) url += `&fromDate=${filters.fromDate}`;
      if (filters.toDate) url += `&toDate=${filters.toDate}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OWN_PURCHASE',
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
      console.error('Failed to create purchase:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete purchase:', err);
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

  const totalPurchases = transactions.reduce((sum, txn) => sum + txn.amount, 0);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Purchases</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Purchase
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">
            {filters.fromDate || filters.toDate ? 'Filtered Total' : 'Total Purchases'}
          </div>
          <div className="stat-value">{formatCurrency(totalPurchases)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Number of Purchases</div>
          <div className="stat-value">{transactions.length}</div>
        </div>
      </div>

      <div className="filter-bar">
        <div>
          <label style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.75rem' }}>From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
          />
        </div>
        <div>
          <label style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.75rem' }}>To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
          />
        </div>
        {(filters.fromDate || filters.toDate) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilters({ fromDate: '', toDate: '' })}
            style={{ alignSelf: 'flex-end' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Purchase List</h2>
        
        {transactions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.date)}</td>
                    <td>{txn.description || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="amount">{formatCurrency(txn.amount)}</span>
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
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                  <td colSpan="2">Total</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="amount">{formatCurrency(totalPurchases)}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">No purchases found</div>
            <p>{filters.fromDate || filters.toDate ? 'Try adjusting your date filters' : 'Add your first purchase to get started'}</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Purchase</h2>
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
