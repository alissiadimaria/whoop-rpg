import { useState, useEffect } from 'react'
import {
  motion, AnimatePresence,
  useScroll, useVelocity, useAnimationFrame, useMotionValue,
} from 'framer-motion'
import { createPortal } from 'react-dom'
import { ARCHETYPES } from '../archetypes'

// ─── ArchetypeCardOverlay ─────────────────────────────────────────────────────

function ArchetypeCardOverlay({ archetype, onClose, isMobile }) {
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    if (!archetype) { setIsFlipped(false); return }
    setIsFlipped(false)
    const t = setTimeout(() => setIsFlipped(true), 350)
    return () => clearTimeout(t)
  }, [archetype])

  useEffect(() => {
    if (!archetype) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [archetype, onClose])

  const CARD_W = isMobile ? 220 : 300
  const CARD_H = Math.round(CARD_W * 1.6)

  return createPortal(
    <AnimatePresence>
      {archetype && (
        <>
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.72)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <button
            onClick={onClose}
            style={{
              position: 'fixed', top: '1.2rem', right: '1.4rem', zIndex: 100,
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontSize: '1.4rem',
              lineHeight: 1, cursor: 'pointer',
            }}
          >
            ×
          </button>

          <div
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 99,
              width: CARD_W, height: CARD_H,
              perspective: '1000px',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              style={{
                width: '100%', height: '100%',
                transformStyle: 'preserve-3d', position: 'relative',
              }}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1, rotateY: isFlipped ? 180 : 0 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{
                opacity:  { duration: 0.3 },
                scale:    { duration: 0.3, ease: 'easeOut' },
                rotateY:  { duration: 0.65, ease: 'easeInOut' },
              }}
            >
              {/* Front */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                borderRadius: '1rem', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
                <img src={archetype.img} alt={archetype.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 55%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '3.5rem 1.1rem 1rem',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
                }}>
                  <p className="font-display" style={{
                    color: archetype.color, fontSize: '0.78rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    textAlign: 'center', textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                  }}>
                    {archetype.name}
                  </p>
                </div>
                <motion.div style={{
                  position: 'absolute', inset: 0, borderRadius: '1rem',
                  border: `2px solid ${archetype.color}`, pointerEvents: 'none',
                }}
                  animate={{ opacity: [0.3, 0.85, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Back */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: '1rem', overflow: 'hidden',
                border: `1px solid ${archetype.color}40`,
                background: 'var(--parchment-dark)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${archetype.img})`,
                  backgroundSize: 'cover', backgroundPosition: 'center top',
                  opacity: 0.12,
                }} />
                <div style={{
                  position: 'relative', zIndex: 1,
                  padding: '1.2rem 1rem', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '0.65rem', textAlign: 'center',
                }}>
                  <p className="font-display" style={{
                    color: archetype.color, fontSize: '0.75rem',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    {archetype.name}
                  </p>
                  <p style={{
                    color: 'var(--text-secondary)', fontSize: '0.85rem',
                    fontStyle: 'italic', lineHeight: 1.55,
                  }}>
                    {archetype.oneliner}
                  </p>
                  <div style={{ width: '2rem', height: '1px', background: `${archetype.color}40` }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'center' }}>
                    {archetype.signals.map(s => {
                      const isUp = s.dir === 'up'
                      const clr  = isUp ? '#16a34a' : '#dc2626'
                      const bg   = isUp ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'
                      const bdr  = isUp ? 'rgba(22,163,74,0.28)' : 'rgba(220,38,38,0.28)'
                      return (
                        <div key={s.label} style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: bg, border: `1px solid ${bdr}`,
                          borderRadius: '2rem', padding: '0.35rem 0.7rem',
                        }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: clr }}>{isUp ? '↑' : '↓'}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── CircularGallery ──────────────────────────────────────────────────────────

const N          = ARCHETYPES.length
const BASE_SPEED = 0.007  // very slow drift — one full rotation ≈ 51 seconds

function CircularGallery({ onSelect, isMobile }) {
  const rotation       = useMotionValue(0)
  const { scrollY }    = useScroll()
  const scrollVelocity = useVelocity(scrollY)

  useAnimationFrame((_, delta) => {
    const boost = scrollVelocity.get() * 0.00018
    rotation.set(rotation.get() - delta * BASE_SPEED - boost)
  })

  const CARD_W   = isMobile ? 130 : 185
  const CARD_H   = Math.round(CARD_W * 1.65)
  const RADIUS   = isMobile ? 250 : 330
  const PERSP    = isMobile ? 620 : 860

  return (
    <div style={{
      height:         '100vh',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--parchment)',
      overflowX:      'hidden',
      padding:        '2rem 0',
    }}>
      {/* Title */}
      <motion.h2
        className="font-display"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        viewport={{ once: true }}
        style={{
          fontSize:      'clamp(1.8rem, 3.5vw, 2.8rem)',
          color:         'rgba(255,255,255,0.92)',
          letterSpacing: '-0.01em',
          fontWeight:    600,
          marginBottom:  '0.5rem',
          textAlign:     'center',
        }}
      >
        Meet the players
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
        style={{
          fontSize:     '0.8rem',
          color:        'rgba(255,255,255,0.35)',
          letterSpacing:'0.05em',
          fontFamily:   'Inter, sans-serif',
          marginBottom: isMobile ? '1.5rem' : '2.5rem',
        }}
      >
        Click any character to learn more
      </motion.p>

      {/* 3D scene */}
      <div style={{ perspective: `${PERSP}px`, perspectiveOrigin: '50% 50%', width: '100%' }}>
        <motion.div
          style={{
            rotateY:        rotation,
            transformStyle: 'preserve-3d',
            width:          CARD_W,
            height:         CARD_H,
            margin:         '0 auto',
            position:       'relative',
          }}
        >
          {ARCHETYPES.map((archetype, i) => {
            const angle = (i / N) * 360
            return (
              // No backfaceVisibility on outer wrapper — ghost stays visible on all sides
              <div
                key={archetype.name}
                style={{
                  position:  'absolute',
                  inset:     0,
                  transform: `rotateY(${angle}deg) translateZ(${RADIUS}px)`,
                }}
              >
                {/* Ghost — always visible, gives translucent depth on back half */}
                <div style={{
                  position:     'absolute', inset: 0,
                  borderRadius: '1rem',
                  background:   'rgba(14, 16, 26, 0.5)',
                  border:       '1px solid rgba(255,255,255,0.06)',
                }} />

                {/* Card image — backfaceVisibility:hidden hides it on the back half */}
                <div
                  onClick={() => onSelect(archetype)}
                  style={{
                    position:                 'absolute',
                    inset:                    0,
                    backfaceVisibility:       'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    cursor:       'pointer',
                    borderRadius: '1rem',
                    overflow:     'hidden',
                    border:       '1px solid rgba(255,255,255,0.16)',
                    boxShadow:    '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <img
                    src={archetype.img}
                    alt={archetype.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  {/* Glass sheen */}
                  <div style={{
                    position:      'absolute', inset: 0,
                    background:    'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Name overlay */}
                  <div style={{
                    position:   'absolute', bottom: 0, left: 0, right: 0,
                    padding:    '3.5rem 0.8rem 0.8rem',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                  }}>
                    <p className="font-display" style={{
                      color:         archetype.color,
                      fontSize:      isMobile ? '0.55rem' : '0.65rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textAlign:     'center',
                      textShadow:    '0 1px 8px rgba(0,0,0,0.8)',
                    }}>
                      {archetype.name}
                    </p>
                  </div>

                  {/* Pulsing border */}
                  <motion.div
                    style={{
                      position:     'absolute', inset: 0,
                      borderRadius: '1rem',
                      border:       `2px solid ${archetype.color}`,
                      pointerEvents:'none',
                    }}
                    animate={{ opacity: [0.15, 0.6, 0.15] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
                  />
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

    </div>
  )
}

// ─── Prologue ─────────────────────────────────────────────────────────────────

export default function Prologue() {
  const [selected, setSelected] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <section>
      <CircularGallery onSelect={setSelected} isMobile={isMobile} />
      <ArchetypeCardOverlay
        archetype={selected}
        onClose={() => setSelected(null)}
        isMobile={isMobile}
      />
    </section>
  )
}
