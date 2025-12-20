import React, { useEffect, useState } from 'react'
import { useCheckoutSession } from '../../contexts/CheckoutSessionContext'
import axios from 'axios'
import './UpsellView.css'

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

const UpsellView = () => {
  const { session, updateUpsell, nextPostPayStep, addItem } = useCheckoutSession()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeoutSeconds, setTimeoutSeconds] = useState(10) // Default timeout

  // Load upsell offers
  useEffect(() => {
    const loadOffers = async () => {
      try {
        if (session.orderId) {
          const response = await axios.get(`${API_BASE_URL}/upsell/active`, {
            params: { orderId: session.orderId }
          })
          if (response.data && Array.isArray(response.data.offers)) {
            setOffers(response.data.offers.slice(0, 3)) // Max 3 offers
            if (response.data.timeoutSec) {
              setTimeoutSeconds(response.data.timeoutSec)
            }
          }
        }
      } catch (error) {
        console.error('Error loading upsell offers:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session.upsell.enabled) {
      loadOffers()
    } else {
      // Skip upsell if disabled
      nextPostPayStep()
    }
  }, [session.orderId, session.upsell.enabled, nextPostPayStep])

  // Auto-advance timer
  useEffect(() => {
    if (!session.upsell.enabled || loading || offers.length === 0) return

    const timer = setTimeout(() => {
      handleSkip()
    }, timeoutSeconds * 1000)

    return () => clearTimeout(timer)
  }, [session.upsell.enabled, loading, offers.length, timeoutSeconds])

  const handleAccept = async (offer) => {
    // Add offer item to cart
    if (offer.linkedMenuItemId) {
      // Fetch menu item details
      try {
        const response = await axios.get(`${API_BASE_URL}/products/${offer.linkedMenuItemId}`)
        if (response.data) {
          addItem({
            id: response.data.id,
            name: offer.title || response.data.name,
            price: offer.priceBehavior === 'freebie' ? 0 : (response.data.price || 0),
            modifiers: [],
            image: response.data.image
          })
        }
      } catch (error) {
        console.error('Error fetching menu item:', error)
      }
    }

    updateUpsell({
      status: 'accepted',
      selectedUpsellIds: [...session.upsell.selectedUpsellIds, offer.id]
    })

    // Advance to next step after a brief delay
    setTimeout(() => {
      nextPostPayStep()
    }, 500)
  }

  const handleSkip = () => {
    updateUpsell({ status: 'skipped' })
    nextPostPayStep()
  }

  if (loading) {
    return (
      <div className="upsell-view">
        <div className="loading">Loading special offers...</div>
      </div>
    )
  }

  if (!session.upsell.enabled || offers.length === 0) {
    // If no offers, skip to next step
    return null
  }

  return (
    <div className="upsell-view">
      <div className="upsell-container">
        <h1>Would you like to add something?</h1>
        
        <div className="upsell-offers">
          {offers.map(offer => (
            <div key={offer.id} className="upsell-card">
              {offer.image && (
                <img src={offer.image} alt={offer.title} />
              )}
              <div className="upsell-content">
                <h2>{offer.title}</h2>
                {offer.description && <p>{offer.description}</p>}
                <div className="upsell-actions">
                  <button
                    className="btn-accept"
                    onClick={() => handleAccept(offer)}
                  >
                    Add to Order
                  </button>
                  <button
                    className="btn-skip"
                    onClick={handleSkip}
                  >
                    No Thanks
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="upsell-timer">
          Auto-advancing in {timeoutSeconds} seconds...
        </div>
      </div>
    </div>
  )
}

export default UpsellView

