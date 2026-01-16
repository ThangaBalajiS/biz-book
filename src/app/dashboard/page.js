'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTransactionLabel = (type) => {
    const labels = {
      CUSTOMER_PURCHASE: 'Customer Purchase',
      PAYMENT_RECEIVED: 'Payment Received',
      OWN_PURCHASE: 'Purchase',
      BANK_CREDIT: 'Bank Credit',
      BANK_DEBIT: 'Bank Debit',
    };
    return labels[type] || type;
  };

  const getTransactionBadge = (type) => {
    const isCredit = ['PAYMENT_RECEIVED', 'BANK_CREDIT'].includes(type);
    return isCredit ? 'badge-success' : 'badge-danger';
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
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Bank Balance</div>
          <div className={`stat-value ${data?.bankBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(data?.bankBalance || 0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value">
            {formatCurrency(data?.totalOutstanding || 0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Purchases</div>
          <div className="stat-value">
            {formatCurrency(data?.totalPurchases || 0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">
            {data?.customerCount || 0}
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link href="/dashboard/bank?action=credit" className={styles.actionCard}>
            <span className={styles.actionIcon}>💵</span>
            <span className={styles.actionLabel}>Add Bank Credit</span>
          </Link>
          <Link href="/dashboard/bank?action=debit" className={styles.actionCard}>
            <span className={styles.actionIcon}>💸</span>
            <span className={styles.actionLabel}>Add Bank Debit</span>
          </Link>
          <Link href="/dashboard/purchases?action=add" className={styles.actionCard}>
            <span className={styles.actionIcon}>🛒</span>
            <span className={styles.actionLabel}>Add Purchase</span>
          </Link>
          <Link href="/dashboard/outstanding?action=payment" className={styles.actionCard}>
            <span className={styles.actionIcon}>✅</span>
            <span className={styles.actionLabel}>Record Payment</span>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Transactions</h2>
          <Link href="/dashboard/bank" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {data?.recentTransactions?.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>{formatDate(txn.date)}</td>
                    <td>
                      <span className={`badge ${getTransactionBadge(txn.type)}`}>
                        {getTransactionLabel(txn.type)}
                      </span>
                    </td>
                    <td>
                      {txn.customerId?.name && <strong>{txn.customerId.name}</strong>}
                      {txn.customerId?.name && txn.description && ' - '}
                      {txn.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`amount ${['PAYMENT_RECEIVED', 'BANK_CREDIT'].includes(txn.type) ? 'credit' : 'debit'}`}>
                        {['PAYMENT_RECEIVED', 'BANK_CREDIT'].includes(txn.type) ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No transactions yet</div>
            <p>Start by adding your first transaction</p>
          </div>
        )}
      </div>
    </div>
  );
}
