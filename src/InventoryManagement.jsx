import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use same API URL detection logic as App.jsx
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'https://localhost:4001';
  const hostname = window.location.hostname;
  
  // Check if we're on a local network IP
  const isLocalNetworkIP = 
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname);
  
  if (isLocalNetworkIP) {
    return `https://${hostname}:4001`;
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://localhost:4001';
  }
  
  // Production
  const isProduction = import.meta.env?.PROD || 
    import.meta.env?.MODE === 'production' || 
    hostname.includes('vercel.app') ||
    hostname.includes('railway.app');
  
  if (isProduction) {
    return 'https://posback-production-2407.up.railway.app';
  }
  
  return 'https://localhost:4001';
};

const API_BASE_URL = `${getBackendUrl()}/api`;

function InventoryManagement({ userEmail }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Overview stats
  const [stats, setStats] = useState(null);
  
  // Items
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
  
  // Locations
  const [locations, setLocations] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({ name: '', sort_order: 0 });
  
  // Vendors
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorForm, setVendorForm] = useState({ name: '', type: 'MANUAL', settings_json: null });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, name: null });
  
  // Invoices
  const [invoices, setInvoices] = useState([]);
  
  // On-hand
  const [onHand, setOnHand] = useState([]);
  
  // Reorder suggestions
  const [reorderSuggestions, setReorderSuggestions] = useState([]);

  // Load overview stats
  useEffect(() => {
    if (userEmail && activeTab === 'overview') {
      loadOverview();
    }
  }, [userEmail, activeTab]);

  // Load items
  useEffect(() => {
    if (userEmail && activeTab === 'items') {
      loadItems();
    }
  }, [userEmail, activeTab]);

  // Load locations
  useEffect(() => {
    if (userEmail && (activeTab === 'locations' || activeTab === 'ordering')) {
      loadLocations();
    }
  }, [userEmail, activeTab]);

  // Load vendors
  useEffect(() => {
    if (userEmail && activeTab === 'vendors') {
      loadVendors();
    }
  }, [userEmail, activeTab]);

  // Load invoices
  useEffect(() => {
    if (userEmail && activeTab === 'receiving') {
      loadInvoices();
    }
  }, [userEmail, activeTab]);

  // Load on-hand
  useEffect(() => {
    if (userEmail && activeTab === 'ordering') {
      loadReorderSuggestions();
    }
  }, [userEmail, activeTab]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/inventory/overview`, {
        params: { userEmail }
      });
      setStats(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/inventory/items`, {
        params: { userEmail }
      });
      setItems(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/locations`, {
        params: { userEmail }
      });
      setLocations(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/vendors`, {
        params: { userEmail }
      });
      setVendors(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/invoices`, {
        params: { userEmail }
      });
      setInvoices(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadReorderSuggestions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/ordering/suggestions`, {
        params: { userEmail }
      });
      setReorderSuggestions(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveItem = async () => {
    try {
      setLoading(true);
      if (editingItem) {
        await axios.put(`${API_BASE_URL}/inventory/items/${editingItem.id}`, {
          ...itemForm,
          userEmail
        });
      } else {
        await axios.post(`${API_BASE_URL}/inventory/items`, {
          ...itemForm,
          userEmail
        });
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setLoading(true);
      if (editingLocation) {
        await axios.put(`${API_BASE_URL}/inventory/locations/${editingLocation.id}`, {
          ...locationForm,
          userEmail
        });
      } else {
        await axios.post(`${API_BASE_URL}/inventory/locations`, {
          ...locationForm,
          userEmail
        });
      }
      setShowLocationModal(false);
      setEditingLocation(null);
      setLocationForm({ name: '', sort_order: 0 });
      loadLocations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVendor = async () => {
    try {
      setLoading(true);
      if (editingVendor) {
        await axios.put(`${API_BASE_URL}/inventory/vendors/${editingVendor.id}`, {
          ...vendorForm,
          userEmail
        });
      } else {
        await axios.post(`${API_BASE_URL}/inventory/vendors`, {
          ...vendorForm,
          userEmail
        });
      }
      setShowVendorModal(false);
      setEditingVendor(null);
      setVendorForm({ name: '', type: 'MANUAL', settings_json: null });
      loadVendors();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { type, id } = deleteConfirm;
      let endpoint = '';
      
      if (type === 'item') {
        endpoint = `${API_BASE_URL}/inventory/items/${id}`;
      } else if (type === 'location') {
        endpoint = `${API_BASE_URL}/inventory/locations/${id}`;
      } else if (type === 'vendor') {
        endpoint = `${API_BASE_URL}/inventory/vendors/${id}`;
      }
      
      await axios.delete(endpoint, {
        params: { userEmail }
      });
      
      setDeleteConfirm({ show: false, type: null, id: null, name: null });
      
      // Reload the appropriate list
      if (type === 'item') {
        loadItems();
      } else if (type === 'location') {
        loadLocations();
      } else if (type === 'vendor') {
        loadVendors();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'items', label: 'Items' },
    { id: 'locations', label: 'Locations' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'receiving', label: 'Receiving' },
    { id: 'ordering', label: 'Ordering' },
    { id: 'recipes', label: 'Recipes' }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', color: '#1e3a5f' }}>
        Inventory Management
      </h1>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #1e3a5f' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? '#1e3a5f' : '#666',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#1e3a5f';
                e.target.style.backgroundColor = '#f0f0f0';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#666';
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          border: '2px solid #ef9a9a',
          borderRadius: '8px',
          color: '#c62828',
          marginBottom: '1.5rem'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {loading ? (
            <p>Loading...</p>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f' }}>{stats.items}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>Items</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f' }}>{stats.locations}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>Locations</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f' }}>{stats.vendors}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>Vendors</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f' }}>{stats.pending_invoices}</div>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>Pending Invoices</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#856404' }}>{stats.low_stock}</div>
                <div style={{ color: '#856404', marginTop: '0.5rem' }}>Low Stock Items</div>
              </div>
            </div>
          ) : (
            <p>No data available</p>
          )}
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Inventory Items</h2>
            <button
              onClick={() => {
                setEditingItem(null);
                setItemForm({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
                setShowItemModal(true);
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
              + Add Item
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Base UOM</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '1rem' }}>{item.name}</td>
                      <td style={{ padding: '1rem' }}>{item.sku || '-'}</td>
                      <td style={{ padding: '1rem' }}>{item.category || '-'}</td>
                      <td style={{ padding: '1rem' }}>{item.base_uom}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          backgroundColor: item.active ? '#d4edda' : '#f8d7da',
                          color: item.active ? '#155724' : '#721c24'
                        }}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({
                              name: item.name,
                              sku: item.sku || '',
                              category: item.category || '',
                              base_uom: item.base_uom,
                              track_inventory: item.track_inventory !== 0,
                              active: item.active !== 0
                            });
                            setShowItemModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              show: true,
                              type: 'item',
                              id: item.id,
                              name: item.name
                            });
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No items found. Click "Add Item" to create your first inventory item.
            </p>
          )}
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Storage Locations</h2>
            <button
              onClick={() => {
                setEditingLocation(null);
                setLocationForm({ name: '', sort_order: 0 });
                setShowLocationModal(true);
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
              + Add Location
            </button>
          </div>

          {locations.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {locations.map(location => (
                <div
                  key={location.id}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    position: 'relative'
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
                    {location.name}
                  </h3>
                  <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                    Sort Order: {location.sort_order}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setEditingLocation(location);
                        setLocationForm({
                          name: location.name,
                          sort_order: location.sort_order
                        });
                        setShowLocationModal(true);
                      }}
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
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm({
                          show: true,
                          type: 'location',
                          id: location.id,
                          name: location.name
                        });
                      }}
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
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No locations found. Click "Add Location" to create your first storage location.
            </p>
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Vendors</h2>
            <button
              onClick={() => {
                setEditingVendor(null);
                setVendorForm({ name: '', type: 'MANUAL', settings_json: null });
                setShowVendorModal(true);
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
              + Add Vendor
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : vendors.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(vendor => (
                    <tr key={vendor.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '1rem' }}>{vendor.name}</td>
                      <td style={{ padding: '1rem' }}>{vendor.type || 'MANUAL'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          backgroundColor: (vendor.active !== undefined && vendor.active !== 0) ? '#d4edda' : '#f8d7da',
                          color: (vendor.active !== undefined && vendor.active !== 0) ? '#155724' : '#721c24'
                        }}>
                          {(vendor.active !== undefined && vendor.active !== 0) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setEditingVendor(vendor);
                            setVendorForm({
                              name: vendor.name,
                              type: vendor.type || 'MANUAL',
                              settings_json: vendor.settings_json ? JSON.parse(vendor.settings_json) : null
                            });
                            setShowVendorModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              show: true,
                              type: 'vendor',
                              id: vendor.id,
                              name: vendor.name
                            });
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
              No vendors found. Click "Add Vendor" to create your first vendor.
            </p>
          )}
        </div>
      )}

      {activeTab === 'receiving' && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Receiving</h2>
          <p style={{ color: '#666' }}>Invoice receiving interface coming soon...</p>
          {invoices.length > 0 && (
            <div>
              <p>Found {invoices.length} invoice(s)</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ordering' && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Ordering</h2>
          <p style={{ color: '#666' }}>Reorder suggestions interface coming soon...</p>
          {reorderSuggestions.length > 0 && (
            <div>
              <p>Found {reorderSuggestions.length} vendor(s) with reorder suggestions</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recipes' && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Recipes / Production</h2>
          <p style={{ color: '#666' }}>Recipe management interface coming soon...</p>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
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
        }} onClick={() => setShowItemModal(false)}>
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
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
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
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
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
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
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
                Base Unit of Measure
              </label>
              <select
                value={itemForm.base_uom}
                onChange={(e) => setItemForm({ ...itemForm, base_uom: e.target.value })}
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
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={itemForm.track_inventory}
                  onChange={(e) => setItemForm({ ...itemForm, track_inventory: e.target.checked })}
                />
                Track Inventory
              </label>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={itemForm.active}
                  onChange={(e) => setItemForm({ ...itemForm, active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  setItemForm({ name: '', sku: '', category: '', base_uom: 'each', track_inventory: true, active: true });
                }}
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
                onClick={handleSaveItem}
                disabled={!itemForm.name || loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!itemForm.name || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: (!itemForm.name || loading) ? 0.5 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
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
        }} onClick={() => setShowLocationModal(false)}>
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Sort Order
              </label>
              <input
                type="number"
                value={locationForm.sort_order}
                onChange={(e) => setLocationForm({ ...locationForm, sort_order: parseInt(e.target.value) || 0 })}
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
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                  setLocationForm({ name: '', sort_order: 0 });
                }}
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
                onClick={handleSaveLocation}
                disabled={!locationForm.name || loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!locationForm.name || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: (!locationForm.name || loading) ? 0.5 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
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
        }} onClick={() => setShowVendorModal(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Type
              </label>
              <select
                value={vendorForm.type}
                onChange={(e) => setVendorForm({ ...vendorForm, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="MANUAL">Manual</option>
                <option value="SYSCO">Sysco</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowVendorModal(false);
                  setEditingVendor(null);
                  setVendorForm({ name: '', type: 'MANUAL', settings_json: null });
                }}
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
                onClick={handleSaveVendor}
                disabled={!vendorForm.name || loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!vendorForm.name || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: (!vendorForm.name || loading) ? 0.5 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
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
          zIndex: 1001
        }} onClick={() => setDeleteConfirm({ show: false, type: null, id: null, name: null })}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#dc3545' }}>
              Confirm Delete
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, type: null, id: null, name: null })}
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
                onClick={handleDelete}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: loading ? 0.5 : 1
                }}
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

export default InventoryManagement;

