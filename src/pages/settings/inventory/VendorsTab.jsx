import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function VendorsTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'MANUAL' });

  useEffect(() => {
    if (userEmail) {
      loadVendors();
    }
    
    // Listen for add vendor event from header
    const handleAddVendor = () => {
      setEditingVendor(null);
      setFormData({ name: '', type: 'MANUAL' });
      setShowModal(true);
    };
    
    window.addEventListener('inventory:add-vendor', handleAddVendor);
    return () => window.removeEventListener('inventory:add-vendor', handleAddVendor);
  }, [userEmail]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getVendors(userEmail);
      setVendors(data);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (editingVendor) {
        await inventoryApi.updateVendor(editingVendor.id, formData, userEmail);
      } else {
        await inventoryApi.createVendor(formData, userEmail);
      }
      setShowModal(false);
      setEditingVendor(null);
      setFormData({ name: '', type: 'MANUAL' });
      await loadVendors();
    } catch (err) {
      console.error('Error saving vendor:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  if (loading && vendors.length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p>Loading vendors...</p></div>;
  }

  const handleViewVendor = async (vendor) => {
    try {
      const fullVendor = await inventoryApi.getVendor(vendor.id, userEmail);
      setSelectedVendor(fullVendor);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load vendor details');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div style={{ flex: '0 0 300px' }}>
        <InventoryErrorDisplay 
          error={error} 
          onRetry={loadVendors}
          onDismiss={() => setError(null)}
        />
        
        {vendors.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vendors.map(vendor => (
              <div
                key={vendor.id}
                onClick={() => handleViewVendor(vendor)}
                style={{
                  padding: '1rem',
                  backgroundColor: selectedVendor?.id === vendor.id ? '#e7f3ff' : '#f8f9fa',
                  borderRadius: '8px',
                  border: selectedVendor?.id === vendor.id ? '2px solid #1e3a5f' : '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedVendor?.id !== vendor.id) {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedVendor?.id !== vendor.id) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }
                }}
              >
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{vendor.name}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Type: {vendor.type}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '1.1rem' }}>No vendors found</p>
            <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Optional: Import Sysco order guides (CSV)
            </p>
            <button 
              onClick={() => { setFormData({ name: '', type: 'MANUAL' }); setShowModal(true); }} 
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              Create Your First Vendor
            </button>
          </div>
        )}
      </div>

      {selectedVendor && (
        <VendorDetailPanel vendor={selectedVendor} userEmail={userEmail} onClose={() => setSelectedVendor(null)} onRefresh={loadVendors} />
      )}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="MANUAL">Manual</option>
                <option value="SYSCO">Sysco</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={!formData.name || loading} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!formData.name || loading) ? 0.5 : 1 }}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorDetailPanel({ vendor, userEmail, onClose, onRefresh }) {
  const [items, setItems] = useState([]);
  const [mappingItem, setMappingItem] = useState(null);
  const [mappingToItemId, setMappingToItemId] = useState('');

  useEffect(() => {
    if (vendor) {
      setItems(vendor.items || []);
    }
  }, [vendor]);

  const handleMapItem = async (vendorItemId, inventoryItemId) => {
    try {
      // Update vendor item mapping
      await inventoryApi.updateVendor(vendor.id, {}, userEmail); // This would need a proper endpoint
      await onRefresh();
      const updatedVendor = await inventoryApi.getVendor(vendor.id, userEmail);
      setItems(updatedVendor.items || []);
      setMappingItem(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to map item');
    }
  };

  const unmappedItems = items.filter(item => !item.inventory_item_id);
  const mappedItems = items.filter(item => item.inventory_item_id);

  return (
    <div style={{ flex: 1, padding: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>{vendor.name}</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>Type: {vendor.type}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>×</button>
      </div>

      {vendor.type !== 'MANUAL' && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
          <button
            onClick={() => {
              // Trigger import order guide
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                  try {
                    await inventoryApi.importOrderGuide(vendor.id, file, userEmail);
                    alert('Order guide imported successfully!');
                    await onRefresh();
                    const updatedVendor = await inventoryApi.getVendor(vendor.id, userEmail);
                    setItems(updatedVendor.items || []);
                  } catch (err) {
                    alert(err.response?.data?.error || err.message || 'Failed to import order guide');
                  }
                }
              };
              input.click();
            }}
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
            Import Order Guide (CSV)
          </button>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Vendor Items</h3>
        {items.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Code</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Last Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Mapped Item</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '0.75rem' }}>{item.vendor_description || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{item.vendor_item_code}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.last_cost ? `$${item.last_cost.toFixed(2)}` : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {item.mapped_item_name ? (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: '#d4edda', color: '#155724' }}>
                          Mapped: {item.mapped_item_name}
                        </span>
                      ) : (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', backgroundColor: '#fff3cd', color: '#856404' }}>
                          Unmapped
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {!item.mapped_item_name && (
                        <button
                          onClick={() => setMappingItem(item)}
                          style={{ padding: '0.5rem 1rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Map to Item
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No vendor items found. Import an order guide to get started.</p>
        )}
      </div>

      {mappingItem && (
        <MappingModal
          vendorItem={mappingItem}
          vendorId={vendor.id}
          userEmail={userEmail}
          onClose={() => setMappingItem(null)}
          onMapped={async () => {
            await onRefresh();
            const updatedVendor = await inventoryApi.getVendor(vendor.id, userEmail);
            setItems(updatedVendor.items || []);
            setMappingItem(null);
          }}
        />
      )}
    </div>
  );
}

function MappingModal({ vendorItem, vendorId, userEmail, onClose, onMapped }) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const items = await inventoryApi.getItems(userEmail);
      setInventoryItems(items.filter(item => item.active !== 0));
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handleMap = async () => {
    if (!selectedItemId) {
      alert('Please select an item or create a new one');
      return;
    }
    // This would need a proper API endpoint to map vendor items
    // For now, just close
    onMapped();
  };

  const handleCreateItem = async () => {
    try {
      setCreating(true);
      const newItem = await inventoryApi.createItem({
        name: vendorItem.vendor_description,
        base_uom: vendorItem.vendor_uom || 'each',
        track_inventory: true,
        active: true
      }, userEmail);
      setSelectedItemId(newItem.id);
      await handleMap();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Map Vendor Item</h3>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Vendor Item:</strong> {vendorItem.vendor_description} ({vendorItem.vendor_item_code})
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Inventory Item</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
          >
            <option value="">Select an item...</option>
            {inventoryItems.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleMap}
            disabled={!selectedItemId}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: !selectedItemId ? 0.5 : 1 }}
          >
            Map to Selected
          </button>
          <button
            onClick={handleCreateItem}
            disabled={creating}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: creating ? 0.5 : 1 }}
          >
            {creating ? 'Creating...' : 'Create New Item'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

