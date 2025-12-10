import React from 'react'
import ReactDOM from 'react-dom/client'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import App from './App.jsx'
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
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '1rem'
      }}>
        <div>Loading...</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>Initializing payment system...</div>
      </div>
    );
  }
  
  // Continue even if Stripe fails - app will work without payment features
  return (
    <Elements stripe={stripePromise}>
      <App />
    </Elements>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
)







