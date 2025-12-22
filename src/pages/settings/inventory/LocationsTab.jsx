import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function LocationsTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  useEffect(() => {
    if (userEmail) {
      loadLocations();
    }
  }, [userEmail]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getLocations(userEmail);
      setLocations(data);
    } catch (err) {
      console.error('Error loading locations:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load locations');
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
      if (editingLocation) {
        await inventoryApi.updateLocation(editingLocation.id, formData, userEmail);
      } else {
        await inventoryApi.createLocation(formData, userEmail);
      }
      setShowModal(false);
      setEditingLocation(null);
      setFormData({ name: '', sort_order: 0 });
      await loadLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (location) => {
    if (!location || !location.id) {
      console.error('Invalid location object:', location);
      return;
    }
    
    try {
      const items = await inventoryApi.getLocationItems(location.id, userEmail);
      setSelectedLocation({ ...location, items: Array.isArray(items) ? items : [] });
    } catch (err) {
      console.error('Error loading location details:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load location details');
    }
  };

  const handleEditLocation = (location, e) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering the card click
    }
    setEditingLocation(location);
    setFormData({
      name: location.name,
      sort_order: location.sort_order || 0
    });
    setShowModal(true);
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      await inventoryApi.deleteLocation(locationToDelete.id, userEmail);
      setShowDeleteConfirm(false);
      setLocationToDelete(null);
      setSelectedLocation(null); // Close the detail drawer if it's open
      await loadLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Listen for add location event from header
    const handleAddLocation = () => {
      setEditingLocation(null);
      setFormData({ name: '', sort_order: 0 });
      setShowModal(true);
    };
    
    window.addEventListener('inventory:add-location', handleAddLocation);
    return () => window.removeEventListener('inventory:add-location', handleAddLocation);
  }, []);

  if (loading && locations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading locations...</p>
      </div>
    );
  }

  return (
    <div>
      <InventoryErrorDisplay 
        error={error} 
        onRetry={loadLocations}
        onDismiss={() => setError(null)}
      />

      {locations && locations.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {locations.filter(loc => loc && loc.id).map(location => (
            <div
              key={location.id}
              style={{
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div onClick={() => handleViewDetails(location)} style={{ cursor: 'pointer' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
                  {location.name}
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                  Sort Order: {location.sort_order}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No locations found</p>
          <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Examples: Walk-in, Dry Storage, Bar, Freezer
          </p>
          <button
            onClick={() => {
              setFormData({ name: '', sort_order: 0 });
              setShowModal(true);
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
            Create Your First Location
          </button>
        </div>
      )}

      {showModal && (
        <LocationModal
          editingLocation={editingLocation}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingLocation(null);
            setFormData({ name: '', sort_order: 0 });
          }}
          loading={loading}
        />
      )}

      {selectedLocation && (
        <LocationDetailDrawer
          location={selectedLocation}
          userEmail={userEmail}
          onClose={() => setSelectedLocation(null)}
          onRefresh={loadLocations}
          onEdit={() => handleEditLocation(selectedLocation)}
          onDelete={() => {
            setLocationToDelete(selectedLocation);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && locationToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }} onClick={() => { setShowDeleteConfirm(false); setLocationToDelete(null); }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#dc3545' }}>Confirm Delete</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Are you sure you want to delete <strong>{locationToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowDeleteConfirm(false); setLocationToDelete(null); }} 
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteLocation} 
                disabled={loading}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationModal({ editingLocation, formData, setFormData, onSave, onClose, loading }) {
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
        maxWidth: '400px',
        width: '90%'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
          {editingLocation ? 'Edit Location' : 'Add Location'}
        </h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Sort Order</label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!formData.name || loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (!formData.name || loading) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: (!formData.name || loading) ? 0.5 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationDetailDrawer({ location, userEmail, onClose, onRefresh, onEdit, onDelete }) {
  const [assigningItem, setAssigningItem] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ inventory_item_id: '', shelf_order: 0, par_level: '', reorder_point: '' });
  const [locationItems, setLocationItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  
  // Initialize locationItems from location prop
  useEffect(() => {
    if (location && location.items) {
      setLocationItems(Array.isArray(location.items) ? location.items : []);
    } else {
      setLocationItems([]);
    }
  }, [location]);
  

  const handleAssignItem = async () => {
    if (!assignmentForm.inventory_item_id) {
      alert('Please select an item');
      return;
    }

    try {
      await inventoryApi.assignItemToLocation(location.id, {
        inventory_item_id: assignmentForm.inventory_item_id,
        shelf_order: assignmentForm.shelf_order || 0,
        par_level: assignmentForm.par_level ? parseFloat(assignmentForm.par_level) : null,
        reorder_point: assignmentForm.reorder_point ? parseFloat(assignmentForm.reorder_point) : null
      }, userEmail);
      setShowAssignModal(false);
      setAssignmentForm({ inventory_item_id: '', shelf_order: 0, par_level: '', reorder_point: '' });
      // Reload location items
      const items = await inventoryApi.getLocationItems(location.id, userEmail);
      location.items = items;
      setLocationItems(items);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to assign item');
    }
  };

  const loadAvailableItems = async () => {
    try {
      const items = await inventoryApi.getItems(userEmail);
      const assignedIds = new Set((location.items || []).map(li => li.inventory_item_id));
      setAvailableItems(items.filter(item => item.active !== 0 && !assignedIds.has(item.id)));
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  useEffect(() => {
    if (showAssignModal) {
      loadAvailableItems();
    }
  }, [showAssignModal]);

  const handleMoveItem = async (itemId, direction) => {
    if (!locationItems || locationItems.length === 0) return;
    
    const sortedItems = [...locationItems].sort((a, b) => (a.shelf_order || 0) - (b.shelf_order || 0));
    const index = sortedItems.findIndex(item => item && item.id === itemId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedItems.length) return;
    
    // Swap shelf orders
    const temp = sortedItems[index].shelf_order || 0;
    sortedItems[index].shelf_order = sortedItems[newIndex].shelf_order || 0;
    sortedItems[newIndex].shelf_order = temp;
    
    // Update in database
    try {
      await inventoryApi.reorderLocationItems(location.id, sortedItems.map(item => ({
        id: item.id,
        shelf_order: item.shelf_order || 0
      })), userEmail);
      setLocationItems(sortedItems);
      onRefresh();
    } catch (err) {
      console.error('Error reordering items:', err);
      alert(err.response?.data?.error || err.message || 'Failed to reorder items');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const item = locationItems.find(li => li.id === itemId);
      if (!item || !item.inventory_item_id) {
        alert('Item not found or missing inventory_item_id');
        return;
      }
      
      await inventoryApi.assignItemToLocation(location.id, {
        inventory_item_id: item.inventory_item_id,
        shelf_order: updates.shelf_order !== undefined ? updates.shelf_order : (item.shelf_order || 0),
        par_level: updates.par_level !== undefined ? (updates.par_level === '' ? null : parseFloat(updates.par_level)) : item.par_level,
        reorder_point: updates.reorder_point !== undefined ? (updates.reorder_point === '' ? null : parseFloat(updates.reorder_point)) : item.reorder_point
      }, userEmail);
      const items = await inventoryApi.getLocationItems(location.id, userEmail);
      setLocationItems(items);
      setEditingItem(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update item');
    }
  };

  // Safety check at the start
  if (!location || !location.id || !location.name) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '600px',
      maxWidth: '90vw',
      backgroundColor: 'white',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      zIndex: 1001,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{location.name || 'Location'}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onEdit && (
            <button 
              onClick={onEdit} 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button 
              onClick={onDelete} 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              Delete
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666', padding: '0.25rem' }}>×</button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Assigned Items</h3>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Add Item
          </button>
        </div>

        {locationItems && locationItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {locationItems.sort((a, b) => (a?.shelf_order || 0) - (b?.shelf_order || 0)).map((item, idx) => {
              if (!item || !item.id) return null;
              return (
              <div key={item.id} style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: editingItem === item.id ? '2px solid #1e3a5f' : '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: editingItem === item.id ? '0.5rem' : '0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.item_name}</div>
                    {editingItem === item.id ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Shelf Order</label>
                          <input
                            type="number"
                            value={item.shelf_order || 0}
                            onChange={(e) => {
                              const updated = locationItems.map(li => 
                                li.id === item.id ? { ...li, shelf_order: parseInt(e.target.value) || 0 } : li
                              );
                              setLocationItems(updated);
                            }}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>PAR Level</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.par_level || ''}
                            onChange={(e) => {
                              const updated = locationItems.map(li => 
                                li.id === item.id ? { ...li, par_level: e.target.value } : li
                              );
                              setLocationItems(updated);
                            }}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Reorder Point</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.reorder_point || ''}
                            onChange={(e) => {
                              const updated = locationItems.map(li => 
                                li.id === item.id ? { ...li, reorder_point: e.target.value } : li
                              );
                              setLocationItems(updated);
                            }}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => handleUpdateItem(item.id, {
                              shelf_order: item.shelf_order,
                              par_level: item.par_level,
                              reorder_point: item.reorder_point
                            })}
                            style={{ flex: 1, padding: '0.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const items = await inventoryApi.getLocationItems(location.id, userEmail);
                                setLocationItems(items);
                                setEditingItem(null);
                              } catch (err) {
                                console.error('Error reloading items:', err);
                                setLocationItems(location.items || []);
                                setEditingItem(null);
                              }
                            }}
                            style={{ flex: 1, padding: '0.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Shelf Order: {item.shelf_order || 0} | PAR: {item.par_level || '-'} | Reorder: {item.reorder_point || '-'} | On-hand: {item.on_hand_qty || 0} {item.base_uom}
                      </div>
                    )}
                  </div>
                  {editingItem !== item.id && (
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleMoveItem(item.id, 'up')}
                        disabled={idx === 0}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: idx === 0 ? '#ccc' : '#1e3a5f', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveItem(item.id, 'down')}
                        disabled={idx === locationItems.length - 1}
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          backgroundColor: idx === locationItems.length - 1 ? '#ccc' : '#1e3a5f', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: idx === locationItems.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setEditingItem(item.id)}
                        style={{ 
                          padding: '0.25rem 0.75rem', 
                          backgroundColor: '#6c757d', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          marginLeft: '0.25rem'
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No items assigned to this location</p>
        )}
      </div>

      {showAssignModal && (
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
          zIndex: 1002
        }} onClick={() => setShowAssignModal(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Assign Item to Location</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Item *</label>
              <select
                value={assignmentForm.inventory_item_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, inventory_item_id: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">Select an item...</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Shelf Order</label>
              <input
                type="number"
                value={assignmentForm.shelf_order}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, shelf_order: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>PAR Level</label>
              <input
                type="number"
                step="0.01"
                value={assignmentForm.par_level}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, par_level: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reorder Point</label>
              <input
                type="number"
                step="0.01"
                value={assignmentForm.reorder_point}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, reorder_point: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAssignModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAssignItem} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

