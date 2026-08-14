import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working')
  const [message, setMessage] = useState('Confirming your payment...')

  useEffect(() => {
    const activateAutomation = async () => {
      const channelId = localStorage.getItem('pendingChannelId')
      const duration = localStorage.getItem('pendingDuration')
      const autoRefresh = localStorage.getItem('pendingAutoRefresh')

      const urlParams = new URLSearchParams(window.location.search)
const reference = urlParams.get('reference')

if (reference) {
  const token = localStorage.getItem('token')
  await fetch(`http://localhost:3000/api/payments/verify/${reference}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

      if (!channelId || !duration) {
        setStatus('done')
        setMessage('Payment received! Head back to your dashboard to continue.')
        return
      }

      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:3000/api/automation/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            channelId,
            durationDays: Number(duration),
            autoRefresh: autoRefresh === 'true',
          }),
        })

        if (!res.ok) {
          setStatus('error')
          setMessage('Payment succeeded, but we could not start automation automatically. Please try starting it again from your channel page.')
          return
        }

        localStorage.removeItem('pendingChannelId')
        localStorage.removeItem('pendingDuration')
        localStorage.removeItem('pendingAutoRefresh')

        setStatus('done')
        setMessage('Your automation is now live. Videos will start generating and uploading automatically.')
      } catch (err) {
        setStatus('error')
        setMessage('Payment succeeded, but something went wrong activating automation. Please check your channel page.')
      }
    }

    activateAutomation()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: status === 'error' ? 'rgba(255,75,62,0.1)' : 'rgba(79,209,197,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        fontSize: '24px',
      }}>
        {status === 'working' ? '⏳' : status === 'error' ? '⚠️' : '✓'}
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 }}>
        {status === 'working' ? 'Confirming payment...' : status === 'error' ? 'Almost there' : 'Thank you for choosing Tubamintai!'}
      </h2>

      <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '12px', maxWidth: '380px' }}>
        {message}
      </p>

      {status !== 'working' && (
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '32px',
            background: 'var(--text)',
            color: '#0B0C0E',
            padding: '13px 26px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </div>
      )}
    </div>
  )
}