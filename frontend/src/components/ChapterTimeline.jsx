import { useRef, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  motion, AnimatePresence,
  useScroll, useMotionValueEvent, useInView,
} from 'framer-motion'
import { ARCHETYPE_MAP } from '../archetypes'

// ─── SVG coordinate system ────────────────────────────────────────────────────

/** ViewBox width — fixed; preserveAspectRatio="none" stretches it to fill display width */
const SVG_W = 1200

/** ViewBox height — same coordinate system on all devices; visual height set via CSS */
const SVG_H = 280

/** Vertical padding so the terrain line never clips at the SVG edges */
const PAD_TOP    = 30
const PAD_BOTTOM = 20

// ─── Colors ───────────────────────────────────────────────────────────────────

/** Palette cycles automatically for any number of chapters PELT detects */
const CHAPTER_PALETTE = [
  '#4ade80', '#f87171', '#a78bfa', '#60a5fa', '#fb923c', '#f472b6', '#34d399', '#facc15',
]

function chapterColor(index) {
  return CHAPTER_PALETTE[index % CHAPTER_PALETTE.length]
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ─── Archetype display data ───────────────────────────────────────────────────

/**
 * Per-archetype data for the bottom panel.
 * One-liners and signals are kept in sync with Prologue.jsx.
 */
const ARCHETYPE_DATA = ARCHETYPE_MAP

/**
 * Per-archetype selection rules for choosing representative marker days.
 * field: which metric defines this archetype most clearly.
 * desc:  true = highest value wins, false = lowest value wins.
 * count: how many dots to show (1 or 2). For count=2, days are split into
 *        two chronological halves so markers are spread across the timeline.
 */
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

/**
 * Maps a day index to an x coordinate within the SVG viewBox.
 * Leaves 10 units of padding on each side so markers at extremes are not clipped.
 *
 * @param {number} index - 0-based position in the validDays array
 * @param {number} total - total number of days with valid HRV
 * @returns {number} x in the range [10, SVG_W - 10]
 */
function getX(index, total) {
  return 10 + (index / (total - 1)) * (SVG_W - 20)
}

/**
 * Maps an HRV value to a y coordinate within the SVG viewBox.
 * High HRV maps to low y (top of chart); low HRV maps to high y (bottom).
 *
 * @param {number} hrv      - raw HRV value in ms
 * @param {number} minHrv   - dataset minimum, with margin applied
 * @param {number} maxHrv   - dataset maximum, with margin applied
 * @returns {number} y in the range [PAD_TOP, SVG_H - PAD_BOTTOM]
 */
function getY(hrv, minHrv, maxHrv) {
  const drawH = SVG_H - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + drawH * (1 - (hrv - minHrv) / (maxHrv - minHrv))
}

/**
 * Builds a smooth SVG path string through an array of {x, y} points.
 * Uses cubic bezier curves with control points at the midpoint x between
 * each pair of neighbors — produces a natural, flowing line.
 *
 * @param {{ x: number, y: number }[]} points
 * @returns {string} SVG path data
 */
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

/**
 * Builds a closed fill region for one chapter's terrain slice.
 * Traces the terrain line, drops to the bottom edge, and closes.
 *
 * @param {{ x: number, y: number }[]} slice - terrain points for this chapter only
 * @returns {string} SVG path data for a closed fill region
 */
function fillPath(slice) {
  if (slice.length === 0) return ''
  const bottom = SVG_H - PAD_BOTTOM
  return (
    smoothPath(slice) +
    ` L ${slice[slice.length - 1].x} ${bottom}` +
    ` L ${slice[0].x} ${bottom} Z`
  )
}

// ─── DayPanel ─────────────────────────────────────────────────────────────────

/**
 * Bottom panel that rises when a marked day is clicked.
 * Rendered via createPortal so position:fixed works independently
 * of any CSS transform on parent elements.
 *
 * @param {{
 *   day:     object | null,  — selected day record, or null when closed
 *   onClose: function,
 *   isMobile: boolean,
 * }} props
 */
function DayPanel({ day, onClose, isMobile }) {
  const arcData = day?.archetype ? ARCHETYPE_DATA[day.archetype] : null

  // Close on Escape key
  useEffect(() => {
    if (!day) return
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [day, onClose])

  const panelColor = arcData?.color ?? 'rgba(255,255,255,0.15)'

  const fullContent = arcData && (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Left / top — archetype video + name */}
      <div style={{
        width:           isMobile ? '100%' : '40%',
        height:          isMobile ? '45%'  : '100%',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         isMobile ? '0.5rem' : '1rem',
        borderRight:     isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderBottom:    isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
        flexShrink: 0,
      }}>
        <video
          src={`/archetypes/${arcData.slug}.mp4`}
          autoPlay muted loop playsInline
          style={{
            height:     isMobile ? '75%' : '80%',
            objectFit: 'contain',
          }}
        />
        <p
          className="font-display"
          style={{
            color:          arcData.color,
            fontSize:       isMobile ? '0.65rem' : 'clamp(0.7rem, 1.2vw, 0.9rem)',
            letterSpacing:  '0.12em',
            textTransform:  'uppercase',
            marginTop:      '0.4rem',
            textAlign:      'center',
          }}
        >
          {day.archetype}
        </p>
      </div>

      {/* Right / bottom — date, one-liner, signals, raw metrics */}
      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        isMobile ? '0.75rem 1rem' : '1.5rem 2rem',
        gap:            '0.55rem',
        overflow:       'hidden',
      }}>
        <p style={{
          fontSize:      '0.7rem',
          color:         'rgba(255,255,255,0.3)',
          letterSpacing: '0.08em',
          fontFamily:    'Inter, sans-serif',
        }}>
          {day.date}
        </p>

        <p
          className="font-display"
          style={{
            fontSize:   isMobile ? '0.85rem' : 'clamp(0.9rem, 1.6vw, 1.1rem)',
            color:      '#fff',
            lineHeight: 1.35,
          }}
        >
          {arcData.oneliner}
        </p>

        {/* Signal arrows — ↑ green / ↓ red */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {arcData.signals.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontSize:   '0.8rem',
                fontWeight: 700,
                color:      s.dir === 'up' ? '#4ade80' : '#f87171',
              }}>
                {s.dir === 'up' ? '↑' : '↓'}
              </span>
              <span style={{
                fontSize:  '0.72rem',
                color:     'rgba(255,255,255,0.5)',
                fontFamily:'Inter, sans-serif',
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* All 5 RPG stats + raw HRV for that day */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 '0.35rem 0.6rem',
          marginTop:           '0.2rem',
          paddingTop:          '0.4rem',
          borderTop:           '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { label: 'HRV',         value: day.hrv != null          ? `${Math.round(day.hrv)}ms`           : '—' },
            { label: 'Recovery',    value: day.recovery_score != null ? `${Math.round(day.recovery_score)}%` : '—' },
            { label: 'Strain',      value: day.strain != null        ? day.strain.toFixed(1)                : '—' },
            { label: 'Deep Sleep',  value: day.sws_pct != null       ? `${Math.round(day.sws_pct)}%`  : '—' },
            { label: 'REM',         value: day.rem_pct != null       ? `${Math.round(day.rem_pct)}%`  : '—' },
            { label: 'Stability',   value: day.stability != null     ? day.stability.toFixed(2)             : '—' },
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
          {/* Invisible backdrop — click to close */}
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Rising panel */}
          <motion.div
            style={{
              position:   'fixed',
              bottom:     0,
              left:       0,
              right:      0,
              height:     isMobile ? '50vh' : '35vh',
              zIndex:     99,
              background: '#0f1628',
              borderTop:  `1px solid ${panelColor}`,
              overflow:   'hidden',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* × close button */}
            <button
              onClick={onClose}
              style={{
                position:   'absolute',
                top:        '0.9rem',
                right:      '1.1rem',
                background: 'none',
                border:     'none',
                color:      'rgba(255,255,255,0.35)',
                fontSize:   '1.2rem',
                lineHeight: 1,
                cursor:     'pointer',
                zIndex:     1,
              }}
            >
              ×
            </button>

            {fullContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Formats an ISO date string as "Nov 15" */
function fmtDate(iso) {
  const [yr, mo, dy] = iso.split('-')
  return new Date(parseInt(yr), parseInt(mo) - 1, parseInt(dy))
    .toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

// ─── ChapterDots ──────────────────────────────────────────────────────────────

/**
 * Three navigation dots — one per chapter — at the bottom of the section.
 * Active dot is larger and fully opaque. Clicking scrolls to center that chapter.
 *
 * @param {{
 *   chapters:       object[],
 *   activeChapter:  number,
 *   chapterRegions: object[],
 *   sectionEl:      HTMLElement | null,
 * }} props
 */
function ChapterDots({ chapters, activeChapter, chapterRegions, sectionEl, chapterColors }) {

  /**
   * Scrolls so the selected chapter's midpoint sits near the viewport center.
   * Maps the chapter's x-proportion in the timeline to a vertical scroll offset
   * within the section (since scroll progress drives chapter tracking).
   */
  const scrollToChapter = chNum => {
    if (!sectionEl || !chapterRegions) return
    const region     = chapterRegions.find(r => r.chapter === chNum)
    if (!region) return
    const proportion = region.midX / SVG_W
    const sectionTop = sectionEl.offsetTop
    const sectionH   = sectionEl.offsetHeight
    window.scrollTo({ top: sectionTop + proportion * sectionH, behavior: 'smooth' })
  }

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '2rem',
      padding:        '1.5rem 0 2rem',
    }}>
      {chapters.map(ch => {
        const color         = chapterColors[ch.chapter] ?? '#ffffff'
        const archetypeName = ch.dominant_archetype ?? ''
        const dateRange     = `${fmtDate(ch.start_date)} – ${fmtDate(ch.end_date)}`
        return (
          <button
            key={ch.chapter}
            onClick={() => scrollToChapter(ch.chapter)}
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '0.3rem',
              padding:       0,
            }}
          >
            <span style={{
              display:      'block',
              width:        36,
              height:       3,
              borderRadius: '2px',
              background:   color,
            }} />
            <span style={{
              fontSize:      '0.62rem',
              letterSpacing: '0.08em',
              color:         color,
              fontFamily:    'Inter, sans-serif',
            }}>
              Chapter {ch.chapter}
            </span>
            {archetypeName && (
              <span style={{
                fontSize:      '0.58rem',
                letterSpacing: '0.04em',
                color:         color,
                fontFamily:    'Inter, sans-serif',
                fontStyle:     'italic',
              }}>
                {archetypeName}
              </span>
            )}
            <span style={{
              fontSize:      '0.55rem',
              letterSpacing: '0.03em',
              color:         `${color}80`,
              fontFamily:    'Inter, sans-serif',
              whiteSpace:    'nowrap',
            }}>
              {dateRange}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── ChapterTimeline ──────────────────────────────────────────────────────────

/**
 * Cinematic full-viewport timeline section.
 *
 * Layout (top → bottom):
 *   • Deep navy background (#0a0e1a) with a subtle chapter-color tint
 *   • Ghosted chapter name — enormous, nearly invisible, crossfades on scroll
 *   • SVG terrain — HRV curve with gradient stroke + glow + chapter fills
 *   • Marker layer — absolutely positioned divs for archetype / peak / crash days
 *   • Chapter dots — scroll-to-chapter navigation
 *   • DayPanel — rises from the bottom of the screen on marker click
 *
 * @param {{
 *   daily:      object[],
 *   chapters:   object[],
 * }} props
 */
export default function ChapterTimeline({ daily, chapters }) {
  const sectionRef = useRef(null)
  const svgWrapRef = useRef(null)

  const [isMobile,      setIsMobile]      = useState(false)
  const [activeChapter, setActiveChapter] = useState(1)
  const [selectedDay,   setSelectedDay]   = useState(null)

  // Detect mobile — drives SVG height and panel layout
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Trigger the terrain draw-on animation when the SVG wrapper enters the viewport
  const isInView = useInView(svgWrapRef, { once: true, margin: '-10%' })

  // Colors keyed by chapter number — archetype color with palette fallback
  const chapterColors = useMemo(() => {
    if (!chapters?.length) return {}
    return Object.fromEntries(
      chapters.map((ch, i) => [
        ch.chapter,
        ARCHETYPE_DATA[ch.dominant_archetype]?.color ?? CHAPTER_PALETTE[i % CHAPTER_PALETTE.length],
      ])
    )
  }, [chapters])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const { points, chapterRegions, markerPts, monthMarkers } = useMemo(() => {
    if (!daily?.length || !chapters?.length) return {}

    const validDays = daily.filter(d => d.hrv != null)
    const hrvValues = validDays.map(d => d.hrv)

    // 8-unit margin so the terrain line has breathing room at the SVG edges
    const minHrv = Math.min(...hrvValues) - 8
    const maxHrv = Math.max(...hrvValues) + 8
    const total  = validDays.length

    const points = validDays.map((day, i) => ({
      ...day,
      x: getX(i, total),
      y: getY(day.hrv, minHrv, maxHrv),
    }))

    // Chapter regions — slice of points plus boundary x coords for gradient + fill
    const chapterRegions = chapters.map(ch => {
      const startIdx = validDays.findIndex(d => d.date >= ch.start_date)
      const endIdx   = validDays.findIndex(d => d.date >  ch.end_date)
      const slice    = points.slice(
        startIdx === -1 ? 0           : startIdx,
        endIdx   === -1 ? points.length : endIdx,
      )
      if (slice.length === 0) return null
      return {
        ...ch,
        slice,
        path:   fillPath(slice),
        startX: slice[0].x,
        endX:   slice[slice.length - 1].x,
        midX:   (slice[0].x + slice[slice.length - 1].x) / 2,
      }
    }).filter(Boolean)

    // Per chapter: pick 3 diverse archetypal days spread across that chapter's date range.
    // Runs for every chapter PELT detects, so no chapter is ever left without markers.
    const markerPts = []
    chapters.forEach(ch => {
      const chPool = points.filter(p =>
        p.date >= ch.start_date &&
        p.date <= ch.end_date &&
        p.archetype &&
        p.stability != null
      )
      if (chPool.length === 0) return

      // Best day per archetype present within this chapter
      const candidates = []
      const seenDates  = new Set()
      Object.entries(ARCHETYPE_PICK).forEach(([arcName, { field, desc }]) => {
        const pool = chPool.filter(p => p.archetype === arcName && p[field] != null)
        if (pool.length === 0) return
        const best = [...pool].sort((a, b) => desc ? b[field] - a[field] : a[field] - b[field])[0]
        if (!seenDates.has(best.date)) {
          candidates.push({ ...best, type: 'archetype' })
          seenDates.add(best.date)
        }
      })

      if (candidates.length === 0) return

      // Sort by date and keep 3 spread across the chapter
      candidates.sort((a, b) => a.date.localeCompare(b.date))
      if (candidates.length <= 3) {
        candidates.forEach(p => markerPts.push(p))
      } else {
        markerPts.push(candidates[0])
        markerPts.push(candidates[Math.floor(candidates.length / 2)])
        markerPts.push(candidates[candidates.length - 1])
      }
    })

    // Month labels for the x-axis — one marker per calendar month in the dataset
    const seenMonths  = new Set()
    const monthMarkers = []
    validDays.forEach((day, i) => {
      const monthKey = day.date.slice(0, 7) // e.g. "2025-11"
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey)
        const [yr, mo] = monthKey.split('-')
        const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
          .toLocaleString('en-US', { month: 'short' })
        monthMarkers.push({ label, x: getX(i, total) })
      }
    })

    return { points, chapterRegions, markerPts, monthMarkers }
  }, [daily, chapters])

  // ── Terrain path ──────────────────────────────────────────────────────────────
  const terrainPath = useMemo(() => (points ? smoothPath(points) : ''), [points])

  // ── Gradient stops for the terrain stroke ────────────────────────────────────
  const gradientStops = useMemo(() => {
    if (!chapterRegions || chapterRegions.length < 2) return null
    const T = 40
    const stops = []
    stops.push({ offset: 0, color: chapterColors[chapterRegions[0].chapter] })
    for (let i = 0; i < chapterRegions.length - 1; i++) {
      const boundary = chapterRegions[i].endX
      stops.push({ offset: (boundary - T) / SVG_W, color: chapterColors[chapterRegions[i].chapter] })
      stops.push({ offset: (boundary + T) / SVG_W, color: chapterColors[chapterRegions[i + 1].chapter] })
    }
    stops.push({ offset: 1, color: chapterColors[chapterRegions[chapterRegions.length - 1].chapter] })
    return stops
  }, [chapterRegions, chapterColors])

  // ── Scroll-driven chapter tracking ───────────────────────────────────────────
  // Maps vertical scroll progress through the section to which chapter is "active".
  // Progress 0→1 runs from section entering to section exiting the viewport.
  const { scrollYProgress } = useScroll({
    target:  sectionRef,
    offset:  ['start end', 'end start'],
  })

  useMotionValueEvent(scrollYProgress, 'change', progress => {
    if (!chapterRegions?.length) return
    const active = chapterRegions.find(r => progress < r.endX / SVG_W) ?? chapterRegions[chapterRegions.length - 1]
    setActiveChapter(active.chapter)
  })

  if (!points?.length) return null

  // Visual SVG height — viewBox stays at SVG_H, CSS height drives the visual size
  const svgVisualH = isMobile ? 180 : 280

  return (
    <section
      ref={sectionRef}
      style={{
        position:       'relative',
        minHeight:      '100vh',
        background:     'var(--parchment)',
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
      }}
    >
      {/* ── Section title + hint ── */}
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 2rem', position: 'relative', zIndex: 1 }}>
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
            marginBottom:  '0.5rem',
          }}
        >
          My data
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          style={{
            fontSize:      '0.8rem',
            color:         'var(--text-muted)',
            letterSpacing: '0.04em',
            fontFamily:    'Inter, sans-serif',
          }}
        >
          Click any glowing point to explore that day.
        </motion.p>
      </div>

      {/* ── Chapter color tint — fades between chapter colors at 5% opacity ── */}
      <motion.div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        animate={{ backgroundColor: hexToRgba(chapterColors[activeChapter] ?? '#ffffff', 0.05) }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* ── SVG terrain + marker layer ── */}
      <div ref={svgWrapRef} style={{ position: 'relative', width: '100%' }}>

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: `${svgVisualH}px` }}
        >
          <defs>
            {/* Horizontal gradient — color transitions smoothly at chapter boundaries */}
            {gradientStops && (
              <linearGradient
                id="ctTerrainGrad"
                gradientUnits="userSpaceOnUse"
                x1="0" y1="0" x2={SVG_W} y2="0"
              >
                {gradientStops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
            )}

            {/* Vertical fill gradients — one per chapter, chapter color fading to transparent */}
            {chapters?.map(ch => (
              <linearGradient
                key={`ctFillGrad${ch.chapter}`}
                id={`ctFillGrad${ch.chapter}`}
                gradientUnits="userSpaceOnUse"
                x1="0" y1={PAD_TOP}
                x2="0" y2={SVG_H - PAD_BOTTOM}
              >
                <stop offset="0" stopColor={chapterColors[ch.chapter]} stopOpacity="0.25" />
                <stop offset="1" stopColor={chapterColors[ch.chapter]} stopOpacity="0"    />
              </linearGradient>
            ))}

            {/* Blur filter for the glow layer — soft blur only (no merge with source) */}
            <filter id="ctGlowBlur" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Chapter fills — atmospheric gradient regions beneath the terrain line.
              Each fades in as the terrain draw-on animation crosses its start position. */}
          {chapterRegions?.map(region => {
            // Delay proportional to how far along the terrain line this chapter starts
            const delay = (region.startX / SVG_W) * 2.5
            return (
              <motion.path
                key={`fill-${region.chapter}`}
                d={region.path}
                fill={`url(#ctFillGrad${region.chapter})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 1 : 0 }}
                transition={{ duration: 0.8, delay }}
              />
            )
          })}

          {/* Glow layer — subtle blurred halo, reduced intensity */}
          <motion.path
            d={terrainPath}
            stroke="url(#ctTerrainGrad)"
            strokeWidth="5"
            fill="none"
            filter="url(#ctGlowBlur)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView
              ? { pathLength: 1, opacity: [0.15, 0.3, 0.15] }
              : { pathLength: 0, opacity: 0 }}
            transition={{
              pathLength: { duration: 2.5, ease: 'easeInOut' },
              opacity:    { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2.5 },
            }}
          />

          {/* Crisp terrain line — drawn left to right on section entry */}
          <motion.path
            d={terrainPath}
            stroke="url(#ctTerrainGrad)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isInView ? 1 : 0 }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </svg>

        {/* ── Marker layer — absolutely positioned for pixel-perfect circles
               (avoids the oval distortion that preserveAspectRatio="none" causes
               when SVG circles are stretched at mobile widths). ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

          {/* Archetype markers — white dot + colored pulsing ring, one or two per archetype */}
          {markerPts?.map(p => {
            const arcData = ARCHETYPE_DATA[p.archetype]
            if (!arcData) return null
            const dotR  = isMobile ? 5 : 10
            const ringD = dotR * 3
            return (
              <div
                key={`marker-${p.date}`}
                style={{
                  position:      'absolute',
                  left:          `${(p.x / SVG_W) * 100}%`,
                  top:           `${(p.y / SVG_H) * svgVisualH}px`,
                  transform:     'translate(-50%, -50%)',
                  width:         ringD,
                  height:        ringD,
                  cursor:        'pointer',
                  pointerEvents: 'all',
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                }}
                onClick={() => setSelectedDay(p)}
              >
                <motion.div
                  style={{
                    position:     'absolute',
                    width:        ringD,
                    height:       ringD,
                    borderRadius: '50%',
                    border:       `2px solid ${arcData.color}`,
                    pointerEvents:'none',
                  }}
                  animate={{ scale: [1, 1.4], opacity: [0.9, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                />
                <div style={{
                  width:        dotR * 2,
                  height:       dotR * 2,
                  borderRadius: '50%',
                  background:   '#ffffff',
                  boxShadow:    `0 0 6px ${arcData.color}`,
                  pointerEvents:'none',
                }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Month axis ── */}
      <div style={{ position: 'relative', width: '100%', height: '22px' }}>
        {monthMarkers?.map(m => (
          <span
            key={m.label}
            style={{
              position:      'absolute',
              left:          `${(m.x / SVG_W) * 100}%`,
              transform:     'translateX(-50%)',
              top:           '4px',
              fontSize:      '0.58rem',
              color:         'rgba(255,255,255,0.28)',
              fontFamily:    'Inter, sans-serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace:    'nowrap',
              userSelect:    'none',
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* ── Chapter navigation dots ── */}
      {chapters && chapterRegions && (
        <ChapterDots
          chapters={chapters}
          activeChapter={activeChapter}
          chapterRegions={chapterRegions}
          sectionEl={sectionRef.current}
          chapterColors={chapterColors}
        />
      )}

      {/* ── Day detail panel — portaled to body ── */}
      <DayPanel
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        isMobile={isMobile}
      />
    </section>
  )
}
