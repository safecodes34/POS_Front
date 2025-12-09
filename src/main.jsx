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
        // Check for production mode or Vercel deployment - always use production URL when on Vercel
        // This ensures we always use the correct absolute URL, not a relative one
        const isProduction = import.meta.env.PROD || 
          import.meta.env.MODE === 'production' || 
          window.location.hostname.includes('vercel.app') ||
          window.location.hostname.includes('railway.app')
        // Always use hardcoded production URL when deployed - ignore env vars that might be incorrect
        const apiBaseUrl = isProduction
          ? 'https://posback-production-2407.up.railway.app/api'
          : (import.meta.env.VITE_API_BASE_URL || 'https://localhost:4001/api');
        console.log('🔗 API Base URL:', apiBaseUrl, '| Production:', isProduction, '| Hostname:', window.location.hostname);
        // Ensure URL is absolute
        const fullUrl = apiBaseUrl.startsWith('http') ? `${apiBaseUrl}/subscription/publishable-key` : `https://${apiBaseUrl}/subscription/publishable-key`;
        console.log('🔗 Full request URL:', fullUrl);
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          // If response is not OK, try to get error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Backend returned ${response.status}: ${response.statusText}`);
          } else {
            // If it's HTML (error page), provide a helpful message
            throw new Error(`Backend returned ${response.status}. Make sure STRIPE_PUBLISHABLE_KEY is set in Railway environment variables.`);
          }
        }
        
        const data = await response.json();
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          throw new Error('No publishable key received from backend. Check Railway environment variables.');
        }
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







