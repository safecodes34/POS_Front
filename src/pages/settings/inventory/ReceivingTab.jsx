import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';
import InvoiceImport from './InvoiceImport';

export default function ReceivingTab({ userEmail }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({ vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0] });
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadInvoices();
      loadVendors();
    }
    
    // Listen for create invoice event from header
    const handleCreateInvoice = () => {
      setShowModal(true);
    };
    
    window.addEventListener('inventory:create-invoice', handleCreateInvoice);
    return () => window.removeEventListener('inventory:create-invoice', handleCreateInvoice);
  }, [userEmail]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getInvoices(userEmail);
      setInvoices(data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load invoices';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await inventoryApi.getVendors(userEmail);
      setVendors(data);
    } catch (err) {
      console.error('Error loading vendors:', err);
    }
  };

  const handleBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      await inventoryApi.bootstrap(userEmail);
      setError(null);
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize database');
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!formData.vendor_id || !formData.invoice_date) {
      setError('Vendor and invoice date are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const invoice = await inventoryApi.createInvoice(formData, userEmail);
      setShowModal(false);
      setFormData({ vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0] });
      await loadInvoices();
      // Open the new invoice for editing
      const fullInvoice = await inventoryApi.getInvoice(invoice.id, userEmail);
      setSelectedInvoice(fullInvoice);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      const fullInvoice = await inventoryApi.getInvoice(invoice.id, userEmail);
      setSelectedInvoice(fullInvoice);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load invoice');
    }
  };

  // Check if error is a table missing error
  const isTableMissingError = error && (
    typeof error === 'string' && (
      error.includes('no such table: inventory_invoices') ||
      error.includes('no such table')
    )
  );

  if (loading && invoices.length === 0 && !error) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p>Loading invoices...</p></div>;
  }

  const handleImportComplete = async (result) => {
    // Refresh invoices list
    await loadInvoices();
    // Optionally show the imported invoice
    if (result?.invoiceId) {
      const fullInvoice = await inventoryApi.getInvoice(result.invoiceId, userEmail);
      setSelectedInvoice(fullInvoice);
    }
    setShowImport(false);
  };

  return (
    <div>
      <InventoryErrorDisplay 
        error={error} 
        onRetry={isTableMissingError ? handleBootstrap : loadInvoices}
        onDismiss={() => setError(null)}
      />

      {!isTableMissingError && (
        <>
          {/* Invoice Import Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#1e3a5f' }}>Receive Delivery</h2>
              {!showImport && (
                <button
                  onClick={() => setShowImport(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Upload Invoice
                </button>
              )}
            </div>
            
            {showImport && (
              <div style={{ marginBottom: '2rem' }}>
                <InvoiceImport 
                  userEmail={userEmail} 
                  onComplete={handleImportComplete}
                />
              </div>
            )}
          </div>
        </>
      )}

      {!isTableMissingError && !showImport && (
        <>
          {invoices.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Invoice #</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Vendor</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '1rem' }}>{invoice.invoice_number || '-'}</td>
                      <td style={{ padding: '1rem' }}>{invoice.vendor_name}</td>
                      <td style={{ padding: '1rem' }}>{invoice.invoice_date}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: invoice.status === 'POSTED' ? '#d4edda' : '#fff3cd', color: invoice.status === 'POSTED' ? '#155724' : '#856404' }}>
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button onClick={() => handleViewInvoice(invoice)} style={{ padding: '0.5rem 1rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#666', marginBottom: '1rem', fontSize: '1.1rem' }}>
                {vendors.length === 0 
                  ? 'Create a vendor first to start receiving invoices'
                  : 'No invoices found'}
              </p>
              {vendors.length === 0 ? (
                <button 
                  onClick={() => navigate('/settings/inventory/vendors')} 
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Go to Vendors
                </button>
              ) : (
                <button 
                  onClick={() => setShowModal(true)} 
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Receive Your First Delivery
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Receive Delivery</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Vendor *</label>
              <select value={formData.vendor_id} onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="">Select vendor...</option>
                {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Invoice Number</label>
              <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Invoice Date *</label>
              <input type="date" value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateInvoice} disabled={!formData.vendor_id || !formData.invoice_date || loading || bootstrapLoading} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!formData.vendor_id || !formData.invoice_date || loading || bootstrapLoading) ? 0.5 : 1 }}>{loading || bootstrapLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceDetailDrawer invoice={selectedInvoice} userEmail={userEmail} onClose={() => setSelectedInvoice(null)} onRefresh={loadInvoices} />
      )}
    </div>
  );
}

function InvoiceDetailDrawer({ invoice, userEmail, onClose, onRefresh }) {
  const [posting, setPosting] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (invoice && userEmail) {
      loadItems();
    }
  }, [invoice, userEmail]);

  const loadItems = async () => {
    try {
      const data = await inventoryApi.getItems(userEmail);
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this invoice? This will create stock movements and update on-hand quantities.')) {
      return;
    }

    try {
      setPosting(true);
      await inventoryApi.postInvoice(invoice.id, userEmail);
      await onRefresh();
      onClose();
      alert('Invoice posted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post invoice');
    } finally {
      setPosting(false);
    }
  };

  const unmappedLines = (invoice.lines || []).filter(line => !line.mapped_inventory_item_id);
  const canPost = invoice.status === 'DRAFT' && unmappedLines.length === 0 && (invoice.lines || []).length > 0;

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '600px', maxWidth: '90vw', backgroundColor: 'white', boxShadow: '-2px 0 8px rgba(0,0,0,0.1)', zIndex: 1001, overflowY: 'auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Invoice {invoice.invoice_number || invoice.id.slice(0, 8)}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <div><strong>Vendor:</strong> {invoice.vendor_name}</div>
        <div><strong>Date:</strong> {invoice.invoice_date}</div>
        <div><strong>Status:</strong> {invoice.status}</div>
      </div>
      {unmappedLines.length > 0 && (
        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong>Warning:</strong> {unmappedLines.length} line(s) are not mapped to inventory items. Map all lines before posting.
        </div>
      )}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Lines</h3>
        {invoice.lines && invoice.lines.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invoice.lines.map(line => (
              <div key={line.id} style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div><strong>{line.description}</strong></div>
                <div>Qty: {line.qty} {line.uom} @ ${line.unit_cost} = ${(line.qty * line.unit_cost).toFixed(2)}</div>
                <div>Mapped to: {line.mapped_item_name || 'Not mapped'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No lines added yet</p>
        )}
      </div>
      {invoice.status === 'DRAFT' && canPost && (
        <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          {posting ? 'Posting...' : 'Post Invoice'}
        </button>
      )}
    </div>
  );
}
