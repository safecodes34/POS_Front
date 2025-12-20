import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';

export default function OrderingTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    if (userEmail) {
      loadSuggestions();
      loadLocations();
    }
  }, [userEmail, selectedLocation]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getReorderSuggestions(selectedLocation || null, userEmail);
      setSuggestions(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load suggestions');
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

  const handleExportCSV = (vendor) => {
    const csv = [
      ['Vendor', 'Item', 'On-Hand', 'Daily Usage', 'Target Stock', 'Reorder Qty', 'Unit', 'Pack Size', 'Notes'].join(','),
      ...vendor.items.map(item => [
        vendor.vendor_name || 'Unknown Vendor',
        item.item_name,
        item.on_hand_qty?.toFixed(2) || 0,
        item.avgDailyUsage?.toFixed(2) || '',
        item.targetStock?.toFixed(2) || item.par_level || '',
        item.suggestedQty?.toFixed(2) || 0,
        item.base_uom,
        item.pack_size || '',
        item.reasoning?.hasUsageData ? 'Based on usage data' : 'No usage data yet'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vendor.vendor_name || 'Unknown_Vendor'}_order_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading && suggestions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div><p>Loading suggestions...</p></div>;
  }

  return (
    <div>
      {error && <div style={{ padding: '1rem', backgroundColor: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '8px', color: '#c62828', marginBottom: '1.5rem' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Ordering</h2>
        <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}>
          <option value="">All Locations</option>
          {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
        </select>
      </div>
      {suggestions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {suggestions.map(vendor => (
            <div key={vendor.vendor_id || '_no_vendor'} style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{vendor.vendor_name}</h3>
                <button onClick={() => handleExportCSV(vendor)} style={{ padding: '0.5rem 1rem', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Export CSV</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>On-Hand</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Daily Usage</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Target</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Reorder Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem' }}>{item.item_name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.on_hand_qty?.toFixed(2) || 0} {item.base_uom}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }} title={item.reasoning?.hasUsageData ? 'Based on last 14 days' : 'No usage data yet'}>{item.avgDailyUsage?.toFixed(2) || '-'} {item.base_uom}/day</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.targetStock?.toFixed(2) || item.par_level || '-'} {item.base_uom}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1e3a5f' }}>{item.suggestedQty?.toFixed(2) || 0} {item.base_uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>No reorder suggestions at this time</p>
        </div>
      )}
    </div>
  );
}



