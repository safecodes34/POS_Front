import React, { useState } from 'react'
import { useCheckoutSession } from '../../contexts/CheckoutSessionContext'
import './TipView.css'

const TipView = () => {
  const { session, updateTip, nextPostPayStep } = useCheckoutSession()
  const [customTip, setCustomTip] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const tipOptions = [
    { percent: 15, label: '15%' },
    { percent: 20, label: '20%' },
    { percent: 25, label: '25%' }
  ]

  const calculateTip = (percent) => {
    const baseAmount = session.totals.subtotal // Tip on subtotal before tax
    return (baseAmount * percent) / 100
  }

  const handleTipSelect = (percent) => {
    const tipAmount = calculateTip(percent)
    updateTip({
      tipPercent: percent,
      tipAmount,
      status: 'set'
    })
    
    // Advance to next step
    setTimeout(() => {
      nextPostPayStep()
    }, 500)
  }

  const handleCustomTip = () => {
    const customAmount = parseFloat(customTip)
    if (!isNaN(customAmount) && customAmount >= 0) {
      const baseAmount = session.totals.subtotal
      const percent = (customAmount / baseAmount) * 100
      updateTip({
        tipPercent: percent,
        tipAmount: customAmount,
        status: 'set'
      })
      
      setTimeout(() => {
        nextPostPayStep()
      }, 500)
    }
  }

  const handleNoTip = () => {
    updateTip({
      tipPercent: 0,
      tipAmount: 0,
      status: 'skipped'
    })
    
    setTimeout(() => {
      nextPostPayStep()
    }, 500)
  }

  return (
    <div className="tip-view">
      <div className="tip-container">
        <h1>Add a Tip?</h1>
        <p className="subtitle">Your total: ${session.totals.total.toFixed(2)}</p>

        <div className="tip-options">
          {tipOptions.map(option => {
            const tipAmount = calculateTip(option.percent)
            return (
              <button
                key={option.percent}
                className="tip-button"
                onClick={() => handleTipSelect(option.percent)}
              >
                <div className="tip-percent">{option.label}</div>
                <div className="tip-amount">${tipAmount.toFixed(2)}</div>
              </button>
            )
          })}

          {showCustom ? (
            <div className="custom-tip-input">
              <div className="input-wrapper">
                <span className="currency">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <button className="btn-apply" onClick={handleCustomTip}>
                Apply
              </button>
            </div>
          ) : (
            <button
              className="tip-button custom"
              onClick={() => setShowCustom(true)}
            >
              <div className="tip-percent">Custom</div>
            </button>
          )}
        </div>

        <button className="btn-no-tip" onClick={handleNoTip}>
          No Tip
        </button>
      </div>
    </div>
  )
}

export default TipView




