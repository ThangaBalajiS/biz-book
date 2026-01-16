'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

export default function OutstandingPage() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('purchase'); // 'purchase' or 'payment'
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    
    if (searchParams.get('action') === 'payment') {
      setModalType('payment');
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      
      // Fetch outstanding for each customer
      const customersWithOutstanding = await Promise.all(
        data.map(async (customer) => {
          const detailRes = await fetch(`/api/customers/${customer._id}`);
          const detail = await detailRes.json();
          return { ...customer, outstanding: detail.outstanding };
        })
      );
      
      setCustomers(customersWithOutstanding);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (customerId) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      setCustomerData(data);
      setSelectedCustomer(customerId);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
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
          type: modalType === 'purchase' ? 'CUSTOMER_PURCHASE' : 'PAYMENT_RECEIVED',
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description,
          customerId: formData.customerId,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          customerId: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        });
        fetchCustomers();
        if (selectedCustomer) {
          fetchCustomerDetail(selectedCustomer);
        }
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
        fetchCustomers();
        if (selectedCustomer) {
          fetchCustomerDetail(selectedCustomer);
        }
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

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding || 0), 0);

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
        <h1 className="page-title">Outstanding</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => { setModalType('purchase'); setShowModal(true); }}
          >
            + Customer Purchase
          </button>
          <button
            className="btn btn-success"
            onClick={() => { setModalType('payment'); setShowModal(true); }}
          >
            💰 Payment Received
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value">{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{customers.length}</div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.customerList}>
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Customers</h2>
            
            {customers.length > 0 ? (
              <div className={styles.customers}>
                {customers.map((customer) => (
                  <div
                    key={customer._id}
                    className={`${styles.customerItem} ${selectedCustomer === customer._id ? styles.active : ''}`}
                    onClick={() => fetchCustomerDetail(customer._id)}
                  >
                    <div className={styles.customerInfo}>
                      <span className={styles.customerName}>{customer.name}</span>
                      {customer.phone && (
                        <span className={styles.customerPhone}>{customer.phone}</span>
                      )}
                    </div>
                    <span className={`${styles.outstanding} ${customer.outstanding > 0 ? styles.hasOutstanding : ''}`}>
                      {formatCurrency(customer.outstanding || 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No customers yet</div>
                <p>Add customers from Settings</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.customerDetail}>
          {customerData ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">{customerData.customer.name}</h2>
                  {customerData.customer.phone && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {customerData.customer.phone}
                    </p>
                  )}
                </div>
                <div className={styles.outstandingBadge}>
                  Outstanding: <strong>{formatCurrency(customerData.outstanding)}</strong>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Transaction History</h3>

              {customerData.transactions.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerData.transactions.map((txn) => (
                        <tr key={txn._id}>
                          <td>{formatDate(txn.date)}</td>
                          <td>
                            <span className={`badge ${txn.type === 'PAYMENT_RECEIVED' ? 'badge-success' : 'badge-danger'}`}>
                              {txn.type === 'PAYMENT_RECEIVED' ? 'Payment' : 'Purchase'}
                            </span>
                          </td>
                          <td>{txn.description || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`amount ${txn.type === 'PAYMENT_RECEIVED' ? 'credit' : 'debit'}`}>
                              {txn.type === 'PAYMENT_RECEIVED' ? '-' : '+'}
                              {formatCurrency(txn.amount)}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No transactions yet</div>
                  <p>Add a purchase or payment to get started</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">👆</div>
                <div className="empty-state-title">Select a customer</div>
                <p>Click on a customer to view their transaction history</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalType === 'purchase' ? 'Add Customer Purchase' : 'Record Payment Received'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} ({formatCurrency(customer.outstanding || 0)} outstanding)
                    </option>
                  ))}
                </select>
              </div>

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
                  className={`btn ${modalType === 'payment' ? 'btn-success' : 'btn-primary'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalType === 'purchase' ? 'Add Purchase' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
