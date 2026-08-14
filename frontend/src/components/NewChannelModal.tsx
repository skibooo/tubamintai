import { useState } from 'react'

const niches = [
  'Tech & Science Facts',
  'Family & Emotional Stories',
  'History Mysteries',
  'Motivation & Mindset',
  'AI & Technology',
  'Finance & Investing',
  'Business & Entrepreneurship',
  'Motivation & Self Improvement',
  'Celebrity & Pop Culture',
  'Entertainment',
  'Gaming',
  'Sports',
  'Luxury & Wealth',
  'Health & Fitness',
  'Psychology',
  'History',
  'True Crime & Mysteries',
  'Science & Space',
  'Movies & TV',
]

export default function NewChannelModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [selectedNiche, setSelectedNiche] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setError('')

    if (!name || !selectedNiche) {
      setError('Please fill in a channel name and pick a niche')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://https://tubamintai.onrender.com/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: name, niche: selectedNiche }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create channel')
        return
      }

      onClose()
    } catch (err) {
      setError('Could not reach server')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h4>Create a new channel</h4>
        <p className="sub">This decides the kind of scripts and visuals your channel gets, daily.</p>

        <div className="field" style={{ maxWidth: 'none' }}>
          <label>Channel Name</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tech Facts"
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            Niche
          </label>
          <div className="niche-grid">
            {niches.map((niche) => (
              <div
                key={niche}
                className={`niche-opt ${selectedNiche === niche ? 'sel' : ''}`}
                onClick={() => setSelectedNiche(niche)}
              >
                {niche}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <div className="btn-ghost" onClick={onClose}>Cancel</div>
          <div className="btn-next" onClick={handleCreate}>Create Channel</div>
        </div>
      </div>
    </div>
  )
}
