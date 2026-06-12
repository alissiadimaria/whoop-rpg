import { useState, useEffect } from 'react'
import './index.css'

import Prologue from './components/Prologue'
import ActOne   from './components/ActOne'
import ChapterTimeline from './components/ChapterTimeline'
import ActFive from './components/ActFive'

function App() {
  const [daily,    setDaily]    = useState([])
  const [chapters, setChapters] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const API = import.meta.env.VITE_API_URL
        const [dailyRes, chaptersRes] = await Promise.all([
          fetch(`${API}/daily`),
          fetch(`${API}/chapters`),
        ])
        setDaily(await dailyRes.json())
        setChapters(await chaptersRes.json())
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

      {/* ACT 1 — The Hook */}
      <ActOne />

      {/* PROLOGUE — Meet the Players */}
      <Prologue />

      {/* CHAPTER TIMELINE — cinematic terrain section */}
      <ChapterTimeline
        daily={daily}
        chapters={chapters}
      />

      {/* ACT 5 — The Reveal */}
      <ActFive />

      {/* FOOTER */}
      <footer className="px-6 py-12 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="font-display text-sm tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          ALISSIA DI MARIA
        </p>
        <div className="flex justify-center gap-6">
          <a href="https://github.com/yourusername/whoop-rpg"
             className="text-sm hover:underline"
             style={{ color: 'var(--text-secondary)' }}>GitHub</a>
          <a href="https://linkedin.com/in/yourprofile"
             className="text-sm hover:underline"
             style={{ color: 'var(--text-secondary)' }}>LinkedIn</a>
        </div>
      </footer>

    </div>
  )
}

export default App