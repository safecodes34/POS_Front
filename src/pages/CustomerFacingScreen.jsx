import React, { useEffect } from 'react'
import { useCheckoutSession } from '../contexts/CheckoutSessionContext'
import CustomerBrowsingView from '../components/customer/BrowsingView'
import CustomerUpsellView from '../components/customer/UpsellView'
import CustomerTipView from '../components/customer/TipView'
import CustomerLoyaltyView from '../components/customer/LoyaltyView'
import CustomerReceiptView from '../components/customer/ReceiptView'
import './CustomerFacingScreen.css'

const CustomerFacingScreen = () => {
  const { session, resetSession } = useCheckoutSession()

  // Lock down the screen - prevent right-click, F12, etc. in production
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
    }

    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Auto-reset after receipt view timeout
  useEffect(() => {
    if (session.postPayStep === 'receipt') {
      const timer = setTimeout(() => {
        resetSession()
      }, 10000) // 10 seconds on receipt screen before reset

      return () => clearTimeout(timer)
    }
  }, [session.postPayStep, resetSession])

  // Determine which view to show based on session state
  const renderView = () => {
    // Post-pay sequence
    if (session.paymentStatus === 'paid') {
      switch (session.postPayStep) {
        case 'upsell':
          return <CustomerUpsellView />
        case 'tip':
          return <CustomerTipView />
        case 'loyalty':
          return <CustomerLoyaltyView />
        case 'receipt':
          return <CustomerReceiptView />
        default:
          // Fallback to browsing if somehow in invalid state
          return <CustomerBrowsingView />
      }
    }

    // Payment processing states
    if (session.paymentStatus === 'awaiting_payment') {
      return <CustomerBrowsingView showPaymentProcessing />
    }

    if (session.paymentStatus === 'failed') {
      return <CustomerBrowsingView showPaymentFailed />
    }

    // Default: browsing state
    return <CustomerBrowsingView />
  }

  return (
    <div className="customer-facing-screen">
      {renderView()}
    </div>
  )
}

export default CustomerFacingScreen




