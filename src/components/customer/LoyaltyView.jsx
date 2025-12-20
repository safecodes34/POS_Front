import React, { useState, useEffect } from 'react'
import { useCheckoutSession } from '../../contexts/CheckoutSessionContext'
import axios from 'axios'
import './LoyaltyView.css'

// Detect backend URL (simplified version)
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

const LoyaltyView = () => {
  const { session, updateLoyalty, nextPostPayStep } = useCheckoutSession()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [timeoutSeconds, setTimeoutSeconds] = useState(15) // Default timeout
  const [timeRemaining, setTimeRemaining] = useState(15)

  // Load timeout from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/loyalty/settings`)
        if (response.data && response.data.timeoutSec) {
          setTimeoutSeconds(response.data.timeoutSec)
          setTimeRemaining(response.data.timeoutSec)
        }
      } catch (error) {
        console.error('Error loading loyalty settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Auto-advance timer
  useEffect(() => {
    if (!session.loyalty.enabled) {
      nextPostPayStep()
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSkip()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [session.loyalty.enabled, nextPostPayStep])

  const formatPhone = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10)
    
    // Format as (###) ###-####
    if (limited.length === 0) return ''
    if (limited.length <= 3) return `(${limited}`
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    setError('')
  }

  const normalizePhone = (formatted) => {
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 10) {
      return `+1${digits}` // E.164 format
    }
    return null
  }

  const handleSubmit = async () => {
    const normalized = normalizePhone(phone)
    
    if (!normalized) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    try {
      updateLoyalty({ status: 'submitted', phone: normalized })
      
      const response = await axios.post(`${API_BASE_URL}/loyalty/apply`, {
        sessionId: session.sessionId,
        orderId: session.orderId,
        phone: normalized
      })

      if (response.data) {
        updateLoyalty({
          status: 'submitted',
          pointsEarned: response.data.pointsEarned || 0,
          pointsBalance: response.data.pointsBalance || 0
        })

        // Show success message, then advance
        setTimeout(() => {
          nextPostPayStep()
        }, 3000)
      }
    } catch (error) {
      console.error('Error applying loyalty:', error)
      updateLoyalty({ status: 'error' })
      setError('Unable to process. Please try again or skip.')
    }
  }

  const handleSkip = () => {
    updateLoyalty({ status: 'skipped' })
    nextPostPayStep()
  }

  if (!session.loyalty.enabled) {
    return null
  }

  const showSuccess = session.loyalty.status === 'submitted' && session.loyalty.pointsEarned > 0

  return (
    <div className="loyalty-view">
      <div className="loyalty-container">
        {showSuccess ? (
          <>
            <h1>✓ Points Added!</h1>
            <p className="success-message">
              You earned {session.loyalty.pointsEarned} points
            </p>
            <p className="balance">
              Total Balance: {session.loyalty.pointsBalance} points
            </p>
          </>
        ) : (
          <>
            <h1>Join Our Loyalty Program</h1>
            <p className="subtitle">Enter your phone number to earn points</p>

            <div className="phone-input-container">
              <div className="phone-input-wrapper">
                <input
                  type="tel"
                  className="phone-input"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  autoFocus
                />
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="loyalty-actions">
              <button className="btn-apply" onClick={handleSubmit} disabled={!phone || phone.replace(/\D/g, '').length !== 10}>
                Apply Points
              </button>
              <button className="btn-skip" onClick={handleSkip}>
                Skip
              </button>
            </div>

            {timeRemaining > 0 && (
              <div className="timeout-message">
                Auto-advancing in {timeRemaining} seconds...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LoyaltyView

