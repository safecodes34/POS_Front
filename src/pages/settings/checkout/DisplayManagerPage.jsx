import React, { useState } from 'react'
import axios from 'axios'
import './CheckoutSettings.css'

const API_BASE_URL = `${window.location.origin.replace(window.location.port, '4001')}/api`

const DisplayManagerPage = () => {
  const [customerScreenUrl, setCustomerScreenUrl] = useState('')

  React.useEffect(() => {
    // Construct the customer screen URL
    const baseUrl = window.location.origin
    setCustomerScreenUrl(`${baseUrl}/customer`)
  }, [])

  const handleOpenCustomerScreen = () => {
    // Open customer screen in a new window
    window.open(customerScreenUrl, 'customer-screen', 'width=1920,height=1080,fullscreen=yes')
  }

  const handleOpenFullscreen = async () => {
    // Try to enter fullscreen mode
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen()
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen()
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error)
      alert('Fullscreen mode is not supported or was denied')
    }
  }

  return (
    <div className="checkout-settings-page">
      <h1>Display Manager</h1>
      <p className="page-description">
        Configure and manage your customer-facing display screen
      </p>

      <div className="settings-section">
        <h2>Customer-Facing Display</h2>
        <p>
          Open the customer-facing screen in a new window for use on a second monitor or kiosk.
        </p>

        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-label">
              <label>Customer Screen URL</label>
              <p className="helper-text">
                Use this URL to display the customer-facing interface
              </p>
            </div>
            <div className="settings-value">
              <input
                type="text"
                value={customerScreenUrl}
                readOnly
                className="readonly-input"
              />
              <button
                onClick={() => navigator.clipboard.writeText(customerScreenUrl)}
                className="btn-secondary"
              >
                Copy URL
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <label>Actions</label>
            </div>
            <div className="settings-value">
              <button onClick={handleOpenCustomerScreen} className="btn-primary">
                Open Customer Screen in New Window
              </button>
              <button onClick={handleOpenFullscreen} className="btn-secondary">
                Enter Fullscreen Mode
              </button>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h3>Kiosk Mode Setup</h3>
          <ul>
            <li>Open the customer screen in a new window</li>
            <li>Position the window on your customer-facing monitor</li>
            <li>Enter fullscreen mode for a kiosk-like experience</li>
            <li>The customer screen is locked down and only shows approved UI elements</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DisplayManagerPage




