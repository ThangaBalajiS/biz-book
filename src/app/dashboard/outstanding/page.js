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
    
    const action = searchParams.get('action');
    if (action === 'payment') {
      setModalType('payment');
      setShowModal(true);
    } else if (action === 'purchase') {
      setModalType('purchase');
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

  // Format currency for PDF (using Rs instead of ₹ symbol for better font support)
  const formatCurrencyForPDF = (amount) => {
    return 'Rs ' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadPDF = async () => {
    // Dynamically import jspdf and jspdf-autotable
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    // Fetch business name from settings
    let businessName = 'YOUR BUSINESS NAME';
    try {
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.businessName) {
        businessName = settingsData.businessName.toUpperCase();
      }
    } catch (err) {
      console.error('Failed to fetch settings for PDF:', err);
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date();
    
    // Format date as DD-MM-YYYY
    const formatDateForPDF = (date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\//g, '-');
    };
    
    // Calculate days difference
    const calculateDays = (date) => {
      const billDate = new Date(date);
      const diffTime = Math.abs(today - billDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
    
    // Draw top blue border
    doc.setFillColor(0, 128, 192);
    doc.rect(10, 10, pageWidth - 20, 3, 'F');
    
    // Business Name Header (dynamic)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(204, 102, 0); // Orange color
    doc.text(businessName, pageWidth / 2, 28, { align: 'center' });
    
    // AGENCY OUTSTANDING DETAILS subtitle
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 128); // Teal color
    doc.text('AGENCY OUTSTANDING DETAILS', 14, 42);
    
    // Current date on right
    doc.setFontSize(12);
    doc.setTextColor(128, 0, 128); // Purple color
    doc.text(formatDateForPDF(today), pageWidth - 14, 42, { align: 'right' });
    
    // Prepare table data with bill dates and days calculation
    // We need to fetch the last transaction date for each customer
    const customersWithBillDate = await Promise.all(
      customers
        .filter(c => (c.outstanding || 0) > 0)
        .map(async (customer) => {
          // Fetch customer details to get last transaction date
          try {
            const res = await fetch(`/api/customers/${customer._id}`);
            const data = await res.json();
            // Find the last CUSTOMER_PURCHASE transaction
            const lastPurchase = data.transactions?.find(t => t.type === 'CUSTOMER_PURCHASE');
            return {
              ...customer,
              billDate: lastPurchase?.date || customer.createdAt || today,
            };
          } catch {
            return { ...customer, billDate: today };
          }
        })
    );
    
    // Sort by outstanding descending
    customersWithBillDate.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));
    
    // Table data
    const tableData = customersWithBillDate.map((customer) => [
      formatDateForPDF(customer.billDate),
      customer.name.toUpperCase(),
      (customer.outstanding || 0).toFixed(2),
      calculateDays(customer.billDate).toString(),
    ]);
    
    // Add table
    autoTable(doc, {
      startY: 50,
      head: [['BILL DATE', 'AGENCY', 'OUTSTANDING', 'NO. OF DAYS']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [0, 128, 192],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [128, 128, 128],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 128, 192],
        lineWidth: { top: 1, bottom: 1, left: 0.5, right: 0.5 },
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'left', fontStyle: 'bold', textColor: [0, 100, 0] },
        2: { halign: 'right', textColor: [128, 0, 128] },
        3: { halign: 'center', fontStyle: 'bold', textColor: [255, 0, 0] },
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
      didDrawCell: (data) => {
        // Add borders
        if (data.section === 'body' || data.section === 'head') {
          doc.setDrawColor(0, 128, 192);
          doc.setLineWidth(0.5);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      },
    });
    
    // Get the Y position after the table
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // TOTAL OUTSTANDING footer
    doc.setFillColor(0, 128, 128);
    doc.rect(14, finalY, 100, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL OUTSTANDING', 20, finalY + 8);
    
    // Total amount box
    doc.setFillColor(0, 100, 0);
    doc.rect(114, finalY, 60, 12, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(totalOutstanding.toFixed(2), 144, finalY + 8, { align: 'center' });
    
    // Draw bottom blue border
    doc.setFillColor(0, 128, 192);
    doc.rect(10, finalY + 20, pageWidth - 20, 3, 'F');
    
    // Save the PDF
    doc.save(`outstanding-report-${formatDateForPDF(today)}.pdf`);
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
        <h1 className="page-title">Outstanding</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadPDF}
            title="Download PDF"
          >
            📄 Download PDF
          </button>
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
