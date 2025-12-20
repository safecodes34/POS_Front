import React from 'react'
import { useCheckoutSession } from '../../contexts/CheckoutSessionContext'
import './ReceiptView.css'

const ReceiptView = () => {
  const { session } = useCheckoutSession()

  return (
    <div className="receipt-view">
      <div className="receipt-container">
        <div className="receipt-icon">✓</div>
        <h1>Thank You!</h1>
        <p className="subtitle">Your order has been completed</p>

        <div className="receipt-details">
          <div className="receipt-section">
            <h2>Order Summary</h2>
            {session.orderItems.map((item, idx) => (
              <div key={idx} className="receipt-item">
                <span className="item-name">{item.name} × {item.quantity}</span>
                <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-section totals">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>${session.totals.subtotal.toFixed(2)}</span>
            </div>
            {session.tip.tipAmount > 0 && (
              <div className="total-line">
                <span>Tip:</span>
                <span>${session.tip.tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-line">
              <span>Tax:</span>
              <span>${session.totals.tax.toFixed(2)}</span>
            </div>
            <div className="total-line grand-total">
              <span>Total:</span>
              <span>${(session.totals.total + session.tip.tipAmount).toFixed(2)}</span>
            </div>
          </div>

          {session.loyalty.pointsEarned > 0 && (
            <div className="receipt-section">
              <p className="loyalty-message">
                You earned {session.loyalty.pointsEarned} loyalty points!
              </p>
            </div>
          )}
        </div>

        <p className="footer-message">Please come again!</p>
      </div>
    </div>
  )
}

export default ReceiptView




