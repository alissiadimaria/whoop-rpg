import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ARCHETYPE_MAP } from '../archetypes'

const ARCHETYPE_NAMES = Object.keys(ARCHETYPE_MAP)

function detectArchetype(text) {
  return ARCHETYPE_NAMES.find(name => text.includes(name)) ?? null
}

// ─── Letter assembly ──────────────────────────────────────────────────────────

function AssemblingName({ name, color }) {
  const letters = name.split('')
  return (
    <motion.div
      style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
    >
      {letters.map((l, i) => (
        <motion.span
          key={i}
          variants={{
            hidden:   { opacity: 0, y: 12 },
            visible:  { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.4 } },
          }}
          style={{
            fontFamily:   'Fraunces, serif',
            fontSize:     'clamp(2.8rem, 7vw, 5.5rem)',
            color,
            letterSpacing: l === ' ' ? '0.3em' : '0.02em',
            lineHeight:   1,
            whiteSpace:   l === ' ' ? 'pre' : 'normal',
          }}
        >
          {l}
        </motion.span>
      ))}
    </motion.div>
  )
}

// ─── Share card (canvas-based) ────────────────────────────────────────────────

async function buildShareCard(archetype) {
  await document.fonts.ready

  const canvas  = document.createElement('canvas')
  canvas.width  = 900
  canvas.height = 900
  const ctx     = canvas.getContext('2d')

  ctx.fillStyle = '#0a0e1a'
  ctx.fillRect(0, 0, 900, 900)

  await new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `/archetypes/${archetype.slug}.jpg`
    img.onload = () => {
      const size = 380
      const x    = (900 - size) / 2
      const y    = 100
      ctx.drawImage(img, x, y, size, size)
      resolve()
    }
    img.onerror = resolve
  })

  ctx.fillStyle    = archetype.color
  ctx.font         = '600 52px Fraunces, Georgia, serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(archetype.name, 450, 570)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font      = '300 22px Inter, sans-serif'
  ctx.fillText(archetype.oneliner, 450, 630)

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(300, 690)
  ctx.lineTo(600, 690)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font      = '300 16px Inter, sans-serif'
  ctx.fillText('WHOOP RPG', 450, 730)

  return canvas.toDataURL('image/png')
}

