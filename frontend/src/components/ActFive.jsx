import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ARCHETYPE_MAP } from '../archetypes'

const ARCHETYPE_NAMES = Object.keys(ARCHETYPE_MAP)

function detectArchetype(text) {
  return ARCHETYPE_NAMES.find(name => text.includes(name)) ?? null
}

// ─── Letter-by-letter name assembly ──────────────────────────────────────────

function AssemblingName({ name, color }) {
  return (
    <motion.div
      style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
    >
      {name.split('').map((l, i) => (
        <motion.span
          key={i}
          variants={{
            hidden:  { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.4 } },
          }}
          style={{
            fontFamily:    'Fraunces, serif',
            fontSize:      'clamp(3.5rem, 10vw, 10rem)',
            fontWeight:    800,
            color,
            letterSpacing: l === ' ' ? '0.2em' : '-0.025em',
            lineHeight:    1,
            whiteSpace:    l === ' ' ? 'pre' : 'normal',
          }}
        >
          {l}
        </motion.span>
      ))}
    </motion.div>
  )
}

// ─── Share card ───────────────────────────────────────────────────────────────

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
      ctx.drawImage(img, 260, 100, 380, 380)
      resolve()
    }
    img.onerror = resolve
  })

  ctx.fillStyle    = archetype.color
  ctx.font         = '800 52px Fraunces, Georgia, serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(archetype.name, 450, 565)

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font      = '300 22px Inter, sans-serif'
  ctx.fillText(archetype.oneliner, 450, 625)

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(300, 685); ctx.lineTo(600, 685); ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font      = '300 16px Inter, sans-serif'
  ctx.fillText('WHOOP RPG', 450, 725)

  return canvas.toDataURL('image/png')
}

async function shareCard(archetype) {
  const dataUrl = await buildShareCard(archetype)
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
  const link = document.createElement('a')
  link.download = `whoop-rpg-${archetype.slug}.png`
  link.href = dataUrl
  link.click()
}

// ─── ActFive ──────────────────────────────────────────────────────────────────

