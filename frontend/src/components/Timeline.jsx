import { useState, useMemo } from 'react'

const WIDTH = 1200
const HEIGHT = 280
const PADDING = { top: 30, bottom: 20, left: 0, right: 0 }

const CHAPTER_COLORS = {
  1: { fill: 'rgba(99, 102, 241, 0.15)' },
  2: { fill: 'rgba(239, 68, 68, 0.15)' },
  3: { fill: 'rgba(16, 185, 129, 0.15)' },
}

const DEPTH_COLORS = {
  1: 'rgba(99,102,241,0.1)',
  2: 'rgba(239,68,68,0.1)',
  3: 'rgba(16,185,129,0.1)',
}

const LINE_COLORS = {
  1: 'rgba(99,102,241,0.7)',
  2: 'rgba(239,68,68,0.7)',
  3: 'rgba(16,185,129,0.7)',
}

const getY = (hrv, minHrv, maxHrv) => {
  const drawHeight = HEIGHT - PADDING.top - PADDING.bottom
  const normalized = (hrv - minHrv) / (maxHrv - minHrv)
  return PADDING.top + drawHeight * (1 - normalized)
}

const getX = (index, totalDays) => {
  const drawWidth = WIDTH - 20
  return 10 + (index / (totalDays - 1)) * drawWidth
}

