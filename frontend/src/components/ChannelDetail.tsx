import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ChannelDetail.css'

interface Channel {
  id: string
  title: string
  niche: string
}

interface AutomationCycle {
  id: string
  channelId: string
  durationDays: number
  isActive: boolean
  startDate: string
  endDate: string
}

const durations = [30, 60, 90, 365]

export default function ChannelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [cycle, setCycle] = useState<AutomationCycle | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')

      const [channelsRes, cyclesRes] = await Promise.all([
        fetch('http://localhost:3000/api/channels', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('http://localhost:3000/api/automation/cycles', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      const channelsData = await channelsRes.json()
      const cyclesData = await cyclesRes.json()

      const found = channelsData.find((c: Channel) => c.id === id)
      setChannel(found || null)

      const activeCycle = cyclesData.find(
        (c: AutomationCycle) =>
          c.channelId === id && c.isActive
      )

      setCycle(activeCycle || null)
    } catch (err) {
      console.error('Failed to fetch channel data', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  if (!channel) {
    return (
      <div className="detail-wrap">
        <div
          className="back-link"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </div>

        <p
          style={{
            color: 'var(--text-dim)',
            marginTop: '20px',
          }}
        >
          Loading channel...
        </p>
      </div>
    )
  }

  const durationToTier: Record<number, string> = {
    30: 'Tier1_30',
    60: 'Tier2_60',
    90: 'Tier3_90',
    365: 'Tier4_365',
  }

  const handleContinueToPayment = () => {
    localStorage.setItem('pendingChannelId', id || '')
    localStorage.setItem(
      'pendingDuration',
      String(selectedDuration)
    )
    localStorage.setItem(
      'pendingAutoRefresh',
      String(autoRefresh)
    )

    navigate(`/billing?tier=${durationToTier[selectedDuration]}`)
  }

  return (
    <div className="detail-wrap">
      <div
        className="back-link"
        onClick={() => navigate('/dashboard')}
      >
        ← Back to Dashboard
      </div>

      <div className="detail-head">
        <h3>{channel.title}</h3>
        <p>{channel.niche}</p>

        <div
          className="btn-ghost"
          style={{
            marginBottom: '24px',
            display: 'inline-block',
            border: '1px solid var(--line)',
            padding: '10px 16px',
            borderRadius: '6px',
          }}
          onClick={() => {
            const token = localStorage.getItem('token')

            window.location.href = `http://localhost:3000/api/auth/google?token=${token}`
          }}
        >
          Connect YouTube Channel
        </div>
      </div>

      {cycle ? (
        <div className="cycle-card active">
          <div className="cycle-status">
            <span className="d" />
            AUTOMATION ACTIVE
          </div>

          <p className="cycle-detail">
            {cycle.durationDays}-day cycle · Started{' '}
            {new Date(cycle.startDate).toLocaleDateString()} · Ends{' '}
            {new Date(cycle.endDate).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="cycle-card">
          <h4>Start Automation</h4>

          <p className="sub">
            Pick a cycle length. Your channel will get one new
            video, generated and uploaded automatically to your
            YouTube channel, every day until it ends.
          </p>

          <div className="duration-grid">
            {durations.map((d) => (
              <div
                key={d}
                className={`duration-opt ${
                  selectedDuration === d ? 'sel' : ''
                }`}
                onClick={() => setSelectedDuration(d)}
              >
                {d} Days
              </div>
            ))}
          </div>

          <label className="refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) =>
                setAutoRefresh(e.target.checked)
              }
            />

            Auto renew when this cycle ends.
          </label>

          <div
            className="btn-next"
            style={{
              marginTop: '20px',
              display: 'inline-block',
            }}
            onClick={handleContinueToPayment}
          >
            Continue to Payment
          </div>
        </div>
      )}
    </div>
  )
}