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

const UpsellSettingsPage = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    strategy: 'manual',
    maxOffers: 3,
    timeoutSec: 10,
    ruleFlags: {}
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // For now, use default merchant ID
      // TODO: Replace with actual merchant ID from auth
      const response = await axios.get(`${API_BASE_URL}/settings/upsell`)
      if (response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      console.error('Error loading upsell settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await axios.put(`${API_BASE_URL}/settings/upsell`, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving upsell settings:', error)
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
      <h1>Upsell Settings</h1>
      <p className="page-description">
        Configure upsell offers shown to customers after payment
      </p>

      <div className="settings-section">
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-label">
              <label>Enable Upsell</label>
              <p className="helper-text">
                Show upsell offers to customers after payment completion
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
                  <label>Upsell Strategy</label>
                  <p className="helper-text">
                    How upsell offers are selected
                  </p>
                </div>
                <div className="settings-value">
                  <select
                    value={settings.strategy}
                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value })}
                    className="select-input"
                  >
                    <option value="manual">Manual (Pinned Items)</option>
                    <option value="inventory">Inventory-Driven</option>
                    <option value="hybrid">Hybrid (Pinned + Recommended)</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-label">
                  <label>Max Offers</label>
                  <p className="helper-text">
                    Maximum number of offers to show (1-3)
                  </p>
                </div>
                <div className="settings-value">
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={settings.maxOffers}
                    onChange={(e) => setSettings({ ...settings, maxOffers: parseInt(e.target.value) || 1 })}
                    className="number-input"
                  />
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
                    max="30"
                    value={settings.timeoutSec}
                    onChange={(e) => setSettings({ ...settings, timeoutSec: parseInt(e.target.value) || 10 })}
                    className="number-input"
                  />
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

        <div className="info-box">
          <h3>About Upsell Strategies</h3>
          <ul>
            <li><strong>Manual:</strong> Show only pinned/configured offers</li>
            <li><strong>Inventory-Driven:</strong> Automatically suggest items based on inventory levels (slow movers, high stock, expiring soon)</li>
            <li><strong>Hybrid:</strong> Combine pinned offers with inventory-driven recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UpsellSettingsPage