async function shareCard(archetype) {
  const dataUrl = await buildShareCard(archetype)

  // Native share sheet on mobile (iOS/Android)
  if (navigator.share) {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `whoop-rpg-${archetype.slug}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `I am ${archetype.name}` })
        return
      }
    } catch {}
  }

  // Fallback: download (desktop)
  const link    = document.createElement('a')
  link.download = `whoop-rpg-${archetype.slug}.png`
  link.href     = dataUrl
  link.click()
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActFive() {
  const [phase,     setPhase]     = useState('intro')   // intro | loading | revealed
  const [input,     setInput]     = useState('')
  const [response,  setResponse]  = useState('')
  const [archetype, setArchetype] = useState(null)      // ARCHETYPE_MAP entry
  const [messages,  setMessages]  = useState([])

  const sectionRef  = useRef(null)
  const textareaRef = useRef(null)
  const isInView    = useInView(sectionRef, { once: true, margin: '-15%' })

  // Auto-resize textarea
  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  async function submit() {
    const text = input.trim()
    if (!text || phase !== 'intro') return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setPhase('loading')
    setResponse('')
    setArchetype(null)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/archetype-chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: nextMessages }),
      })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let fullText  = ''
      let detected  = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const chunk = JSON.parse(payload)
            fullText += chunk
            setResponse(fullText)

            if (!detected) {
              detected = detectArchetype(fullText)
              if (detected) setArchetype(ARCHETYPE_MAP[detected])
            }
          } catch {}
        }
      }

      // Brief pause so the assembly animation has a moment to settle
      await new Promise(r => setTimeout(r, 600))
      setPhase('revealed')
    } catch {
      setPhase('intro')
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const archetypeColor = archetype?.color ?? '#a78bfa'

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight:      '100vh',
        background:     'var(--parchment)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '6rem 1.5rem',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Background color bleed during loading/revealed */}
      <AnimatePresence>
        {(phase === 'loading' || phase === 'revealed') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
            style={{
              position:   'absolute',
              inset:      0,
              background: `radial-gradient(ellipse at center, ${archetypeColor}18 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── INTRO PHASE ── */}
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '1.5rem',
              width:         '100%',
              maxWidth:      '36rem',
              textAlign:     'center',
            }}
          >
            {/* "That's my story." */}
            <motion.p
              className="font-display"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{
                fontSize:      'clamp(2rem, 5vw, 3.2rem)',
                color:         'var(--charcoal)',
                letterSpacing: '-0.01em',
                lineHeight:    1.2,
              }}
            >
              That's my story
            </motion.p>

            {/* "What is yours?" — delayed */}
            <motion.p
              className="font-display"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 1.4 }}
              style={{
                fontSize:      'clamp(2rem, 5vw, 3.2rem)',
                color:         'var(--charcoal)',
                letterSpacing: '-0.01em',
                lineHeight:    1.2,
              }}
            >
              Who are you today?
            </motion.p>

            {/* Input area — fades in after both lines */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 2.6 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <p style={{
                fontSize:      '0.8rem',
                color:         'var(--text-muted)',
                letterSpacing: '0.04em',
                fontFamily:    'Inter, sans-serif',
              }}>
                Describe how your body feels today.
              </p>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="Energy, sleep, stress, whatever is on your mind..."
                rows={3}
                style={{
                  width:        '100%',
                  background:   'rgba(255,255,255,0.04)',
                  border:       '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  padding:      '1rem 1.1rem',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.88rem',
                  color:        'rgba(255,255,255,0.8)',
                  resize:       'none',
                  outline:      'none',
                  lineHeight:   1.6,
                  transition:   'border-color 0.2s',
                  minHeight:    '90px',
                }}
                onFocus={e  => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />

              <AnimatePresence>
                {input.trim() && (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                    onClick={submit}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      alignSelf:     'center',
                      background:    'none',
                      border:        '1px solid rgba(255,255,255,0.2)',
                      borderRadius:  '2rem',
                      padding:       '0.6rem 2rem',
                      cursor:        'pointer',
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.78rem',
                      color:         'rgba(255,255,255,0.6)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    reveal
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* ── LOADING PHASE ── */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '2rem',
              textAlign:     'center',
            }}
          >
            {archetype ? (
              <AssemblingName name={archetype.name} color={archetype.color} />
            ) : (
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.78rem',
                  color:         'rgba(255,255,255,0.3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                reading your state
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── REVEALED PHASE ── */}
        {phase === 'revealed' && archetype && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '1.5rem',
              maxWidth:      '44rem',
              width:         '100%',
              textAlign:     'center',
            }}
          >
            {/* Archetype video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                width:        'min(220px, 55vw)',
                aspectRatio:  '1',
                borderRadius: '1.25rem',
                overflow:     'hidden',
                border:       `1px solid ${archetype.color}30`,
              }}
            >
              <video
                src={archetype.vid}
                autoPlay muted loop playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </motion.div>

            {/* Name */}
            <motion.p
              className="font-display"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                fontSize:      'clamp(2.4rem, 6vw, 4.5rem)',
                color:         archetype.color,
                letterSpacing: '0.02em',
                lineHeight:    1,
              }}
            >
              {archetype.name}
            </motion.p>

            {/* One liner */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   'clamp(0.9rem, 2vw, 1.05rem)',
                color:      'var(--text-secondary)',
                fontStyle:  'italic',
                lineHeight: 1.6,
              }}
            >
              {archetype.oneliner}
            </motion.p>

            {/* Claude's response */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   'clamp(0.82rem, 1.5vw, 0.95rem)',
                color:      'var(--text-muted)',
                lineHeight: 1.75,
                maxWidth:   '32rem',
                textAlign:  'left',
              }}
            >
              {response}
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.4 }}
              style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
            >
              <button
                onClick={() => shareCard(archetype)}
                style={{
                  background:    'none',
                  border:        '1px solid rgba(255,255,255,0.12)',
                  borderRadius:  '2rem',
                  padding:       '0.6rem 1.8rem',
                  cursor:        'pointer',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.72rem',
                  color:         'rgba(255,255,255,0.35)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
              >
                share your card
              </button>

              <button
                onClick={() => {
                  setPhase('intro')
                  setInput('')
                  setResponse('')
                  setArchetype(null)
                  setMessages([])
                }}
                style={{
                  background:    'none',
                  border:        '1px solid rgba(255,255,255,0.12)',
                  borderRadius:  '2rem',
                  padding:       '0.6rem 1.8rem',
                  cursor:        'pointer',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.72rem',
                  color:         'rgba(255,255,255,0.35)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
              >
                try again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
