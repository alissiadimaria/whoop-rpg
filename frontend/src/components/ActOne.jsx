import { motion } from 'framer-motion'

/**
 * Act 1 — The Hook.
 *
 * Full-viewport opening. One headline, one subtitle, scroll prompt.
 * Fires on mount (not scroll) — this is the first thing the visitor sees.
 *
 * Timing:
 *   Headline   → delay 0.4s
 *   Subtitle   → delay 1.2s
 *   Scroll CTA → delay 2.0s
 */

function fadeUp(delay) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay },
  }
}

export default function ActOne() {
  return (
    <section
      style={{
        minHeight: '100vh',
        background: 'var(--parchment)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', alignItems: 'center' }}>

        {/* Main question — Fraunces, large, near-black */}
        <motion.h1
          className="font-display"
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
            color: 'var(--charcoal)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            maxWidth: '16ch',
          }}
          {...fadeUp(0.4)}
        >
          Can your data tell a story?
        </motion.h1>

        {/* Subtitle — Inter, muted, attribution */}
        <motion.p
          style={{
            fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 400,
          }}
          {...fadeUp(1.2)}
        >
          A data biography · Alissia Di Maria
        </motion.p>

      </div>

      {/* Scroll prompt */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--text-muted)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.0 }}
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}
