import React, { useState, useEffect } from 'react';
import { inventoryApi } from './inventoryApi';
import InventoryErrorDisplay from './InventoryErrorDisplay';

export default function ForecastTab({ userEmail }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    location_id: '',
    lead_time_days: 7,
    reorder_cycle_days: 30
  });
  const [locations, setLocations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadLocations();
      loadPeriods();
      // Set default to next month
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setFormData(prev => ({
        ...prev,
        period_start: nextMonth.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0]
      }));
    }
  }, [userEmail]);

  const loadLocations = async () => {
    try {
      const data = await inventoryApi.getLocations(userEmail);
      setLocations(data);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const loadPeriods = async () => {
    try {
      const data = await inventoryApi.getPeriods(userEmail);
      setPeriods(data.filter(p => p.status === 'CLOSED'));
    } catch (err) {
      console.error('Error loading periods:', err);
    }
  };

  const generateForecast = async () => {
    if (!formData.period_start || !formData.period_end) {
      setError('Period start and end dates are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getMonthlyForecast(
        formData.period_start,
        formData.period_end,
        userEmail,
        formData.location_id || null,
        formData.lead_time_days,
        formData.reorder_cycle_days
      );
      setForecast(data);
    } catch (err) {
      console.error('Error generating forecast:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!forecast) return;

    // Find or create period for this forecast
    let periodId = null;
    const existingPeriod = periods.find(p => 
      p.period_start === formData.period_start && 
      p.period_end === formData.period_end
    );

    if (existingPeriod) {
      periodId = existingPeriod.id;
    } else {
      // Create period first
      try {
        const closeResult = await inventoryApi.closePeriod({
          period_start: formData.period_start,
          period_end: formData.period_end,
          location_id: formData.location_id || null
        }, userEmail);
        periodId = closeResult.period_id;
      } catch (err) {
        setError('Failed to create period for plan');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      await inventoryApi.saveOrderingPlan({
        period_id: periodId,
        plan_date: new Date().toISOString().split('T')[0],
        location_id: formData.location_id || null,
        forecasts: forecast.forecasts
      }, userEmail);
      alert('Ordering plan saved successfully!');
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return '#4caf50';
    if (score >= 0.6) return '#ff9800';
    return '#f44336';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '600' }}>Monthly Forecast</h2>

      <InventoryErrorDisplay error={error} />

      {/* Forecast Parameters */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
          Forecast Parameters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
              Period Start *
            </label>
            <input
              type="date"
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
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
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
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
              Location
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
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
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
              Lead Time (days)
            </label>
            <input
              type="number"
              value={formData.lead_time_days}
              onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 7 })}
              min="1"
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
              Reorder Cycle (days)
            </label>
            <input
              type="number"
              value={formData.reorder_cycle_days}
              onChange={(e) => setFormData({ ...formData, reorder_cycle_days: parseInt(e.target.value) || 30 })}
              min="1"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
        <button
          onClick={generateForecast}
          disabled={loading || !formData.period_start || !formData.period_end}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (loading || !formData.period_start || !formData.period_end) ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            opacity: (loading || !formData.period_start || !formData.period_end) ? 0.6 : 1
          }}
        >
          {loading ? 'Generating...' : 'Generate Forecast'}
        </button>
      </div>

      {/* Forecast Results */}
      {forecast && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
              Forecast Results ({forecast.total_items} items)
            </h3>
            {forecast.total_recommended_cost > 0 && (
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e3a5f' }}>
                Total Estimated Cost: ${formatNumber(forecast.total_recommended_cost)}
              </div>
            )}
            <button
              onClick={savePlan}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>

          {/* Grouped by Vendor */}
          {forecast.by_vendor && forecast.by_vendor.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              {forecast.by_vendor.map(vendor => (
                <div key={vendor.vendor_id} style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                    {vendor.vendor_name} ({vendor.items.length} items)
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Item</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Forecast Usage</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Safety Stock</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Current Stock</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Recommended</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendor.items.map((item, idx) => (
                          <tr key={item.inventory_item_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                              {item.item_name}
                              {item.item_sku && (
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>SKU: {item.item_sku}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                              {formatNumber(item.forecast_usage_qty)} {item.base_uom}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                              {formatNumber(item.safety_stock_qty)} {item.base_uom}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                              {formatNumber(item.projected_available_qty)} {item.base_uom}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>
                              {formatNumber(item.recommended_qty)} {item.base_uom}
                              {item.recommended_packs && item.pack_size && (
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                  ({item.recommended_packs} packs × {formatNumber(item.pack_size)} {item.pack_uom})
                                </div>
                              )}
                              {item.last_cost && (
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                  Est: ${formatNumber(item.recommended_qty * item.last_cost)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: getConfidenceColor(item.confidence_score),
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {(item.confidence_score * 100).toFixed(0)}%
                              </div>
                              {item.confidence_reasons && item.confidence_reasons.length > 0 && (
                                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                                  {item.confidence_reasons[0]}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Items without vendor */}
          {forecast.no_vendor && forecast.no_vendor.length > 0 && (
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #ffc107',
              marginBottom: '1rem'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                Items Without Vendor Mapping ({forecast.no_vendor.length} items)
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                These items need vendor mapping to generate purchase recommendations.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Forecast Usage</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e0e0e0', fontSize: '0.85rem', fontWeight: '600' }}>Recommended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.no_vendor.map(item => (
                      <tr key={item.inventory_item_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{item.item_name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
                          {formatNumber(item.forecast_usage_qty)} {item.base_uom}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>
                          {formatNumber(item.recommended_qty)} {item.base_uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}






