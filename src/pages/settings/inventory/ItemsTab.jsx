import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function ItemsTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    base_uom: 'each',
    track_inventory: true,
    active: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    if (userEmail) {
      loadItems();
    }
    
    // Listen for add item event from header
    const handleAddItem = () => {
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
      setShowModal(true);
    };
    
    // Listen for inventory updates (e.g., from menu import)
    const handleItemsUpdated = () => {
      console.log('🔄 Inventory items updated, refreshing...');
      loadItems();
    };
    
    window.addEventListener('inventory:add-item', handleAddItem);
    window.addEventListener('inventory:items-updated', handleItemsUpdated);
    
    return () => {
      window.removeEventListener('inventory:add-item', handleAddItem);
      window.removeEventListener('inventory:items-updated', handleItemsUpdated);
    };
  }, [userEmail]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getItems(userEmail);
      setItems(data);
    } catch (err) {
      console.error('Error loading items:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_uom) {
      setError('Name and Base UOM are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (editingItem) {
        await inventoryApi.updateItem(editingItem.id, formData, userEmail);
      } else {
        await inventoryApi.createItem(formData, userEmail);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
      await loadItems();
    } catch (err) {
      console.error('Error saving item:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || '',
      category: item.category || '',
      base_uom: item.base_uom,
      track_inventory: item.track_inventory !== 0,
      active: item.active !== 0
    });
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This will set it to inactive instead of deleting if it has movements.`)) {
      return;
    }

    try {
      setLoading(true);
      // Soft delete by setting active=false
      await inventoryApi.updateItem(item.id, { active: false }, userEmail);
      await loadItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (item) => {
    try {
      const details = await inventoryApi.getItem(item.id, userEmail);
      setSelectedItem(details);
    } catch (err) {
      console.error('Error loading item details:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load item details');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && item.active !== 0) ||
      (filterActive === 'inactive' && item.active === 0);
    
    return matchesSearch && matchesFilter;
  });

  if (loading && items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading items...</p>
      </div>
    );
  }

  return (
    <div>
      <InventoryErrorDisplay 
        error={error} 
        onRetry={loadItems}
        onDismiss={() => setError(null)}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '200px',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          <option value="all">All Items</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Items Table */}
      {filteredItems.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Category</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Base UOM</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Track Inventory</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr 
                  key={item.id} 
                  style={{ borderBottom: '1px solid #e0e0e0', cursor: 'pointer' }}
                  onClick={() => handleViewDetails(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{item.sku || '-'}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{item.category || '-'}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{item.base_uom}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      backgroundColor: item.track_inventory !== 0 ? '#d4edda' : '#f8d7da',
                      color: item.track_inventory !== 0 ? '#155724' : '#721c24'
                    }}>
                      {item.track_inventory !== 0 ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      backgroundColor: item.active !== 0 ? '#d4edda' : '#f8d7da',
                      color: item.active !== 0 ? '#155724' : '#721c24'
                    }}>
                      {item.active !== 0 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleViewDetails(item)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Edit
                      </button>
                      {item.active !== 0 && (
                        <button
                          onClick={() => handleDelete(item)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
            {searchTerm || filterActive !== 'all' ? 'No items match your filters' : 'No items found'}
          </p>
          {!searchTerm && filterActive === 'all' && (
            <div>
              <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                Add ingredients & supplies you track.
              </p>
              <button
                onClick={() => {
                  setFormData({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
                  setShowModal(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                Create Your First Item
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item Modal */}
      {showModal && (
        <ItemModal
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
            setFormData({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
          }}
          loading={loading}
        />
      )}

      {/* Item Detail Drawer */}
      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          userEmail={userEmail}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function ItemModal({ editingItem, formData, setFormData, onSave, onClose, loading }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
          {editingItem ? 'Edit Item' : 'Add Item'}
        </h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            SKU
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Base Unit of Measure *
          </label>
          <select
            value={formData.base_uom}
            onChange={(e) => setFormData({ ...formData, base_uom: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="each">Each</option>
            <option value="lb">Pound (lb)</option>
            <option value="oz">Ounce (oz)</option>
            <option value="g">Gram (g)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="l">Liter (l)</option>
            <option value="ml">Milliliter (ml)</option>
            <option value="gal">Gallon (gal)</option>
          </select>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            Base UOM is required for consistency in counts and receiving. All quantities will be normalized to this unit.
          </p>
          {formData.base_uom && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>
              Example: If you buy in pounds but count in ounces, set base UOM to "oz" and convert during receiving.
            </p>
          )}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.track_inventory}
              onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
            />
            Track Inventory
          </label>
          <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666', marginLeft: '1.5rem' }}>
            When enabled, this item will be included in counts, receiving, and on-hand tracking.
          </p>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!formData.name || !formData.base_uom || loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!formData.name || !formData.base_uom || loading) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: (!formData.name || !formData.base_uom || loading) ? 0.5 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemDetailDrawer({ item, userEmail, onClose }) {
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (item && item.onHand && item.onHand.length > 0 && selectedLocation) {
      loadLots(selectedLocation);
    }
  }, [item, selectedLocation]);

  const loadLots = async (locationId) => {
    try {
      setLoadingLots(true);
      const data = await inventoryApi.getLots(item.id, locationId, userEmail);
      setLots(data);
    } catch (err) {
      console.error('Error loading lots:', err);
    } finally {
      setLoadingLots(false);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'none', color: '#666' };
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: '#dc3545', days: daysUntilExpiry };
    if (daysUntilExpiry <= 3) return { status: 'expiring', color: '#ffc107', days: daysUntilExpiry };
    if (daysUntilExpiry <= 7) return { status: 'soon', color: '#ff9800', days: daysUntilExpiry };
    return { status: 'good', color: '#28a745', days: daysUntilExpiry };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '500px',
      maxWidth: '90vw',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1001,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Item Details</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>{item.name}</h3>
        <div style={{ color: '#666', marginBottom: '1rem' }}>
          <div><strong>SKU:</strong> {item.sku || '-'}</div>
          <div><strong>Category:</strong> {item.category || '-'}</div>
          <div><strong>Base UOM:</strong> {item.base_uom}</div>
          <div><strong>Track Inventory:</strong> {item.track_inventory !== 0 ? 'Yes' : 'No'}</div>
          <div><strong>Status:</strong> {item.active !== 0 ? 'Active' : 'Inactive'}</div>
        </div>
      </div>
      {item.onHand && item.onHand.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>On-Hand by Location</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {item.onHand.map((oh, idx) => (
              <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <div><strong>{oh.location_name}:</strong> {oh.on_hand_qty} {item.base_uom}</div>
                    {oh.avg_cost && <div style={{ fontSize: '0.9rem', color: '#666' }}>Avg Cost: ${oh.avg_cost.toFixed(2)}</div>}
                  </div>
                  <button
                    onClick={() => setSelectedLocation(selectedLocation === oh.location_id ? null : oh.location_id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: selectedLocation === oh.location_id ? '#1e3a5f' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {selectedLocation === oh.location_id ? 'Hide Lots' : 'View Lots'}
                  </button>
                </div>
                {selectedLocation === oh.location_id && (
                  <LotsView 
                    lots={lots} 
                    loading={loadingLots}
                    baseUom={item.base_uom}
                    getExpiryStatus={getExpiryStatus}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LotsView({ lots, loading, baseUom, getExpiryStatus }) {
  if (loading) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Loading lots...</div>;
  }

  if (lots.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>No lots tracked for this location</div>;
  }

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>Lots (FIFO Order):</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {lots.map((lot, idx) => {
          const expiryStatus = getExpiryStatus(lot.expiry_date);
          return (
            <div key={lot.id} style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div><strong>Lot:</strong> {lot.lot_number || `#${idx + 1}`}</div>
                  <div><strong>Qty:</strong> {lot.remaining_qty} {baseUom} (of {lot.initial_qty})</div>
                  <div><strong>Received:</strong> {new Date(lot.received_date).toLocaleDateString()}</div>
                  {lot.expiry_date && (
                    <div style={{ color: expiryStatus.color, fontWeight: '600' }}>
                      <strong>Expires:</strong> {new Date(lot.expiry_date).toLocaleDateString()} 
                      {expiryStatus.days !== undefined && ` (${expiryStatus.days > 0 ? `${expiryStatus.days} days` : 'EXPIRED'})`}
                    </div>
                  )}
                </div>
                {lot.expiry_date && (
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: expiryStatus.color,
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {expiryStatus.status === 'expired' ? 'EXPIRED' : 
                     expiryStatus.status === 'expiring' ? 'EXPIRING' :
                     expiryStatus.status === 'soon' ? 'SOON' : 'OK'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

