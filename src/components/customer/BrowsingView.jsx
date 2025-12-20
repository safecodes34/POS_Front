import React from 'react'
import { useCheckoutSession } from '../../contexts/CheckoutSessionContext'
import axios from 'axios'
import './BrowsingView.css'

// Detect backend URL (simplified version - matches App.jsx logic)
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'https://localhost:4001'
  const hostname = window.location.hostname
  const port = window.location.port || '3001'
  
  // Check if we're on a local network IP
  const isLocalNetworkIP = 
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname)
  
  if (isLocalNetworkIP) {
    return `https://${hostname}:4001`
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://localhost:4001'
  }
  
  // Production backend
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  }
  
  return 'https://posback-production-2407.up.railway.app'
}

const BACKEND_BASE_URL = getBackendUrl()
const API_BASE_URL = `${BACKEND_BASE_URL}/api`

const BrowsingView = ({ showPaymentProcessing, showPaymentFailed }) => {
  const { session, addItem, removeItem, updateItemQuantity, initiatePayment } = useCheckoutSession()
  const [products, setProducts] = React.useState([])
  const [categories, setCategories] = React.useState(['All'])
  const [selectedCategory, setSelectedCategory] = React.useState('All')
  const [loading, setLoading] = React.useState(true)

  // Load products
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products`)
        if (response.data && Array.isArray(response.data)) {
          setProducts(response.data)
          const cats = ['All', ...new Set(response.data.map(p => p.category).filter(Boolean))]
          setCategories(cats)
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  const handleAddToCart = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      modifiers: [],
      image: product.image
    })
  }

  const handleRemoveFromCart = (item) => {
    removeItem(item.id, item.modifiers)
  }

  const handleUpdateQuantity = (item, newQuantity) => {
    updateItemQuantity(item.id, item.modifiers, newQuantity)
  }

  const handlePay = () => {
    if (session.orderItems.length === 0) return
    initiatePayment('card') // Default to card, merchant can change
  }

  return (
    <div className="browsing-view">
      {/* Header */}
      <div className="browsing-header">
        <h1>Our Menu</h1>
        {showPaymentProcessing && (
          <div className="payment-status processing">
            Processing payment...
          </div>
        )}
        {showPaymentFailed && (
          <div className="payment-status failed">
            Payment failed. Please try again.
          </div>
        )}
      </div>

      <div className="browsing-content">
        {/* Menu Section */}
        <div className="menu-section">
          {/* Categories */}
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="loading">Loading menu...</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleAddToCart(product)}
                >
                  {product.image && (
                    <img src={product.image.startsWith('http') ? product.image : `${API_BASE_URL.replace('/api', '')}/uploads/${product.image}`} alt={product.name} />
                  )}
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-price">${product.price?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="order-summary">
          <h2>Your Order</h2>
          
          {session.orderItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <p className="hint">Tap items to add them</p>
            </div>
          ) : (
            <>
              <div className="order-items">
                {session.orderItems.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="item-controls">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateQuantity(item, item.quantity - 1)
                        }}
                        className="qty-btn"
                      >
                        −
                      </button>
                      <span className="qty">{item.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateQuantity(item, item.quantity + 1)
                        }}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="total-line">
                  <span>Subtotal:</span>
                  <span>${session.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="total-line">
                  <span>Tax:</span>
                  <span>${session.totals.tax.toFixed(2)}</span>
                </div>
                <div className="total-line total">
                  <span>Total:</span>
                  <span>${session.totals.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="pay-button"
                onClick={handlePay}
                disabled={session.paymentStatus === 'awaiting_payment'}
              >
                {session.paymentStatus === 'awaiting_payment' ? 'Processing...' : 'Pay Now'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BrowsingView

