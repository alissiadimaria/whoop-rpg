import { useRef, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ARCHETYPE_MAP } from '../archetypes'

// ─── SVG constants ────────────────────────────────────────────────────────────

const SVG_W      = 1200
const SVG_H      = 320
const PAD_TOP    = 35
const PAD_BOTTOM = 25

// ─── Colors ───────────────────────────────────────────────────────────────────

const CHAPTER_PALETTE = [
  '#4ade80', '#f87171', '#a78bfa', '#60a5fa', '#fb923c', '#f472b6', '#34d399', '#facc15',
]

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const ARCHETYPE_DATA = ARCHETYPE_MAP

const ARCHETYPE_PICK = {
  'The Sovereign': { field: 'autonomic_recovery', desc: true  },
  'The Warrior':   { field: 'strain',             desc: true  },
  'The Sage':      { field: 'sws_pct',            desc: true  },
  'The Wanderer':  { field: 'stability',          desc: false },
  'The Hermit':    { field: 'recovery_score',     desc: false },
  'The Shadow':    { field: 'autonomic_recovery', desc: false },
  'The Phoenix':   { field: 'autonomic_recovery', desc: true  },
  'The Vessel':    { field: 'stability',          desc: true  },
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function getX(index, total) {
  return 10 + (index / (total - 1)) * (SVG_W - 20)
}

function getY(hrv, minHrv, maxHrv) {
  const drawH = SVG_H - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + drawH * (1 - (hrv - minHrv) / (maxHrv - minHrv))
}

function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx  = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function fillPath(slice) {
  if (slice.length === 0) return ''
  const bottom = SVG_H - PAD_BOTTOM
  return (
    smoothPath(slice) +
    ` L ${slice[slice.length - 1].x} ${bottom}` +
    ` L ${slice[0].x} ${bottom} Z`
  )
}

function fmtDate(iso) {
  const [yr, mo, dy] = iso.split('-')
  return new Date(parseInt(yr), parseInt(mo) - 1, parseInt(dy))
    .toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

// ─── DayPanel ─────────────────────────────────────────────────────────────────

function DayPanel({ day, onClose, isMobile }) {
  const arcData = day?.archetype ? ARCHETYPE_DATA[day.archetype] : null

  useEffect(() => {
    if (!day) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [day, onClose])

  const panelColor = arcData?.color ?? 'rgba(255,255,255,0.15)'

  const fullContent = arcData && (
    <div style={{
      display:       'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height:        '100%',
      overflow:      'hidden',
    }}>
      <div style={{
        width:          isMobile ? '100%' : '40%',
        height:         isMobile ? '45%'  : '100%',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        isMobile ? '0.5rem' : '1rem',
        borderRight:    isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderBottom:   isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
        flexShrink:     0,
      }}>
        <video
          src={`/archetypes/${arcData.slug}.mp4`}
          autoPlay muted loop playsInline
          style={{ height: isMobile ? '75%' : '80%', objectFit: 'contain' }}
        />
        <p className="font-display" style={{
          color: arcData.color, fontSize: isMobile ? '0.65rem' : 'clamp(0.7rem, 1.2vw, 0.9rem)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginTop: '0.4rem', textAlign: 'center',
        }}>
          {day.archetype}
        </p>
      </div>

      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'center',
        padding:       isMobile ? '0.75rem 1rem' : '1.5rem 2rem',
        gap:           '0.55rem',
        overflow:      'hidden',
      }}>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif' }}>
          {day.date}
        </p>
        <p className="font-display" style={{ fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 1.6vw, 1.1rem)', color: '#fff', lineHeight: 1.35 }}>
          {arcData.oneliner}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {arcData.signals.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.dir === 'up' ? '#4ade80' : '#f87171' }}>
                {s.dir === 'up' ? '↑' : '↓'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '0.35rem 0.6rem',
          marginTop:           '0.2rem',
          paddingTop:          '0.4rem',
          borderTop:           '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { label: 'HRV',        value: day.hrv != null           ? `${Math.round(day.hrv)}ms`            : '—' },
            { label: 'Recovery',   value: day.recovery_score != null ? `${Math.round(day.recovery_score)}%`  : '—' },
            { label: 'Strain',     value: day.strain != null         ? day.strain.toFixed(1)                 : '—' },
            { label: 'Deep Sleep', value: day.sws_pct != null        ? `${Math.round(day.sws_pct)}%`         : '—' },
            { label: 'REM',        value: day.rem_pct != null        ? `${Math.round(day.rem_pct)}%`         : '—' },
            { label: 'Stability',  value: day.stability != null      ? day.stability.toFixed(2)              : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(
    <AnimatePresence>
      {day && (
        <>
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              height:   isMobile ? '50vh' : '35vh',
              zIndex:   99,
              background: 'var(--parchment-dark)',
              borderTop: `1px solid ${panelColor}`,
              overflow: 'hidden',
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <button onClick={onClose} style={{
              position: 'absolute', top: '0.9rem', right: '1.1rem',
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.35)', fontSize: '1.2rem', lineHeight: 1, cursor: 'pointer', zIndex: 1,
            }}>×</button>
            {fullContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── ChapterTerrain ───────────────────────────────────────────────────────────

/**
 * Full-width SVG terrain for a single chapter.
 * The draw animation plays fresh every time this mounts (i.e. on chapter switch).
 */
function ChapterTerrain({ chData, color, isMobile, onMarkerClick }) {
  const svgRef    = useRef(null)
  const isInView  = useInView(svgRef, { once: false, amount: 0.3 })
  const svgH      = isMobile ? 200 : 320

  if (!chData) return null
  const { terrain, fill, markers, dayMarkers } = chData

  // Scale dot size down when many markers are shown
  const dotR  = markers.length > 15 ? (isMobile ? 3 : 5) : markers.length > 8 ? (isMobile ? 4 : 7) : (isMobile ? 5 : 9)

  return (
    <div ref={svgRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: `${svgH}px` }}
      >
        <defs>
          <linearGradient id="chFillGrad" gradientUnits="userSpaceOnUse" x1="0" y1={PAD_TOP} x2="0" y2={SVG_H - PAD_BOTTOM}>
            <stop offset="0" stopColor={color} stopOpacity="0.3" />
            <stop offset="1" stopColor={color} stopOpacity="0"   />
          </linearGradient>
          <filter id="chGlowBlur" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Fill */}
        <motion.path
          d={fill}
          fill="url(#chFillGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Glow */}
        <motion.path
          d={terrain}
          stroke={color} strokeWidth="5" fill="none"
          filter="url(#chGlowBlur)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: [0.15, 0.3, 0.15] } : { pathLength: 0, opacity: 0 }}
          transition={{
            pathLength: { duration: 2, ease: 'easeInOut' },
            opacity:    { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 },
          }}
        />

        {/* Crisp line */}
        <motion.path
          d={terrain}
          stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isInView ? 1 : 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
      </svg>

      {/* Marker dots */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {markers.map(p => {
          const arcData = ARCHETYPE_DATA[p.archetype]
          if (!arcData) return null
          const ringD = dotR * 3
          return (
            <div
              key={`marker-${p.date}`}
              style={{
                position:      'absolute',
                left:          `${(p.x / SVG_W) * 100}%`,
                top:           `${(p.y / SVG_H) * svgH}px`,
                transform:     'translate(-50%, -50%)',
                width:         ringD, height: ringD,
                cursor:        'pointer', pointerEvents: 'all',
                display:       'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => onMarkerClick(p)}
            >
              <motion.div
                style={{
                  position: 'absolute', width: ringD, height: ringD,
                  borderRadius: '50%', border: `2px solid ${arcData.color}`, pointerEvents: 'none',
                }}
                animate={{ scale: [1, 1.4], opacity: [0.9, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <div style={{
                width: dotR * 2, height: dotR * 2, borderRadius: '50%',
                background: '#ffffff', boxShadow: `0 0 6px ${arcData.color}`, pointerEvents: 'none',
              }} />
            </div>
          )
        })}
      </div>

      {/* Day x-axis — filter labels whose centres are too close to prevent overlap */}
      <div style={{ position: 'relative', width: '100%', height: '22px' }}>
        {(() => {
          const minGap = isMobile ? 165 : 85 // SVG units between label centres
          let lastX    = -Infinity
          return dayMarkers.filter(m => {
            if (m.x - lastX >= minGap) { lastX = m.x; return true }
            return false
          })
        })().map((m, i) => (
          <span key={`${m.label}-${i}`} style={{
            position:  'absolute',
            left:      `${(m.x / SVG_W) * 100}%`,
            transform: (() => {
              const pct = (m.x / SVG_W) * 100
              return pct < 4 ? 'translateX(0%)' : pct > 96 ? 'translateX(-100%)' : 'translateX(-50%)'
            })(),
            top:       '4px',
            fontSize:      '0.58rem',
            color:         'rgba(255,255,255,0.6)',
            fontFamily:    'Inter, sans-serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace:    'nowrap',
            userSelect:    'none',
          }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── ChapterTimeline ──────────────────────────────────────────────────────────

export default function ChapterTimeline({ daily, chapters }) {
  const [activeChapter, setActiveChapter] = useState(null)
  const [selectedDay,   setSelectedDay]   = useState(null)
  const [isMobile,      setIsMobile]      = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Default to first chapter once data loads
  useEffect(() => {
    if (chapters?.length && activeChapter === null) {
      setActiveChapter(chapters[0].chapter)
    }
  }, [chapters, activeChapter])

  // Chapter colors from dominant archetype
  const chapterColors = useMemo(() => {
    if (!chapters?.length) return {}
    return Object.fromEntries(
      chapters.map((ch, i) => [
        ch.chapter,
        ARCHETYPE_DATA[ch.dominant_archetype]?.color ?? CHAPTER_PALETTE[i % CHAPTER_PALETTE.length],
      ])
    )
  }, [chapters])

  // Per-chapter terrain data
  const chapterDataMap = useMemo(() => {
    if (!daily?.length || !chapters?.length) return {}
    const result = {}

    chapters.forEach(ch => {
      const chDays = daily.filter(d =>
        d.hrv != null &&
        d.date >= ch.start_date &&
        d.date <= ch.end_date
      )
      if (chDays.length === 0) return

      const hrvValues = chDays.map(d => d.hrv)
      const minHrv    = Math.min(...hrvValues) - 8
      const maxHrv    = Math.max(...hrvValues) + 8
      const total     = chDays.length

      const points = chDays.map((day, i) => ({
        ...day,
        x: getX(i, total),
        y: getY(day.hrv, minHrv, maxHrv),
      }))

      // Day tick labels: derive interval from how many labels can cleanly fit
      const maxLabels    = isMobile ? 5 : 10
      const tickInterval = Math.max(1, Math.ceil(total / maxLabels))
      const dayMarkers   = []
      chDays.forEach((day, i) => {
        if (i === 0 || i % tickInterval === 0) {
          dayMarkers.push({ label: fmtDate(day.date), x: getX(i, total) })
        }
      })
      // Append last day only if it falls more than half a tick gap after the last placed label
      const lastIdx     = chDays.length - 1
      const lastTickIdx = Math.floor(lastIdx / tickInterval) * tickInterval
      if (lastIdx !== lastTickIdx && lastIdx - lastTickIdx > tickInterval * 0.5) {
        dayMarkers.push({ label: fmtDate(chDays[lastIdx].date), x: getX(lastIdx, total) })
      }

      // Multi-pass archetype picking: ~30% of chapter days, round-robin per archetype
      const targetCount     = Math.max(3, Math.round(total * 0.3))
      const seenDates       = new Set()
      const archetypeRanked = {}
      Object.entries(ARCHETYPE_PICK).forEach(([arcName, { field, desc }]) => {
        archetypeRanked[arcName] = points
          .filter(p => p.archetype === arcName && p[field] != null && p.stability != null)
          .sort((a, b) => desc ? b[field] - a[field] : a[field] - b[field])
      })

      const markers = []
      for (let pass = 0; markers.length < targetCount; pass++) {
        let added = 0
        for (const pool of Object.values(archetypeRanked)) {
          if (markers.length >= targetCount) break
          const next = pool.find(p => !seenDates.has(p.date))
          if (next) { markers.push(next); seenDates.add(next.date); added++ }
        }
        if (added === 0) break
      }
      markers.sort((a, b) => a.date.localeCompare(b.date))

      result[ch.chapter] = {
        points,
        terrain:    smoothPath(points),
        fill:       fillPath(points),
        dayMarkers,
        markers,
      }
    })

    return result
  }, [daily, chapters, isMobile])

  if (!chapters?.length || activeChapter === null) return null

  const activeCh    = chapters.find(c => c.chapter === activeChapter)
  const activeColor = chapterColors[activeChapter] ?? '#ffffff'

  return (
    <section style={{
      background:    'var(--parchment)',
      padding:       '4rem 0 5rem',
      position:      'relative',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '0 1.5rem' }}>
        <motion.h2
          className="font-display"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-80px' }}
          style={{
            fontSize:      'clamp(1.8rem, 3.5vw, 2.8rem)',
            color:         'var(--charcoal)',
            letterSpacing: '-0.01em',
            fontWeight:    600,
            marginBottom:  '0.4rem',
          }}
        >
          My data
        </motion.h2>
        <p style={{
          fontSize:   '0.8rem',
          color:      'var(--text-muted)',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.04em',
        }}>
          Click any glowing point to explore that day.
        </p>
      </div>

      {/* Chapter tabs */}
      <div style={{
        display:        'flex',
        justifyContent: 'center',
        gap:            '0.5rem',
        padding:        '0 1.5rem',
        overflowX:      'auto',
        marginBottom:   '2rem',
        flexWrap:       isMobile ? 'nowrap' : 'wrap',
      }}>
        {chapters.map(ch => {
          const color    = chapterColors[ch.chapter]
          const isActive = ch.chapter === activeChapter
          return (
            <button
              key={ch.chapter}
              onClick={() => setActiveChapter(ch.chapter)}
              style={{
                background:   isActive ? hexToRgba(color, 0.12) : 'transparent',
                border:       `1px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '0.6rem',
                padding:      isMobile ? '0.45rem 0.9rem' : '0.55rem 1.2rem',
                cursor:       'pointer',
                display:      'flex',
                flexDirection:'column',
                alignItems:   'center',
                gap:          '0.15rem',
                transition:   'all 0.25s ease',
                flexShrink:   0,
              }}
            >
              <span style={{
                fontSize:      isMobile ? '0.6rem' : '0.65rem',
                letterSpacing: '0.08em',
                color:         isActive ? color : 'rgba(255,255,255,0.35)',
                fontFamily:    'Inter, sans-serif',
                fontWeight:    600,
                textTransform: 'uppercase',
              }}>
                Ch {ch.chapter}
              </span>
              <span style={{
                fontSize:   isMobile ? '0.55rem' : '0.6rem',
                color:      isActive ? color : 'rgba(255,255,255,0.2)',
                fontFamily: 'Inter, sans-serif',
                fontStyle:  'italic',
                whiteSpace: 'nowrap',
              }}>
                {ch.dominant_archetype?.replace('The ', '') ?? '—'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Terrain — AnimatePresence replays draw animation on each chapter switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeChapter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <ChapterTerrain
            chData={chapterDataMap[activeChapter]}
            color={activeColor}
            isMobile={isMobile}
            onMarkerClick={setSelectedDay}
          />
        </motion.div>
      </AnimatePresence>

      {/* Chapter info strip */}
      {activeCh && (
        <motion.div
          key={`info-${activeChapter}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            display:        'flex',
            justifyContent: 'center',
            alignItems:     'center',
            gap:            isMobile ? '1.2rem' : '3rem',
            padding:        '1.2rem 1.5rem 0',
            flexWrap:       'wrap',
          }}
        >
          {[
            { label: 'Chapter',   value: activeCh.chapter },
            { label: 'Archetype', value: activeCh.dominant_archetype ?? '—', color: activeColor },
            { label: 'Period',    value: `${fmtDate(activeCh.start_date)} – ${fmtDate(activeCh.end_date)}` },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </p>
              <p style={{ fontSize: '0.8rem', color: color ?? 'rgba(255,255,255,0.65)', fontFamily: 'Inter, sans-serif', marginTop: '0.15rem' }}>
                {value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Transition summary — why PELT split here */}
      {activeCh?.transition?.summary && (
        <motion.p
          key={`transition-${activeChapter}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            textAlign:     'center',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.62rem',
            letterSpacing: '0.08em',
            color:         'rgba(255,255,255,0.28)',
            padding:       '0.6rem 2rem 0',
          }}
        >
          {activeCh.transition.summary}
        </motion.p>
      )}

      {/* Day detail panel */}
      <DayPanel
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        isMobile={isMobile}
      />
    </section>
  )
}
