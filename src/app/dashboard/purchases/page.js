'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PurchasesPage() {
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [aachiMasalaPurchases, setAachiMasalaPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'aachi'
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [filters]);

  const fetchData = async () => {
    try {
      let customerUrl = '/api/transactions?type=CUSTOMER_PURCHASE';
      let aachiUrl = '/api/transactions?type=AACHI_MASALA_PURCHASE';
      
      if (filters.fromDate) {
        customerUrl += `&fromDate=${filters.fromDate}`;
        aachiUrl += `&fromDate=${filters.fromDate}`;
      }
      if (filters.toDate) {
        customerUrl += `&toDate=${filters.toDate}`;
        aachiUrl += `&toDate=${filters.toDate}`;
      }
      
      const [customerRes, aachiRes] = await Promise.all([
        fetch(customerUrl),
        fetch(aachiUrl),
      ]);
      
      const customerData = await customerRes.json();
      const aachiData = await aachiRes.json();
      
      setCustomerPurchases(customerData);
      setAachiMasalaPurchases(aachiData);
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    } finally {
      setLoading(false);
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

  const totalCustomerPurchases = customerPurchases.reduce((sum, txn) => sum + txn.amount, 0);
  const totalAachiMasalaPurchases = aachiMasalaPurchases.reduce((sum, txn) => sum + txn.amount, 0);
  const grandTotal = totalCustomerPurchases + totalAachiMasalaPurchases;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentPurchases = activeTab === 'customer' ? customerPurchases : aachiMasalaPurchases;
  const currentTotal = activeTab === 'customer' ? totalCustomerPurchases : totalAachiMasalaPurchases;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Purchases</h1>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Customer Purchases</div>
          <div className="stat-value">{formatCurrency(totalCustomerPurchases)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {customerPurchases.length} transactions
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aachi Masala Purchases</div>
          <div className="stat-value">{formatCurrency(totalAachiMasalaPurchases)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {aachiMasalaPurchases.length} transactions
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {filters.fromDate || filters.toDate ? 'Filtered Grand Total' : 'Grand Total'}
          </div>
          <div className="stat-value">{formatCurrency(grandTotal)}</div>
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

      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('customer')}
        >
          🛍️ Customer Purchases ({customerPurchases.length})
        </button>
        <button
          className={`btn ${activeTab === 'aachi' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('aachi')}
        >
          🌶️ Aachi Masala Purchases ({aachiMasalaPurchases.length})
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {activeTab === 'customer' ? 'Customer Purchases' : 'Aachi Masala Purchases'}
          </h2>
          {activeTab === 'customer' ? (
            <Link href="/dashboard/outstanding" className="btn btn-primary btn-sm">
              + Add Customer Purchase
            </Link>
          ) : (
            <Link href="/dashboard/aachi-masala?action=purchase" className="btn btn-primary btn-sm">
              + Add Aachi Masala Purchase
            </Link>
          )}
        </div>
        
        {currentPurchases.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {activeTab === 'customer' && <th>Customer</th>}
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {currentPurchases.map((txn) => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.date)}</td>
                    {activeTab === 'customer' && (
                      <td>
                        <strong>{txn.customerId?.name || '-'}</strong>
                      </td>
                    )}
                    <td>{txn.description || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="amount">{formatCurrency(txn.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                  <td colSpan={activeTab === 'customer' ? 3 : 2}>Total</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="amount">{formatCurrency(currentTotal)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">{activeTab === 'customer' ? '🛍️' : '🌶️'}</div>
            <div className="empty-state-title">
              No {activeTab === 'customer' ? 'customer' : 'Aachi Masala'} purchases found
            </div>
            <p>
              {filters.fromDate || filters.toDate 
                ? 'Try adjusting your date filters' 
                : activeTab === 'customer'
                  ? 'Customer purchases will appear here when customers make purchases'
                  : 'Add purchases from the Aachi Masala page'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
