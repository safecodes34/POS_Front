import React from 'react';

export default function ImportResults({ result, onReset, onViewInvoice }) {
  if (!result) {
    return null;
  }

  const { invoice, inventoryUpdated, usageSummary } = result;

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, color: '#1e3a5f' }}>Import Complete</h3>
        <button
          onClick={onReset}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Import Another
        </button>
      </div>

      {/* Invoice Metadata */}
      <div style={{
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f' }}>Invoice Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <strong>Supplier:</strong> {invoice?.supplierName || 'N/A'}
          </div>
          <div>
            <strong>Invoice #:</strong> {invoice?.invoiceNo || 'N/A'}
          </div>
          <div>
            <strong>Date:</strong> {invoice?.invoiceDate || 'N/A'}
          </div>
          <div>
            <strong>Total:</strong> ${invoice?.total?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Inventory Updated Summary */}
      {inventoryUpdated && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#155724' }}>Inventory Updated</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <strong>Items Updated:</strong> {inventoryUpdated.itemsUpdated || 0}
            </div>
            <div>
              <strong>Items Created:</strong> {inventoryUpdated.itemsCreated || 0}
            </div>
          </div>
          {inventoryUpdated.onHandChanges && inventoryUpdated.onHandChanges.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>On-Hand Changes:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                {inventoryUpdated.onHandChanges.slice(0, 5).map((change, idx) => (
                  <li key={idx} style={{ fontSize: '0.9rem' }}>
                    +{change.qtyAdded} units
                  </li>
                ))}
                {inventoryUpdated.onHandChanges.length > 5 && (
                  <li style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                    ... and {inventoryUpdated.onHandChanges.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Usage Summary */}
      {usageSummary && usageSummary.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#1e3a5f' }}>Usage Since Last Invoice</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Purchased</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Used</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {usageSummary.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '0.5rem' }}>{item.itemName}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.purchasedQty.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.usedQty.toFixed(2)}</td>
                    <td style={{ 
                      padding: '0.5rem', 
                      textAlign: 'right',
                      color: item.estimatedRemaining < 0 ? '#dc3545' : '#28a745',
                      fontWeight: item.estimatedRemaining < 0 ? '600' : 'normal'
                    }}>
                      {item.estimatedRemaining.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        {result.invoiceId && (
          <button
            onClick={onViewInvoice}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            View Invoice
          </button>
        )}
      </div>
    </div>
  );
}




