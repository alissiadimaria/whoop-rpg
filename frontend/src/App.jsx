import { useState, useEffect } from 'react'
import './index.css'

// we'll import components here as we build them
import Timeline from './components/Timeline'

function App() {
  const [daily, setDaily] = useState([])
  const [chapters, setChapters] = useState([])
  const [legendary, setLegendary] = useState([])
  const [bossFights, setBossFights] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // fetch all data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [dailyRes, chaptersRes, legendaryRes, bossRes, currentRes] = await Promise.all([
          fetch('http://localhost:8000/daily'),
          fetch('http://localhost:8000/chapters'),
          fetch('http://localhost:8000/legendary'),
          fetch('http://localhost:8000/boss-fights'),
          fetch('http://localhost:8000/current'),
        ])

        setDaily(await dailyRes.json())
        setChapters(await chaptersRes.json())
        setLegendary(await legendaryRes.json())
        setBossFights(await bossRes.json())
        setCurrent(await currentRes.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="font-display text-2xl" style={{ color: 'var(--text-secondary)' }}>
        Loading your health arc...
      </p>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <p style={{ color: 'var(--red)' }}>Error: {error}. Is the API running?</p>
    </div>
  )

  return (
    <div className="app">

      {/* SECTION 1 — Hero */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="font-display text-sm tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          244 DAYS · 3 CHAPTERS · 1 STORY
        </p>
        <h1 className="font-display text-6xl font-bold mb-6" style={{ color: 'var(--charcoal)' }}>
          Your Health Arc
        </h1>
        <p className="text-xl max-w-xl" style={{ color: 'var(--text-secondary)' }}>
          Eight months of physiological data told as an RPG story.
          Change-point detection found your life chapters from HRV alone.
        </p>
        <div className="mt-12 animate-bounce" style={{ color: 'var(--text-muted)' }}>
          ↓ scroll to begin
        </div>
      </section>

      {/* SECTION 2 — Timeline */}
      <section id="timeline" className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
          The Journey
        </h2>
        <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
          HRV rendered as terrain. Peaks are recovery. Valleys are struggle.
        </p>
        <Timeline
          daily={daily}
          chapters={chapters}
          legendary={legendary}
          bossFights={bossFights}
        />
      </section>

      {/* SECTION 3 — Chapter Cards */}
      <section id="chapters" className="px-6 py-24" style={{ background: 'var(--parchment-dark)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
            Three Chapters
          </h2>
          <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
            PELT recovered these phases from HRV alone — no biographical input.
          </p>
          {/* Chapter cards go here */}
          <div className="grid grid-cols-3 gap-6">
            {chapters.map(c => (
              <div key={c.chapter} className="p-6 rounded-2xl"
                   style={{ background: 'var(--parchment)', border: '1px solid var(--border)' }}>
                <p className="font-display text-lg font-semibold">{c.name}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {c.start_date} → {c.end_date}
                </p>
                <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                  Avg HRV: {c.mean_hrv}ms · Recovery: {c.mean_recovery}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Legendary Days & Boss Fights */}
      <section id="anomalies" className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
          Legendary Days & Boss Fights
        </h2>
        <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
          Algorithmically detected outliers — your best and worst days.
        </p>
        {/* Anomaly cards go here */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="font-display text-lg mb-4" style={{ color: 'var(--gold)' }}>⭐ Legendary</p>
            {legendary.slice(0, 3).map(d => (
              <div key={d.date} className="p-4 rounded-xl mb-3"
                   style={{ background: 'var(--parchment-dark)', border: '1px solid var(--border)' }}>
                <p className="font-semibold">{d.date}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Recovery {d.recovery_score}% · HRV {d.hrv}ms
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="font-display text-lg mb-4" style={{ color: 'var(--red)' }}>💀 Boss Fights</p>
            {bossFights.slice(0, 3).map(d => (
              <div key={d.date} className="p-4 rounded-xl mb-3"
                   style={{ background: 'var(--parchment-dark)', border: '1px solid var(--border)' }}>
                <p className="font-semibold">{d.date}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Recovery {d.recovery_score}% · HRV {d.hrv}ms
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — Current Character */}
      <section id="current" className="px-6 py-24" style={{ background: 'var(--parchment-dark)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
            Current Character
          </h2>
          <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
            Today's physiological state.
          </p>
          {/* Current stats go here */}
          {current && (
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Recovery', value: `${current.recovery_score}%` },
                { label: 'HRV', value: `${Math.round(current.hrv)}ms` },
                { label: 'Autonomic Recovery', value: `${Math.round(current.autonomic_recovery)}` },
                { label: 'SWS', value: `${current.sws_pct?.toFixed(1)}%` },
                { label: 'REM', value: `${current.rem_pct?.toFixed(1)}%` },
                { label: 'Stability', value: `${Math.round(current.stability)}` },
              ].map(stat => (
                <div key={stat.label} className="p-6 rounded-2xl text-center"
                     style={{ background: 'var(--parchment)', border: '1px solid var(--border)' }}>
                  <p className="text-3xl font-semibold" style={{ color: 'var(--charcoal)' }}>
                    {stat.value}
                  </p>
                  <p className="text-sm mt-1 font-display tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6 — Character Builder */}
      <section id="builder" className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
          Build Your Character
        </h2>
        <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
          What does your character look like today?
        </p>
        {/* Character builder goes here */}
        <div className="h-48 rounded-2xl flex items-center justify-center"
             style={{ background: 'var(--parchment-dark)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Character builder coming soon</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-12 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="font-display text-sm tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          ALISSIA DI MARIA
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          244 days · PELT change-point detection · HRV baseline normalization
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="https://github.com/yourusername/whoop-rpg" 
             className="text-sm hover:underline"
             style={{ color: 'var(--text-secondary)' }}>GitHub</a>
          <a href="/methodology" 
             className="text-sm hover:underline"
             style={{ color: 'var(--text-secondary)' }}>Methodology</a>
          <a href="https://linkedin.com/in/yourprofile"
             className="text-sm hover:underline"
             style={{ color: 'var(--text-secondary)' }}>LinkedIn</a>
        </div>
      </footer>

    </div>
  )
}

export default App