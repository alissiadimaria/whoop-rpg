import { motion } from 'framer-motion'

export default function ActOne() {
  return (
    <section
      style={{
        minHeight:      '100vh',
        background:     'radial-gradient(ellipse 90% 80% at 50% 50%, #22222a 0%, #07080f 55%, #000 100%)',
        position:       'relative',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '0 2rem',
        textAlign:      'center',
        overflow:       'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.8rem' }}>

        {/* Two-line headline — each line slides up independently */}
        <h1
          className="font-display"
          style={{
            fontSize:      'clamp(3rem, 9.5vw, 10rem)',
            fontWeight:    800,
            color:         '#ffffff',
            letterSpacing: '-0.025em',
            lineHeight:    1.0,
            margin:        0,
          }}
        >
          <motion.span
            style={{ display: 'block' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Can your data
          </motion.span>
          <motion.span
            style={{ display: 'block' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          >
            tell a story?
          </motion.span>
        </h1>

        {/* Subtitle — Inter 300, tiny, wide tracking */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.3 }}
          style={{
            fontFamily:    'Inter, sans-serif',
            fontWeight:    300,
            fontSize:      'clamp(0.6rem, 1vw, 0.78rem)',
            color:         'rgba(255,255,255,0.28)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          A data biography &middot; Alissia Di Maria
        </motion.p>

      </div>

      {/* Scroll indicator — animated descending line */}
      <motion.div
        style={{
          position:      'absolute',
          bottom:        '2.5rem',
          left:          '50%',
          transform:     'translateX(-50%)',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.5rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
      >
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontWeight:    300,
          fontSize:      '0.48rem',
          letterSpacing: '0.28em',
          color:         'rgba(255,255,255,0.18)',
          textTransform: 'uppercase',
        }}>
          scroll
        </span>
        <motion.div
          style={{
            width:           1,
            height:          44,
            background:      'rgba(255,255,255,0.22)',
            transformOrigin: 'top',
          }}
          animate={{ scaleY: [0, 1, 1, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, repeatDelay: 0.5, ease: [0.4, 0, 0.6, 1] }}
        />
      </motion.div>
    </section>
  )
}
