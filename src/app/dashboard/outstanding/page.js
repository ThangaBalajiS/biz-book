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
  const [loadingMore, setLoadingMore] = useState(false);
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
      const res = await fetch(`/api/customers/${customerId}?limit=10&skip=0`);
      const data = await res.json();
      setCustomerData(data);
      setSelectedCustomer(customerId);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
    }
  };

  const loadMoreTransactions = async () => {
    if (!selectedCustomer || !customerData) return;
    setLoadingMore(true);
    try {
      const skip = customerData.transactions.length;
      const res = await fetch(`/api/customers/${selectedCustomer}?limit=10&skip=${skip}`);
      const data = await res.json();
      setCustomerData(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...data.transactions],
      }));
    } catch (err) {
      console.error('Failed to load more transactions:', err);
    } finally {
      setLoadingMore(false);
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
    
    // Fetch all PDF data from server in a single request
    let pdfData;
    try {
      const res = await fetch('/api/outstanding/pdf-data');
      pdfData = await res.json();
    } catch (err) {
      console.error('Failed to fetch PDF data:', err);
      return;
    }
    
    const { businessName, totalOutstanding: serverTotal, customers: pdfCustomers } = pdfData;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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

    // Format date with month name for detail tables
    const formatDateShort = (date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };
    
    // Calculate days difference
    const calculateDays = (date) => {
      const billDate = new Date(date);
      const diffTime = Math.abs(today - billDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Format number with Indian comma system
    const formatIndianNumber = (num) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };
    
    // Draw top blue border
    doc.setFillColor(0, 128, 192);
    doc.rect(10, 10, pageWidth - 20, 3, 'F');
    
    // Business Name Header (dynamic)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(204, 102, 0); // Orange color
    doc.text(businessName.toUpperCase(), pageWidth / 2, 28, { align: 'center' });
    
    // AGENCY OUTSTANDING DETAILS subtitle
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 128); // Teal color
    doc.text('AGENCY OUTSTANDING DETAILS', 14, 42);
    
    // Current date on right
    doc.setFontSize(12);
    doc.setTextColor(128, 0, 128); // Purple color
    doc.text(formatDateForPDF(today), pageWidth - 14, 42, { align: 'right' });
    
    // ===== SUMMARY TABLE =====
    const summaryTableData = pdfCustomers.map((customer) => [
      formatDateForPDF(customer.billDate),
      customer.name.toUpperCase(),
      formatIndianNumber(customer.outstanding || 0),
      calculateDays(customer.billDate).toString(),
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['BILL DATE', 'AGENCY', 'OUTSTANDING', 'NO. OF DAYS']],
      body: summaryTableData,
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
        if (data.section === 'body' || data.section === 'head') {
          doc.setDrawColor(0, 128, 192);
          doc.setLineWidth(0.5);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      },
    });
    
    // Get the Y position after the summary table
    let currentY = doc.lastAutoTable.finalY + 10;
    
    // TOTAL OUTSTANDING footer
    doc.setFillColor(0, 128, 128);
    doc.rect(14, currentY, 100, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL OUTSTANDING', 20, currentY + 8);
    
    doc.setFillColor(0, 100, 0);
    doc.rect(114, currentY, 60, 12, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(formatIndianNumber(serverTotal), 144, currentY + 8, { align: 'center' });
    
    // ===== CUSTOMER-WISE DETAILS SECTION =====
    doc.addPage();
    
    doc.setFillColor(0, 128, 192);
    doc.rect(10, 10, pageWidth - 20, 3, 'F');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 128, 128);
    doc.text('CUSTOMER-WISE OUTSTANDING BREAKDOWN', pageWidth / 2, 25, { align: 'center' });
    
    currentY = 35;
    
    // Render each customer's section using server-calculated data
    for (let i = 0; i < pdfCustomers.length; i++) {
      const customer = pdfCustomers[i];
      
      if (currentY > pageHeight - 60) {
        doc.addPage();
        doc.setFillColor(0, 128, 192);
        doc.rect(10, 10, pageWidth - 20, 3, 'F');
        currentY = 20;
      }
      
      // Customer header bar
      doc.setFillColor(0, 128, 128);
      doc.rect(14, currentY, pageWidth - 28, 10, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${i + 1}. ${customer.name.toUpperCase()}`, 18, currentY + 7);
      doc.text(`Outstanding: Rs ${formatIndianNumber(customer.outstanding || 0)}`, pageWidth - 18, currentY + 7, { align: 'right' });
      
      currentY += 14;
      
      if (customer.contributingPurchases.length > 0) {
        const purchaseRows = customer.contributingPurchases.map(p => [
          formatDateShort(p.date),
          calculateDays(p.date).toString(),
          formatIndianNumber(p.originalAmount),
          formatIndianNumber(p.remaining),
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['DATE', 'DAYS PAST', 'BILL AMOUNT', 'PENDING AMOUNT']],
          body: purchaseRows,
          theme: 'grid',
          margin: { left: 18, right: 18 },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [240, 248, 255],
            textColor: [80, 80, 80],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 30 },
            1: { halign: 'left' },
            2: { halign: 'right', textColor: [100, 100, 100] },
            3: { halign: 'right', fontStyle: 'bold', textColor: [128, 0, 128] },
          },
          alternateRowStyles: {
            fillColor: [250, 250, 255],
          },
        });
        
        currentY = doc.lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('No purchase details available', 18, currentY + 5);
        currentY += 12;
      }
    }
    
    // Draw bottom blue border on the last page
    doc.setFillColor(0, 128, 192);
    doc.rect(10, pageHeight - 15, pageWidth - 20, 3, 'F');
    
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
                <>
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
                {customerData.transactions.length < customerData.total && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={loadMoreTransactions}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load More Transactions'}
                    </button>
                  </div>
                )}
                </>
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
