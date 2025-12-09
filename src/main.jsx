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
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? 'https://posback-production-2407.up.railway.app/api' : 'https://localhost:4001/api');
        const response = await fetch(`${apiBaseUrl}/subscription/publishable-key`);
        
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          throw new Error('No publishable key received from backend');
        }
      } catch (error) {
        console.error('Error loading Stripe publishable key:', error);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? 'https://posback-production-2407.up.railway.app/api' : 'https://localhost:4001/api');
        const backendUrl = apiBaseUrl.replace('/api', '');
        setError(error.message || `Failed to connect to backend. Make sure the backend server is running on ${backendUrl}`);
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
        <div style={{ fontSize: '0.875rem', color: '#666' }}>Connecting to backend...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626' }}>⚠️ Connection Error</div>
        <div style={{ color: '#666', maxWidth: '500px' }}>{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!stripePromise) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Initializing Stripe...
      </div>
    );
  }
  
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







