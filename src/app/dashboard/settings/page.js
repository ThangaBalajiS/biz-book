'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const [balanceForm, setBalanceForm] = useState({
    openingBankBalance: '',
    openingBalanceDate: new Date().toISOString().split('T')[0],
  });
  const [aachiMasalaForm, setAachiMasalaForm] = useState({
    openingAachiMasalaBalance: '',
    openingAachiMasalaBalanceDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, customersRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/customers'),
      ]);
      
      const settingsData = await settingsRes.json();
      const customersData = await customersRes.json();
      
      setSettings(settingsData);
      setCustomers(customersData);
      setBalanceForm({
        openingBankBalance: settingsData.openingBankBalance || '',
        openingBalanceDate: settingsData.openingBalanceDate 
          ? new Date(settingsData.openingBalanceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
      setAachiMasalaForm({
        openingAachiMasalaBalance: settingsData.openingAachiMasalaBalance || '',
        openingAachiMasalaBalanceDate: settingsData.openingAachiMasalaBalanceDate 
          ? new Date(settingsData.openingAachiMasalaBalanceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveBalance = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingBankBalance: parseFloat(balanceForm.openingBankBalance) || 0,
          openingBalanceDate: balanceForm.openingBalanceDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        showMessage('Opening balance saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      showMessage('Failed to save settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAachiMasalaBalance = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          openingAachiMasalaBalance: parseFloat(aachiMasalaForm.openingAachiMasalaBalance) || 0,
          openingAachiMasalaBalanceDate: aachiMasalaForm.openingAachiMasalaBalanceDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        showMessage('Aachi Masala opening balance saved successfully!');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      showMessage('Failed to save settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer._id}`
        : '/api/customers';
      
      const res = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });

      const data = await res.json();

      if (res.ok) {
        setShowCustomerModal(false);
        setCustomerForm({ name: '', phone: '' });
        setEditingCustomer(null);
        fetchData();
        showMessage(editingCustomer ? 'Customer updated!' : 'Customer added!');
      } else {
        showMessage(data.error || 'Failed to save customer', 'error');
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
      showMessage('Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({ name: customer.name, phone: customer.phone || '' });
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        fetchData();
        showMessage('Customer deleted!');
      } else {
        showMessage(data.error || 'Failed to delete customer', 'error');
      }
    } catch (err) {
      console.error('Failed to delete customer:', err);
      showMessage('Failed to delete customer', 'error');
    }
  };

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
        <h1 className="page-title">Settings</h1>
      </div>

      {message && (
        <div className={`toast-container`}>
          <div className={`toast toast-${message.type}`}>
            {message.text}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Opening Bank Balance</h2>
          
          <form onSubmit={handleSaveBalance}>
            <div className="form-row">
              <div className="form-group">
                <label>Opening Balance (₹)</label>
                <input
                  type="number"
                  value={balanceForm.openingBankBalance}
                  onChange={(e) => setBalanceForm({ ...balanceForm, openingBankBalance: e.target.value })}
                  placeholder="Enter opening balance"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>As of Date</label>
                <input
                  type="date"
                  value={balanceForm.openingBalanceDate}
                  onChange={(e) => setBalanceForm({ ...balanceForm, openingBalanceDate: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Balance'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Aachi Masala Opening Balance</h2>
          
          <form onSubmit={handleSaveAachiMasalaBalance}>
            <div className="form-row">
              <div className="form-group">
                <label>Opening Balance (₹)</label>
                <input
                  type="number"
                  value={aachiMasalaForm.openingAachiMasalaBalance}
                  onChange={(e) => setAachiMasalaForm({ ...aachiMasalaForm, openingAachiMasalaBalance: e.target.value })}
                  placeholder="Enter opening balance"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>As of Date</label>
                <input
                  type="date"
                  value={aachiMasalaForm.openingAachiMasalaBalanceDate}
                  onChange={(e) => setAachiMasalaForm({ ...aachiMasalaForm, openingAachiMasalaBalanceDate: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Aachi Masala Balance'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Customer Management</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingCustomer(null);
                setCustomerForm({ name: '', phone: '' });
                setShowCustomerModal(true);
              }}
            >
              + Add Customer
            </button>
          </div>

          {customers.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id}>
                      <td><strong>{customer.name}</strong></td>
                      <td>{customer.phone || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-icon btn-secondary"
                            onClick={() => handleEditCustomer(customer)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-icon btn-secondary"
                            onClick={() => handleDeleteCustomer(customer._id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No customers yet</div>
              <p>Add your first customer to start tracking outstanding</p>
            </div>
          )}
        </div>
      </div>

      {showCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone (Optional)</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
