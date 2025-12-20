import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DisplayManagerPage from './DisplayManagerPage'
import UpsellSettingsPage from './UpsellSettingsPage'
import LoyaltySettingsPage from './LoyaltySettingsPage'

export default function CheckoutRoutes() {
  const location = useLocation()
  const navigate = useNavigate()

  // Extract the sub-route from /settings/checkout/<subroute>
  const pathParts = location.pathname.split('/').filter(Boolean)
  const checkoutIndex = pathParts.indexOf('checkout')
  const subRoute = checkoutIndex >= 0 && pathParts.length > checkoutIndex + 1 
    ? pathParts[checkoutIndex + 1]
    : null

  // Handle routing
  React.useEffect(() => {
    if (location.pathname === '/settings/checkout' || location.pathname === '/settings/checkout/') {
      // Default to display-manager
      navigate('/settings/checkout/display-manager', { replace: true })
    }
  }, [location.pathname, navigate])

  // Render the appropriate page
  if (subRoute === 'display-manager') {
    return <DisplayManagerPage />
  } else if (subRoute === 'upsell') {
    return <UpsellSettingsPage />
  } else if (subRoute === 'loyalty') {
    return <LoyaltySettingsPage />
  }

  // Default fallback
  return <DisplayManagerPage />
}




