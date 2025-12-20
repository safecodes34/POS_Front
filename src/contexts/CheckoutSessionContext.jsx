import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

// CheckoutSession schema
const createEmptySession = () => ({
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  orderId: null,
  orderItems: [],
  totals: {
    subtotal: 0,
    tax: 0,
    discounts: 0,
    total: 0
  },
  tenderType: null,
  paymentStatus: 'idle', // idle | awaiting_payment | paid | failed
  postPayStep: 'none', // none | upsell | tip | loyalty | receipt
  upsell: {
    enabled: false,
    offers: [],
    selectedUpsellIds: [],
    status: 'idle' // idle | accepted | skipped
  },
  tip: {
    enabled: false,
    tipPercent: null,
    tipAmount: 0,
    status: 'idle' // idle | set | skipped
  },
  loyalty: {
    enabled: false,
    phone: '',
    status: 'idle', // idle | submitted | skipped | error
    pointsEarned: 0,
    pointsBalance: 0
  },
  timestamps: {
    createdAt: Date.now(),
    lastUpdated: Date.now()
  }
})

const CheckoutSessionContext = createContext(null)

export const CheckoutSessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    // Try to restore from localStorage on init
    try {
      const stored = localStorage.getItem('checkout_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate structure
        if (parsed.sessionId && parsed.paymentStatus && parsed.postPayStep) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Error loading checkout session from localStorage:', error)
    }
    return createEmptySession()
  })

  const broadcastChannelRef = useRef(null)
  const isUpdatingRef = useRef(false)

  // Initialize BroadcastChannel for cross-window sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('checkout_session_sync')
      
      broadcastChannelRef.current.onmessage = (event) => {
        // Ignore messages from this window
        if (event.data.source === 'self') return
        
        const newSession = event.data.session
        if (newSession && !isUpdatingRef.current) {
          console.log('📡 Received session update from another window:', newSession)
          isUpdatingRef.current = true
          setSession(newSession)
          // Save to localStorage
          try {
            localStorage.setItem('checkout_session', JSON.stringify(newSession))
          } catch (error) {
            console.error('Error saving session to localStorage:', error)
          }
          setTimeout(() => {
            isUpdatingRef.current = false
          }, 100)
        }
      }

      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close()
        }
      }
    }
  }, [])

  // Fallback: Use localStorage events for sync (for same-origin tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'checkout_session' && e.newValue && !isUpdatingRef.current) {
        try {
          const newSession = JSON.parse(e.newValue)
          if (newSession && newSession.sessionId !== session.sessionId) {
            console.log('📦 Received session update from localStorage event:', newSession)
            isUpdatingRef.current = true
            setSession(newSession)
            setTimeout(() => {
              isUpdatingRef.current = false
            }, 100)
          }
        } catch (error) {
          console.error('Error parsing session from storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [session.sessionId])

  // Persist session to localStorage whenever it changes
  useEffect(() => {
    if (!isUpdatingRef.current) {
      try {
        localStorage.setItem('checkout_session', JSON.stringify(session))
        
        // Broadcast to other windows via BroadcastChannel
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            source: 'self',
            session,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        console.error('Error saving session to localStorage:', error)
      }
    }
  }, [session])

  // Update session helper
  const updateSession = useCallback((updates) => {
    setSession(prevSession => ({
      ...prevSession,
      ...updates,
      timestamps: {
        ...prevSession.timestamps,
        lastUpdated: Date.now()
      }
    }))
  }, [])

  // Reset session for next customer
  const resetSession = useCallback(() => {
    const newSession = createEmptySession()
    isUpdatingRef.current = true
    setSession(newSession)
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 100)
  }, [])

  // Add item to cart
  const addItem = useCallback((item) => {
    setSession(prevSession => {
      // Create orderId if it doesn't exist
      const orderId = prevSession.orderId || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const existingIndex = prevSession.orderItems.findIndex(
        i => i.id === item.id && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
      )
      
      let newItems
      if (existingIndex >= 0) {
        newItems = prevSession.orderItems.map((i, idx) => 
          idx === existingIndex ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        )
      } else {
        newItems = [...prevSession.orderItems, { ...item, quantity: item.quantity || 1 }]
      }

      // Recalculate totals (simplified - you'll need to integrate with your pricing logic)
      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.1 // Example: 10% tax (replace with actual tax calculation)
      const total = subtotal + tax - (prevSession.totals.discounts || 0)

      return {
        ...prevSession,
        orderId,
        orderItems: newItems,
        totals: {
          ...prevSession.totals,
          subtotal,
          tax,
          total
        },
        timestamps: {
          ...prevSession.timestamps,
          lastUpdated: Date.now()
        }
      }
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((itemId, modifiers = null) => {
    setSession(prevSession => {
      const newItems = prevSession.orderItems.filter(item => {
        if (modifiers) {
          return !(item.id === itemId && JSON.stringify(item.modifiers) === JSON.stringify(modifiers))
        }
        return item.id !== itemId
      })

      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.1
      const total = subtotal + tax - (prevSession.totals.discounts || 0)

      return {
        ...prevSession,
        orderItems: newItems,
        totals: {
          ...prevSession.totals,
          subtotal,
          tax,
          total
        },
        timestamps: {
          ...prevSession.timestamps,
          lastUpdated: Date.now()
        }
      }
    })
  }, [])

  // Update item quantity
  const updateItemQuantity = useCallback((itemId, modifiers, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemId, modifiers)
      return
    }

    setSession(prevSession => {
      const newItems = prevSession.orderItems.map(item => {
        if (item.id === itemId && JSON.stringify(item.modifiers) === JSON.stringify(modifiers)) {
          return { ...item, quantity: newQuantity }
        }
        return item
      })

      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.1
      const total = subtotal + tax - (prevSession.totals.discounts || 0)

      return {
        ...prevSession,
        orderItems: newItems,
        totals: {
          ...prevSession.totals,
          subtotal,
          tax,
          total
        },
        timestamps: {
          ...prevSession.timestamps,
          lastUpdated: Date.now()
        }
      }
    })
  }, [removeItem])

  // Initiate payment
  const initiatePayment = useCallback((tenderType) => {
    updateSession({
      tenderType,
      paymentStatus: 'awaiting_payment'
    })
  }, [updateSession])

  // Confirm payment
  const confirmPayment = useCallback(() => {
    updateSession({
      paymentStatus: 'paid',
      postPayStep: 'upsell' // Start post-pay sequence
    })
  }, [updateSession])

  // Fail payment
  const failPayment = useCallback(() => {
    updateSession({
      paymentStatus: 'failed'
    })
  }, [updateSession])

  // Move to next post-pay step
  const nextPostPayStep = useCallback(() => {
    setSession(prevSession => {
      const steps = ['none', 'upsell', 'tip', 'loyalty', 'receipt']
      const currentIndex = steps.indexOf(prevSession.postPayStep)
      const nextStep = steps[currentIndex + 1] || 'receipt'
      
      return {
        ...prevSession,
        postPayStep: nextStep,
        timestamps: {
          ...prevSession.timestamps,
          lastUpdated: Date.now()
        }
      }
    })
  }, [])

  // Set post-pay step directly
  const setPostPayStep = useCallback((step) => {
    updateSession({ postPayStep: step })
  }, [updateSession])

  // Update upsell state
  const updateUpsell = useCallback((upsellUpdates) => {
    setSession(prevSession => ({
      ...prevSession,
      upsell: {
        ...prevSession.upsell,
        ...upsellUpdates
      },
      timestamps: {
        ...prevSession.timestamps,
        lastUpdated: Date.now()
      }
    }))
  }, [])

  // Update tip state
  const updateTip = useCallback((tipUpdates) => {
    setSession(prevSession => ({
      ...prevSession,
      tip: {
        ...prevSession.tip,
        ...tipUpdates
      },
      timestamps: {
        ...prevSession.timestamps,
        lastUpdated: Date.now()
      }
    }))
  }, [])

  // Update loyalty state
  const updateLoyalty = useCallback((loyaltyUpdates) => {
    setSession(prevSession => ({
      ...prevSession,
      loyalty: {
        ...prevSession.loyalty,
        ...loyaltyUpdates
      },
      timestamps: {
        ...prevSession.timestamps,
        lastUpdated: Date.now()
      }
    }))
  }, [])

  const value = {
    session,
    updateSession,
    resetSession,
    addItem,
    removeItem,
    updateItemQuantity,
    initiatePayment,
    confirmPayment,
    failPayment,
    nextPostPayStep,
    setPostPayStep,
    updateUpsell,
    updateTip,
    updateLoyalty
  }

  return (
    <CheckoutSessionContext.Provider value={value}>
      {children}
    </CheckoutSessionContext.Provider>
  )
}

export const useCheckoutSession = () => {
  const context = useContext(CheckoutSessionContext)
  if (!context) {
    throw new Error('useCheckoutSession must be used within a CheckoutSessionProvider')
  }
  return context
}




