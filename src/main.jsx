import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import App from './App.jsx'
import DesktopScaledFrame from './DesktopScaledFrame.jsx'
import './index.css'

// App wrapper component to handle Stripe initialization
const AppWrapper = () => {
  const [stripePromise, setStripePromise] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const initializeStripe = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get publishable key from environment variable (Vite requires VITE_ prefix)
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        
        if (!publishableKey) {
          throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables.');
        }
        
        console.log('🔑 Loading Stripe with publishable key from environment variable');
        setStripePromise(loadStripe(publishableKey));
      } catch (error) {
        console.error('Error loading Stripe publishable key:', error);
        // Don't block the app - just log the error and continue without Stripe
        setError(error.message || 'Failed to load Stripe. Payment features will be unavailable.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeStripe();
  }, []);
  
  // Check if we're in embed mode
  const params = new URLSearchParams(window.location.search)
  const isEmbed = params.get('embed') === '1'
  
  // If in embed mode, render app directly (it's inside iframe)
  // Otherwise, wrap in DesktopScaledFrame which creates the iframe
  if (isEmbed) {
    return (
      <Elements stripe={stripePromise}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            gap: '1rem',
            width: '100%'
          }}>
            <div>Loading...</div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Initializing payment system...</div>
          </div>
        ) : (
          <App />
        )}
      </Elements>
    )
  }
  
  // Normal mode: wrap in DesktopScaledFrame (creates iframe with fixed viewport)
  return <DesktopScaledFrame />
};

const rootElement = document.getElementById('root')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  </React.StrictMode>,
)







