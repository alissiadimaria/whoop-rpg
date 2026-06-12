import { useState } from 'react'
import { motion } from 'framer-motion'
import { ARCHETYPES } from '../archetypes'

// ─── Part 2 sub-component ─────────────────────────────────────────────────────

/**
 * 3D flip card for a single archetype.
 *
 * Front face: looping video + name overlay + pulsing border.
 * Back face:  static image at 0.15 opacity as bg + name + oneliner +
 *             strengths pills + weaknesses pills + sustainability line.
 *             Empty strengths or weaknesses arrays render nothing.
 *
 * CSS 3D flip:
 *   - perspective on the outer container creates the 3D space
 *   - transform-style: preserve-3d on the inner wrapper propagates it to children
 *   - backface-visibility: hidden on each face hides the reverse side
 *   - back face starts at rotateY(180deg) so it's face-down initially
 *   - flipping the inner wrapper to rotateY(180deg) reveals the back face
 *
 * @param {{
 *   archetype: Object,
 *   isFlipped: boolean,
 *   isDimmed:  boolean,
 *   onFlip:    function,
 * }} props
 */
function FlipCard({ archetype, isFlipped, isDimmed, onFlip }) {
  const { name, color, oneliner, signals, vid, img } = archetype

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        cursor: 'pointer',
        perspective: '1000px',
        opacity: isDimmed ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
      }}
      onClick={onFlip}
    >
      {/* ── Flip inner wrapper — the element that actually rotates ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >

        {/* ── Front face ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '1rem',
            overflow: 'hidden',
          }}
        >
          {/* Static character image */}
          <img
            src={img}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Bottom gradient so name text is readable over the video */}
          <div
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              padding: '2.5rem 1rem 0.85rem',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            }}
          >
            <p
              className="font-display"
              style={{
                color,
                fontSize: 'clamp(0.65rem, 1vw, 0.8rem)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textAlign: 'center',
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              }}
            >
              {name}
            </p>
          </div>

          {/* Pulsing border overlay — opacity animates independently of the card */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '1rem',
              border: `2px solid ${color}`,
              pointerEvents: 'none',
            }}
            animate={{ opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ── Back face — starts rotated 180deg so it's hidden by default ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '1rem',
            overflow: 'hidden',
            border: `1px solid ${color}40`,
            background: 'var(--parchment-dark)',
          }}
        >
          {/* Atmospheric background image at low opacity */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              opacity: 0.15,
            }}
          />

          {/* Content layer sits above the background image */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '1.4rem 1.2rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            {/* Archetype name */}
            <p
              className="font-display"
              style={{
                color,
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {name}
            </p>

            {/* One liner */}
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontStyle: 'italic',
                lineHeight: 1.55,
              }}
            >
              {oneliner}
            </p>

            {/* Divider */}
            <div style={{ width: '2rem', height: '1px', background: `${color}40` }} />

            {/* Signal badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {signals.map(s => {
                const isUp  = s.dir === 'up'
                const clr   = isUp ? '#16a34a' : '#dc2626'
                const bg    = isUp ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'
                const bdr   = isUp ? 'rgba(22,163,74,0.28)' : 'rgba(220,38,38,0.28)'
                return (
                  <div
                    key={s.label}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '0.3rem',
                      background:   bg,
                      border:       `1px solid ${bdr}`,
                      borderRadius: '2rem',
                      padding:      '0.38rem 0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1, color: clr }}>
                      {isUp ? '↑' : '↓'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @returns {JSX.Element}
 */
export default function Prologue() {
  /** Name of the currently flipped archetype card, or null if none flipped. */
  const [flippedCard, setFlippedCard] = useState(null)

  /**
   * Toggle the flipped card. Clicking the already-flipped card collapses it.
   * @param {string} name - archetype name
   */
  const handleFlip = name => setFlippedCard(prev => prev === name ? null : name)

  return (
    <section style={{ background: 'var(--parchment)' }}>

      {/* ── Part 2: Meet the Players ────────────────────────────────────── */}
      <div style={{ padding: '4rem 1.5rem 8rem', maxWidth: '72rem', margin: '0 auto' }}>

        <motion.h2
          className="font-display"
          style={{
            textAlign: 'center',
            fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
            color: 'var(--charcoal)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            marginBottom: '4rem',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-80px' }}
        >
          Meet the players
        </motion.h2>

        {/* 4×2 flip card grid */}
        <div className="prologue-players-grid">
          {ARCHETYPES.map(archetype => (
            <FlipCard
              key={archetype.name}
              archetype={archetype}
              isFlipped={flippedCard === archetype.name}
              isDimmed={flippedCard !== null && flippedCard !== archetype.name}
              onFlip={() => handleFlip(archetype.name)}
            />
          ))}
        </div>

        {/* Hint — fades in below the grid */}
        <motion.p
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: '2rem',
            letterSpacing: '0.04em',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          Click any card to flip it.
        </motion.p>
      </div>

      {/* ── Part 3 added after Part 2 is confirmed ── */}

    </section>
  )
}
