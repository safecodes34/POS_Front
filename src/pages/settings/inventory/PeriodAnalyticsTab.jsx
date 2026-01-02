import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function PeriodAnalyticsTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodSummary, setPeriodSummary] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeFormData, setCloseFormData] = useState({
    period_start: '',
    period_end: '',
    location_id: ''
  });
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (userEmail) {
      loadPeriods();
      loadLocations();
    }
  }, [userEmail]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getPeriods(userEmail);
      setPeriods(data);
    } catch (err) {
      console.error('Error loading periods:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load periods');
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

  const loadPeriodSummary = async (periodId) => {
    try {
      setLoading(true);
      setError(null);
      const summary = await inventoryApi.getPeriodSummary(periodId, userEmail);
      setPeriodSummary(summary);
      setSelectedPeriod(periodId);
    } catch (err) {
      console.error('Error loading period summary:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load period summary');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!closeFormData.period_start || !closeFormData.period_end) {
      setError('Period start and end dates are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await inventoryApi.closePeriod({
        period_start: closeFormData.period_start,
        period_end: closeFormData.period_end,
        location_id: closeFormData.location_id || null
      }, userEmail);
      setShowCloseModal(false);
      setCloseFormData({ period_start: '', period_end: '', location_id: '' });
      await loadPeriods();
    } catch (err) {
      console.error('Error closing period:', err);
      setError(err.response?.data?.error || err.message || 'Failed to close period');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading && periods.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading periods...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Period Analytics</h2>
        <button
          onClick={() => {
            // Set default to current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setCloseFormData({
              period_start: firstDay.toISOString().split('T')[0],
              period_end: lastDay.toISOString().split('T')[0],
              location_id: ''
            });
            setShowCloseModal(true);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}
        >
          Close Period
        </button>
      </div>

      <InventoryErrorDisplay error={error} />

      {periods.length === 0 ? (
        <div style={{
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e0e0e0'
        }}>
          <p style={{ color: '#666', fontSize: '1rem' }}>No periods found. Close your first period to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
          {/* Periods List */}
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Periods</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {periods.map(period => (
                <div
                  key={period.id}
                  onClick={() => loadPeriodSummary(period.id)}
                  style={{
                    padding: '1rem',
                    backgroundColor: selectedPeriod === period.id ? '#e3f2fd' : 'white',
                    border: `1px solid ${selectedPeriod === period.id ? '#1e3a5f' : '#e0e0e0'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {formatDate(period.period_start)} - {formatDate(period.period_end)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {period.location_name || 'All Locations'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Status: <span style={{ 
                      color: period.status === 'CLOSED' ? '#4caf50' : '#ff9800',
                      fontWeight: '600'
                    }}>{period.status}</span>
                  </div>
                  {period.items_count > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      {period.items_count} items
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Period Summary */}
          <div>
            {periodSummary ? (
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                  Period Summary: {formatDate(periodSummary.period.period_start)} - {formatDate(periodSummary.period.period_end)}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Item</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Opening</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Purchased</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Theoretical Usage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Actual Usage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Variance</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodSummary.metrics.map((metric, idx) => (
                        <tr key={metric.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{metric.item_name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>{formatNumber(metric.opening_qty)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                            {formatNumber(metric.purchased_qty)}
                            {metric.purchased_cost > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                ${formatNumber(metric.purchased_cost)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>{formatNumber(metric.theoretical_usage_qty)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>{formatNumber(metric.actual_usage_qty)}</td>
                          <td style={{ 
                            padding: '0.75rem', 
                            textAlign: 'right', 
                            fontSize: '0.9rem',
                            color: Math.abs(metric.variance_qty) > 0.01 ? (metric.variance_qty > 0 ? '#f44336' : '#4caf50') : '#666',
                            fontWeight: Math.abs(metric.variance_qty) > 0.01 ? '600' : 'normal'
                          }}>
                            {formatNumber(metric.variance_qty)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>{formatNumber(metric.closing_qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '3rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e0e0e0'
              }}>
                <p style={{ color: '#666', fontSize: '1rem' }}>Select a period to view summary</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close Period Modal */}
      {showCloseModal && (
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
              Close Period
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Period Start *
                </label>
                <input
                  type="date"
                  value={closeFormData.period_start}
                  onChange={(e) => setCloseFormData({ ...closeFormData, period_start: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Period End *
                </label>
                <input
                  type="date"
                  value={closeFormData.period_end}
                  onChange={(e) => setCloseFormData({ ...closeFormData, period_end: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                  Location (optional)
                </label>
                <select
                  value={closeFormData.location_id}
                  onChange={(e) => setCloseFormData({ ...closeFormData, location_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClosePeriod}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Closing...' : 'Close Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






