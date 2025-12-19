import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function CountsTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', location_ids: [], approval_required: false });
  const [selectedCount, setSelectedCount] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [userRole, setUserRole] = useState(null); // Would come from user context
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadCounts();
      loadLocations();
    }
    
    // Listen for create count event from header
    const handleCreateCount = () => {
      setShowModal(true);
    };
    
    window.addEventListener('inventory:create-count', handleCreateCount);
    return () => window.removeEventListener('inventory:create-count', handleCreateCount);
  }, [userEmail]);

  const loadCounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getCounts(userEmail);
      setCounts(data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load counts';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await inventoryApi.getLocations(userEmail);
      setLocations(data);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const handleBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      await inventoryApi.bootstrap(userEmail);
      setError(null);
      await loadCounts();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize database');
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleCreateCount = async () => {
    if (!formData.name || formData.location_ids.length === 0) {
      setError('Name and at least one location are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const countName = formData.name || `Count - ${new Date().toLocaleDateString()}`;
      await inventoryApi.createCount({ 
        name: countName, 
        location_ids: formData.location_ids,
        approval_required: formData.approval_required ? 1 : 0
      }, userEmail);
      setShowModal(false);
      setFormData({ name: '', location_ids: [], approval_required: false });
      await loadCounts();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create count');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCount = async (count) => {
    try {
      const fullCount = await inventoryApi.getCount(count.id, userEmail);
      const countApprovals = await inventoryApi.getCountApprovals(count.id, userEmail);
      setSelectedCount(fullCount);
      setApprovals(countApprovals);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load count details');
    }
  };

  const handleSubmitForApproval = async (count) => {
    if (!confirm('Submit this count for approval? It will be locked for review.')) {
      return;
    }

    try {
      setLoading(true);
      await inventoryApi.submitCountForApproval(count.id, userEmail, userRole);
      await loadCounts();
      alert('Count submitted for approval');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit for approval');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCount = async (approved, comments) => {
    if (!selectedCount) return;

    try {
      setLoading(true);
      await inventoryApi.approveCount(selectedCount.id, approved, comments, userEmail, userRole);
      await loadCounts();
      const updatedCount = await inventoryApi.getCount(selectedCount.id, userEmail);
      const countApprovals = await inventoryApi.getCountApprovals(selectedCount.id, userEmail);
      setSelectedCount(updatedCount);
      setApprovals(countApprovals);
      alert(approved ? 'Count approved' : 'Count rejected');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  // Check if error is a table missing error
  const isTableMissingError = error && (
    typeof error === 'string' && (
      error.includes('no such table: inventory_counts') ||
      error.includes('no such table')
    )
  );

  if (loading && counts.length === 0 && !error) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p>Loading counts...</p></div>;
  }

  return (
    <div>
      <InventoryErrorDisplay 
        error={error} 
        onRetry={isTableMissingError ? handleBootstrap : loadCounts}
        onDismiss={() => setError(null)}
      />

      {!isTableMissingError && (
        <>
          {counts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Started</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map(count => (
                    <tr key={count.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '1rem' }}>{count.name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: count.status === 'POSTED' ? '#d4edda' : count.status === 'SUBMITTED' ? '#cfe2ff' : '#fff3cd', color: count.status === 'POSTED' ? '#155724' : count.status === 'SUBMITTED' ? '#084298' : '#856404' }}>
                          {count.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{count.started_at ? new Date(count.started_at).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleViewCount(count)}
                          style={{ padding: '0.5rem 1rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}
                        >
                          View
                        </button>
                        {count.status === 'IN_PROGRESS' && (
                          <button 
                            onClick={() => handleSubmitForApproval(count)}
                            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#666', marginBottom: '1rem', fontSize: '1.1rem' }}>
                {locations.length === 0 
                  ? 'Create locations first to start counting'
                  : 'No counts found'}
              </p>
              {locations.length === 0 ? (
                <button 
                  onClick={() => window.location.href = '/settings/inventory/locations'} 
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Go to Locations
                </button>
              ) : (
                <button 
                  onClick={() => setShowModal(true)} 
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Create Your First Count
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Create Count</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={`Count - ${new Date().toLocaleDateString()}`} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Locations *</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
                {locations.map(location => (
                  <label key={location.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.location_ids.includes(location.id)} onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, location_ids: [...formData.location_ids, location.id] });
                      } else {
                        setFormData({ ...formData, location_ids: formData.location_ids.filter(id => id !== location.id) });
                      }
                    }} />
                    <span>{location.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.approval_required}
                  onChange={(e) => setFormData({ ...formData, approval_required: e.target.checked })}
                />
                <span>Require Approval (Cycle Count)</span>
              </label>
              <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666' }}>
                When enabled, this count must be approved before posting
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateCount} disabled={formData.location_ids.length === 0 || loading || bootstrapLoading} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (formData.location_ids.length === 0 || loading || bootstrapLoading) ? 0.5 : 1 }}>{loading || bootstrapLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedCount && (
        <CountDetailDrawer
          count={selectedCount}
          approvals={approvals}
          userRole={userRole}
          userEmail={userEmail}
          onClose={() => {
            setSelectedCount(null);
            setApprovals([]);
          }}
          onApprove={handleApproveCount}
          onRefresh={loadCounts}
        />
      )}
    </div>
  );
}

function CountDetailDrawer({ count, approvals, userRole, userEmail, onClose, onApprove, onRefresh }) {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [approving, setApproving] = useState(false);
  const [countLines, setCountLines] = useState(count.lines || []);
  const [editingLines, setEditingLines] = useState({});

  useEffect(() => {
    setCountLines(count.lines || []);
  }, [count]);

  const canApprove = count.status === 'SUBMITTED' && (userRole === 'manager' || userRole === 'admin');
  const pendingApproval = approvals.some(a => a.status === 'PENDING');
  const canEdit = count.status === 'IN_PROGRESS';

  const handleUpdateCountLine = async (lineId, countedQty) => {
    if (!canEdit) return;
    
    setEditingLines({ ...editingLines, [lineId]: countedQty });
    
    // Auto-save after a short delay
    setTimeout(async () => {
      try {
        const updatedLines = countLines.map(line => 
          line.id === lineId 
            ? { ...line, counted_qty: countedQty }
            : line
        );
        await inventoryApi.updateCountLines(count.id, updatedLines.map(line => ({
          id: line.id,
          counted_qty: line.counted_qty,
          last_counted_qty: line.last_counted_qty
        })), userEmail);
        setCountLines(updatedLines);
        setEditingLines({});
      } catch (err) {
        console.error('Error updating count line:', err);
      }
    }, 500);
  };

  const handleApproveClick = (approved) => {
    setShowApprovalModal(true);
    setApproving(approved);
  };

  const handleConfirmApproval = async () => {
    await onApprove(approving, approvalComments);
    setShowApprovalModal(false);
    setApprovalComments('');
  };

  // Group lines by location for shelf-to-sheet display
  const linesByLocation = {};
  countLines.forEach(line => {
    if (!linesByLocation[line.location_id]) {
      linesByLocation[line.location_id] = [];
    }
    linesByLocation[line.location_id].push(line);
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '700px',
      maxWidth: '90vw',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1001,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{count.name}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div><strong>Status:</strong> {count.status}</div>
        <div><strong>Started:</strong> {count.started_at ? new Date(count.started_at).toLocaleString() : '-'}</div>
        {count.submitted_at && <div><strong>Submitted:</strong> {new Date(count.submitted_at).toLocaleString()}</div>}
        {count.approval_required && <div style={{ color: '#856404', fontWeight: '600' }}>⚠️ Approval Required</div>}
      </div>

      {count.approval_required && approvals.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Approval History</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {approvals.map(approval => (
              <div key={approval.id} style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '4px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div><strong>{approval.approver_role || 'User'}:</strong> {approval.status}</div>
                    {approval.comments && <div style={{ color: '#666', marginTop: '0.25rem' }}>{approval.comments}</div>}
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    backgroundColor: approval.status === 'APPROVED' ? '#d4edda' : approval.status === 'REJECTED' ? '#f8d7da' : '#fff3cd',
                    color: approval.status === 'APPROVED' ? '#155724' : approval.status === 'REJECTED' ? '#721c24' : '#856404'
                  }}>
                    {approval.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  {new Date(approval.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canApprove && pendingApproval && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleApproveClick(true)}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Approve
          </button>
          <button
            onClick={() => handleApproveClick(false)}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Reject
          </button>
        </div>
      )}

      {count.status === 'APPROVED' && (
        <button
          onClick={async () => {
            if (!confirm('Post this approved count? This will update inventory quantities.')) return;
            try {
              await inventoryApi.postCount(count.id, userEmail);
              alert('Count posted successfully!');
              onRefresh();
              onClose();
            } catch (err) {
              alert(err.response?.data?.error || err.message || 'Failed to post count');
            }
          }}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginBottom: '1rem' }}
        >
          Post Count
        </button>
      )}

      {countLines.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.5rem' }}>Count Lines (Shelf Order)</h4>
          {Object.entries(linesByLocation).map(([locationId, lines]) => {
            const locationName = lines[0]?.location_name || 'Unknown';
            // Sort by shelf order if available
            const sortedLines = [...lines].sort((a, b) => (a.shelf_order || 0) - (b.shelf_order || 0));
            
            return (
              <div key={locationId} style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ marginBottom: '0.5rem', color: '#666' }}>{locationName}</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Expected</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Counted</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLines.map(line => {
                        const countedQty = editingLines[line.id] !== undefined ? editingLines[line.id] : (line.counted_qty || '');
                        return (
                          <tr key={line.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '0.5rem' }}>{line.item_name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{line.expected_qty || 0} {line.base_uom}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              {canEdit ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={countedQty}
                                  onChange={(e) => handleUpdateCountLine(line.id, parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  style={{
                                    width: '80px',
                                    padding: '0.25rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    textAlign: 'right'
                                  }}
                                />
                              ) : (
                                <span>{line.counted_qty !== null ? `${line.counted_qty} ${line.base_uom}` : '-'}</span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '0.5rem', 
                              textAlign: 'right',
                              color: line.variance_qty > 0 ? '#28a745' : line.variance_qty < 0 ? '#dc3545' : '#666',
                              fontWeight: '600'
                            }}>
                              {line.variance_qty !== null ? `${line.variance_qty > 0 ? '+' : ''}${line.variance_qty}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showApprovalModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }} onClick={() => setShowApprovalModal(false)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{approving ? 'Approve' : 'Reject'} Count</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Comments (optional)</label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', minHeight: '100px', boxSizing: 'border-box' }}
                placeholder={approving ? 'Add approval notes...' : 'Explain why this count is being rejected...'}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApprovalModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmApproval} style={{ padding: '0.75rem 1.5rem', backgroundColor: approving ? '#28a745' : '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                {approving ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
