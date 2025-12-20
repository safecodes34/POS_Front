import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './CheckoutSettings.css'

// Detect backend URL
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'https://localhost:4001'
  const hostname = window.location.hostname
  const isLocalNetworkIP = 
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname)
  
  if (isLocalNetworkIP) return `https://${hostname}:4001`
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'https://localhost:4001'
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  return 'https://posback-production-2407.up.railway.app'
}

const API_BASE_URL = `${getBackendUrl()}/api`

const LoyaltySettingsPage = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    earnRate: 1.0,
    baseAmount: 'subtotal',
    rounding: 'floor',
    tenderRules: {},
    timeoutSec: 15,
    allowSkip: true,
    messageTemplates: {}
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/loyalty/settings`)
      if (response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      console.error('Error loading loyalty settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await axios.put(`${API_BASE_URL}/loyalty/settings`, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving loyalty settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="checkout-settings-page">Loading...</div>
  }

  return (
    <div className="checkout-settings-page">
      <h1>Loyalty Program Settings</h1>
      <p className="page-description">
        Configure your customer loyalty program
      </p>

      <div className="settings-section">
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-label">
              <label>Enable Loyalty Program</label>
              <p className="helper-text">
                Allow customers to earn points on purchases
              </p>
            </div>
            <div className="settings-value">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {settings.enabled && (
            <>
              <div className="settings-row">
                <div className="settings-label">
                  <label>Points Earn Rate</label>
                  <p className="helper-text">
                    Points earned per dollar spent
                  </p>
                </div>
                <div className="settings-value">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.earnRate}
                    onChange={(e) => setSettings({ ...settings, earnRate: parseFloat(e.target.value) || 0 })}
                    className="number-input"
                  />
                  <span className="input-suffix">points per $1</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-label">
                  <label>Base Amount</label>
                  <p className="helper-text">
                    Calculate points based on
                  </p>
                </div>
                <div className="settings-value">
                  <select
                    value={settings.baseAmount}
                    onChange={(e) => setSettings({ ...settings, baseAmount: e.target.value })}
                    className="select-input"
                  >
                    <option value="subtotal">Subtotal (before tax)</option>
                    <option value="total">Total (after tax)</option>
                    <option value="pretax">Pre-tax amount</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-label">
                  <label>Rounding</label>
                  <p className="helper-text">
                    How to round point calculations
                  </p>
                </div>
                <div className="settings-value">
                  <select
                    value={settings.rounding}
                    onChange={(e) => setSettings({ ...settings, rounding: e.target.value })}
                    className="select-input"
                  >
                    <option value="floor">Round Down</option>
                    <option value="ceil">Round Up</option>
                    <option value="round">Round to Nearest</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-label">
                  <label>Step Timeout (seconds)</label>
                  <p className="helper-text">
                    Auto-advance after this many seconds
                  </p>
                </div>
                <div className="settings-value">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.timeoutSec}
                    onChange={(e) => setSettings({ ...settings, timeoutSec: parseInt(e.target.value) || 15 })}
                    className="number-input"
                  />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-label">
                  <label>Allow Skip</label>
                  <p className="helper-text">
                    Allow customers to skip phone entry
                  </p>
                </div>
                <div className="settings-value">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowSkip}
                      onChange={(e) => setSettings({ ...settings, allowSkip: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="settings-actions">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="saved-indicator">✓ Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoyaltySettingsPage




