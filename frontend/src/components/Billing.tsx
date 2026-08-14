import { useState } from 'react'
import './Billing.css'

const plans = [
  { tier: 'Tier1_30', days: 30, price: '₦15,000' },
  { tier: 'Tier2_60', days: 60, price: '₦25,000' },
  { tier: 'Tier3_90', days: 90, price: '₦35,000' },
  { tier: 'Tier4_365', days: 365, price: '₦120,000' },
]

export default function Billing() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const params = new URLSearchParams(window.location.search)
const [selectedTier, setSelectedTier] = useState(params.get('tier') || 'Tier2_60')

  const handleSelect = async (tier: string) => {
    setError('')
    setLoading(tier)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout')
        setLoading(null)
        return
      }

      window.location.href = data.authorizationUrl
    } catch (err) {
      setError('Could not reach server')
      setLoading(null)
    }
  }

  return (
    <div className="billing">
      <div className="billing-head">
        <h3>Choose your automation cycle</h3>
        <p>One channel, running daily, for the length you pick</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="plan-grid">
        {plans.map((plan) => (
          <div
  className={`plan ${selectedTier === plan.tier ? 'featured' : ''}`}
  key={plan.tier}
  onClick={() => setSelectedTier(plan.tier)}
  style={{ cursor: 'pointer' }}
>
  <div className="days">{plan.days} Days</div>
  <div className="price">{plan.price}</div>
  <ul>
    <li>Daily uploads</li>
    <li>1 channel</li>
    <li>{selectedTier === plan.tier ? 'Priority support' : 'Standard support'}</li>
  </ul>
  <div className="plan-btn" onClick={(e) => { e.stopPropagation(); handleSelect(plan.tier); }}>
    {loading === plan.tier ? 'Loading...' : 'Select'}
  </div>
</div>
        ))}
      </div>
    </div>
  )
}