const smoothPath = (points) => {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

export default function Timeline({ daily, chapters, legendary, bossFights }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const { points, chapterRegions, legendaryPts, bossPts } = useMemo(() => {
    if (!daily || daily.length === 0) return {}

    const validDays = daily.filter(d => d.hrv != null)
    const hrvValues = validDays.map(d => d.hrv)
    const minHrv = Math.min(...hrvValues) - 8
    const maxHrv = Math.max(...hrvValues) + 8
    const totalDays = validDays.length

    const points = validDays.map((day, i) => ({
      ...day,
      x: getX(i, totalDays),
      y: getY(day.hrv, minHrv, maxHrv),
    }))

    const chapterRegions = chapters?.map(chapter => {
      const startIdx = validDays.findIndex(d => d.date >= chapter.start_date)
      const endIdx = validDays.findIndex(d => d.date > chapter.end_date)
      const slice = points.slice(
        startIdx === -1 ? 0 : startIdx,
        endIdx === -1 ? points.length : endIdx
      )
      if (slice.length === 0) return null

      const regionLine = smoothPath(slice)
      const regionFill = regionLine +
        ` L ${slice[slice.length - 1].x} ${HEIGHT - PADDING.bottom}` +
        ` L ${slice[0].x} ${HEIGHT - PADDING.bottom} Z`

      return {
        ...chapter,
        path: regionFill,
        slice,
        startX: slice[0].x,
        endX: slice[slice.length - 1].x,
        midX: (slice[0].x + slice[slice.length - 1].x) / 2,
      }
    }).filter(Boolean)

    const legendaryPts = legendary?.slice(0, 5).map(l => {
      const match = points.find(p => p.date === l.date)
      return match ? { ...l, x: match.x, y: match.y } : null
    }).filter(Boolean)

    const bossPts = bossFights?.slice(0, 5).map(b => {
      const match = points.find(p => p.date === b.date)
      return match ? { ...b, x: match.x, y: match.y } : null
    }).filter(Boolean)

    return { points, chapterRegions, legendaryPts, bossPts }
  }, [daily, chapters, legendary, bossFights])

  const handleMouseMove = (e, day) => {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setHoveredDay(day)
  }

  if (!daily || daily.length === 0) return null

  return (
    <div className="relative w-full">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ background: 'var(--parchment-dark)', border: '1px solid var(--border)' }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          style={{ display: 'block' }}
          onMouseLeave={() => setHoveredDay(null)}
        >
          {/* depth layer — offset for 3D effect */}
          {chapterRegions?.map(region => (
            <g key={`depth-${region.chapter}`} transform="translate(0, 10)" opacity="0.5">
              <path d={region.path} fill={DEPTH_COLORS[region.chapter]} stroke="none" />
            </g>
          ))}

          {/* chapter fills */}
          {chapterRegions?.map(region => (
            <path
              key={`fill-${region.chapter}`}
              d={region.path}
              fill={CHAPTER_COLORS[region.chapter]?.fill}
              stroke="none"
            />
          ))}

          {/* chapter colored lines */}
          {chapterRegions?.map(region => (
            <path
              key={`line-${region.chapter}`}
              d={smoothPath(region.slice)}
              fill="none"
              stroke={LINE_COLORS[region.chapter]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* chapter boundary lines */}
          {chapterRegions?.map((region, i) =>
            i < chapterRegions.length - 1 ? (
              <line
                key={`boundary-${region.chapter}`}
                x1={region.endX} y1={PADDING.top}
                x2={region.endX} y2={HEIGHT - PADDING.bottom}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
            ) : null
          )}

          {/* chapter labels */}
          {chapterRegions?.map(region => (
            <text
              key={`label-${region.chapter}`}
              x={region.midX}
              y={HEIGHT - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-muted)"
              fontFamily="Cinzel, serif"
              letterSpacing="2"
            >
              {region.name?.toUpperCase()}
            </text>
          ))}

          {/* legendary markers */}
          {legendaryPts?.map(p => (
            <g key={`legendary-${p.date}`}>
              <circle cx={p.x} cy={p.y} r={8} fill="#f59e0b" opacity={0.2} />
              <circle cx={p.x} cy={p.y} r={4} fill="#f59e0b" opacity={0.9} />
            </g>
          ))}

          {/* boss fight markers */}
          {bossPts?.map(p => (
            <g key={`boss-${p.date}`}>
              <circle cx={p.x} cy={p.y} r={8} fill="#ef4444" opacity={0.2} />
              <circle cx={p.x} cy={p.y} r={4} fill="#ef4444" opacity={0.9} />
            </g>
          ))}

          {/* hover line */}
          {hoveredDay && (
            <line
              x1={hoveredDay.x} y1={PADDING.top}
              x2={hoveredDay.x} y2={HEIGHT - PADDING.bottom}
              stroke="var(--charcoal)"
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity={0.3}
            />
          )}

          {/* hover dot */}
          {hoveredDay && (
            <circle
              cx={hoveredDay.x}
              cy={hoveredDay.y}
              r={5}
              fill="var(--charcoal)"
              opacity={0.8}
            />
          )}

          {/* invisible hover targets */}
          {points?.map((p, i) => (
            <rect
              key={i}
              x={p.x - 3}
              y={0}
              width={6}
              height={HEIGHT}
              fill="transparent"
              onMouseMove={(e) => handleMouseMove(e, p)}
              style={{ cursor: 'crosshair' }}
            />
          ))}
        </svg>

        {/* tooltip */}
        {hoveredDay && (
          <div
            className="absolute pointer-events-none z-10 rounded-xl text-sm"
            style={{
              left: Math.min(tooltipPos.x + 16, 700),
              top: Math.max(tooltipPos.y - 80, 8),
              background: 'var(--charcoal)',
              color: 'var(--parchment)',
              padding: '10px 14px',
              minWidth: '160px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <p className="font-display text-xs tracking-widest mb-2 opacity-60">
              {hoveredDay.date}
            </p>
            <p className="font-semibold">HRV {Math.round(hoveredDay.hrv)}ms</p>
            <p>Recovery {hoveredDay.recovery_score}%</p>
            {hoveredDay.sws_pct != null &&
              <p>SWS {hoveredDay.sws_pct.toFixed(1)}%</p>}
            {hoveredDay.rem_pct != null &&
              <p>REM {hoveredDay.rem_pct.toFixed(1)}%</p>}
          </div>
        )}
      </div>

      {/* legend */}
      <div className="flex gap-8 mt-4 justify-center">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          Legendary day
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          Boss fight
        </div>
      </div>
    </div>
  )
}
