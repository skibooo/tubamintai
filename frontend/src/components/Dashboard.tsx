import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import NewChannelModal from './NewChannelModal'
import './NewChannelModal.css'

interface Channel {
  id: string
  title: string
  niche: string
}

interface AutomationCycle {
  channelId: string
  isActive: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [cycles, setCycles] = useState<AutomationCycle[]>([])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [channelsRes, cyclesRes] = await Promise.all([
        fetch('http://localhost:3000/api/channels', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/automation/cycles', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      setChannels(await channelsRes.json())
      setCycles(await cyclesRes.json())
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const isChannelLive = (channelId: string) =>
    cycles.some((c) => c.channelId === channelId && c.isActive)

  return (
    <div>
      <div className="main-head">
        <div>
          <h3>Your Channels</h3>
          <p>{channels.length} channels connected</p>
        </div>
        <div className="new-btn" onClick={() => setShowModal(true)}>+ New Channel</div>
      </div>

      {channels.length === 0 ? (
  <div className="empty-state">
    <h4>No Channel Created</h4>
    <p>Create your first channel to start automating daily uploads.</p>
    <div className="new-btn" onClick={() => setShowModal(true)} style={{ display: 'inline-block', marginTop: '20px' }}>
      Create Your First Channel
    </div>
  </div>
) : (
  <div className="ch-grid">
    {channels.map((ch) => (
      <div
        className="ch-card"
        key={ch.id}
        onClick={() => navigate(`/channels/${ch.id}`)}
        style={{ cursor: 'pointer' }}
      >
        <div className="row1">
          <div>
            <div className="name">{ch.title}</div>
            <div className="niche">{ch.niche}</div>
          </div>
          <div className={`status-pill ${isChannelLive(ch.id) ? 'live' : 'off'}`}>
            <span className="d" />
            {isChannelLive(ch.id) ? 'Live' : 'Inactive'}
          </div>
        </div>
      </div>
    ))}
  </div>
)}

      {showModal && <NewChannelModal onClose={() => { setShowModal(false); fetchData(); }} />}
    </div>
  )
}