export default function ActFive() {
  const [phase,             setPhase]            = useState('intro')
  const [input,             setInput]            = useState('')
  const [response,          setResponse]         = useState('')
  const [archetype,         setArchetype]        = useState(null)
  const [messages,          setMessages]         = useState([])
  const [followUpInput,     setFollowUpInput]    = useState('')
  const [followUpLoading,   setFollowUpLoading]  = useState(false)

  const sectionRef  = useRef(null)
  const textareaRef = useRef(null)
  const isInView    = useInView(sectionRef, { once: true, margin: '-15%' })

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

      // Save assistant reply so follow-up calls have full conversation context
      setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
      await new Promise(r => setTimeout(r, 600))
      setPhase('revealed')
    } catch {
      setPhase('intro')
    }
  }

  async function submitFollowUp() {
    const text = followUpInput.trim()
    if (!text || followUpLoading) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setFollowUpInput('')
    setFollowUpLoading(true)
    setResponse('')

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
          try { const chunk = JSON.parse(payload); fullText += chunk; setResponse(fullText) } catch {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
    } catch {}

    setFollowUpLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const archetypeColor = archetype?.color ?? '#a78bfa'

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight:      '100vh',
        background:     'radial-gradient(ellipse 90% 80% at 50% 50%, #22222a 0%, #07080f 55%, #000 100%)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '6rem 2rem',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Archetype color flood */}
      <AnimatePresence>
        {(phase === 'loading' || phase === 'revealed') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
            style={{
              position:      'absolute',
              inset:         0,
              background:    `radial-gradient(ellipse 70% 60% at 50% 50%, ${archetypeColor}1e 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.5 }}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '2.5rem',
              width:         '100%',
              maxWidth:      '52rem',
              textAlign:     'center',
            }}
          >
            {/* Headlines */}
            <div style={{ lineHeight: 1.0 }}>
              <motion.p
                className="font-display"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0 }}
                style={{
                  fontSize:      'clamp(3rem, 9.5vw, 10rem)',
                  fontWeight:    800,
                  color:         '#ffffff',
                  letterSpacing: '-0.025em',
                }}
              >
                That's my story.
              </motion.p>

              <motion.p
                className="font-display"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
                style={{
                  fontSize:      'clamp(3rem, 9.5vw, 10rem)',
                  fontWeight:    800,
                  color:         'rgba(255,255,255,0.38)',
                  letterSpacing: '-0.025em',
                }}
              >
                Who are you?
              </motion.p>
            </div>

            {/* Oracle input */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 1, delay: 1.9 }}
              style={{ width: '100%', maxWidth: '26rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              <p style={{
                fontFamily:    'Inter, sans-serif',
                fontWeight:    300,
                fontSize:      '0.62rem',
                color:         'rgba(255,255,255,0.22)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}>
                Describe how your body feels today
              </p>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="energy, sleep, stress, whatever is on your mind..."
                rows={2}
                style={{
                  width:        '100%',
                  background:   'none',
                  border:       'none',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  padding:      '0.75rem 0',
                  fontFamily:   'Inter, sans-serif',
                  fontWeight:   300,
                  fontSize:     '0.95rem',
                  color:        'rgba(255,255,255,0.65)',
                  resize:       'none',
                  outline:      'none',
                  lineHeight:   1.6,
                  textAlign:    'center',
                  transition:   'border-color 0.25s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />

              <AnimatePresence>
                {input.trim() && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: 8 }}
                    transition={{ duration: 0.22 }}
                    onClick={submit}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      alignSelf:     'center',
                      marginTop:     '0.4rem',
                      background:    'none',
                      border:        '1px solid rgba(255,255,255,0.15)',
                      borderRadius:  '2rem',
                      padding:       '0.55rem 2.2rem',
                      cursor:        'pointer',
                      fontFamily:    'Inter, sans-serif',
                      fontWeight:    300,
                      fontSize:      '0.68rem',
                      color:         'rgba(255,255,255,0.45)',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      transition:    'color 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  >
                    reveal
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', textAlign: 'center' }}
          >
            {archetype ? (
              <AssemblingName name={archetype.name} color={archetype.color} />
            ) : (
              <>
                {/* Pulsing orb */}
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <motion.div
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                    animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
                  />
                  <motion.div
                    style={{
                      position: 'absolute', inset: '30%', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.55)',
                    }}
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                <motion.p
                  animate={{ opacity: [0.25, 0.65, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    fontFamily:    'Inter, sans-serif',
                    fontWeight:    300,
                    fontSize:      '0.6rem',
                    color:         'rgba(255,255,255,0.25)',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                  }}
                >
                  reading your state
                </motion.p>
              </>
            )}
          </motion.div>
        )}

        {/* ── REVEALED ── */}
        {phase === 'revealed' && archetype && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           '1.6rem',
              maxWidth:      '52rem',
              width:         '100%',
              textAlign:     'center',
            }}
          >
            {/* Archetype name — slams in from slightly larger */}
            <motion.p
              className="font-display"
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize:      'clamp(3.5rem, 10vw, 10rem)',
                fontWeight:    800,
                color:         archetype.color,
                letterSpacing: '-0.025em',
                lineHeight:    1,
              }}
            >
              {archetype.name}
            </motion.p>

            {/* Video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              style={{
                width:        'min(190px, 48vw)',
                aspectRatio:  '1',
                borderRadius: '1.2rem',
                overflow:     'hidden',
                border:       `1px solid ${archetype.color}22`,
              }}
            >
              <video
                src={archetype.vid}
                autoPlay muted loop playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </motion.div>

            {/* Oneliner */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 300,
                fontSize:   'clamp(0.88rem, 1.8vw, 1rem)',
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
              transition={{ duration: 0.8, delay: 0.75 }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 300,
                fontSize:   'clamp(0.8rem, 1.4vw, 0.92rem)',
                color:      'var(--text-muted)',
                lineHeight: 1.8,
                maxWidth:   '30rem',
                textAlign:  'left',
              }}
            >
              {response}
            </motion.p>

            {/* Follow-up input */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              style={{ width: '100%', maxWidth: '26rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem' }}>
                <textarea
                  value={followUpInput}
                  onChange={e => {
                    setFollowUpInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFollowUp() } }}
                  placeholder={followUpLoading ? 'reading…' : 'ask anything about this state…'}
                  disabled={followUpLoading}
                  rows={1}
                  style={{
                    flex:         1,
                    background:   'none',
                    border:       'none',
                    borderBottom: `1px solid ${followUpLoading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                    padding:      '0.5rem 0',
                    fontFamily:   'Inter, sans-serif',
                    fontWeight:   300,
                    fontSize:     '0.82rem',
                    color:        'rgba(255,255,255,0.55)',
                    resize:       'none',
                    outline:      'none',
                    lineHeight:   1.5,
                    transition:   'border-color 0.2s',
                    minHeight:    '2rem',
                    overflow:     'hidden',
                  }}
                  onFocus={e  => { if (!followUpLoading) e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e   => e.target.style.borderColor = followUpLoading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}
                />
                <AnimatePresence>
                  {followUpInput.trim() && !followUpLoading && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{    opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.15 }}
                      onClick={submitFollowUp}
                      style={{
                        background:    'none',
                        border:        '1px solid rgba(255,255,255,0.12)',
                        borderRadius:  '2rem',
                        padding:       '0.35rem 1rem',
                        cursor:        'pointer',
                        fontFamily:    'Inter, sans-serif',
                        fontWeight:    300,
                        fontSize:      '0.6rem',
                        color:         'rgba(255,255,255,0.35)',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        flexShrink:    0,
                        transition:    'color 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    >
                      ask
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {[
                { label: 'share your card', action: () => shareCard(archetype) },
                { label: 'try again',       action: () => { setPhase('intro'); setInput(''); setResponse(''); setArchetype(null); setMessages([]) } },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background:    'none',
                    border:        '1px solid rgba(255,255,255,0.1)',
                    borderRadius:  '2rem',
                    padding:       '0.55rem 1.8rem',
                    cursor:        'pointer',
                    fontFamily:    'Inter, sans-serif',
                    fontWeight:    300,
                    fontSize:      '0.65rem',
                    color:         'rgba(255,255,255,0.28)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    transition:    'color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  {label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </section>
  )
}
