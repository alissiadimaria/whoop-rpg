/**
 * AvatarCrash — abstract geometric figure for Chapter 2: The Crash.
 *
 * Visual language: outlines only (no fill = depleted). Head shifted off-center.
 * Torso broken into two pieces with a visible gap between them — the broken
 * connection is literal empty space, not a drawn line. Arms asymmetric:
 * left droops with a dashed stroke (fragile), right raised at an awkward
 * angle (uncontrolled). Legs splayed unevenly outward.
 *
 * Same base proportions as AvatarStudent so the disruption reads as a
 * state change, not a different character.
 *
 * viewBox 0 0 200 400 — no hardcoded width/height; parent controls sizing.
 *
 * @param {{ style?: React.CSSProperties }} props
 */
export default function AvatarCrash({ style }) {
  const color = '#8e3a3a'

  return (
    <svg
      viewBox="0 0 200 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chapter 2 figure: fragmented and leaning"
      role="img"
      style={style}
    >
      {/* Head: outline only (hollow = depleted), shifted right of center */}
      <circle cx="105" cy="70" r="26" fill="none" stroke={color} strokeWidth="3.5" />

      {/* Neck: dashed — suggests a fragile, unreliable connection */}
      <line
        x1="102" y1="96" x2="99" y2="111"
        stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray="4 3"
      />

      {/* Upper torso: outlined, rotated 5° rightward — the lean */}
      <rect
        x="81" y="111" width="40" height="54"
        rx="5" fill="none" stroke={color} strokeWidth="3.5"
        transform="rotate(5 101 138)"
      />

      {/* Gap: y=165 to y=182 is intentionally empty — the broken connection
          between upper and lower body is absence, not a drawn element */}

      {/* Lower torso: outlined, counter-rotated 3° — resisting the lean */}
      <rect
        x="81" y="182" width="40" height="42"
        rx="5" fill="none" stroke={color} strokeWidth="3.5"
        transform="rotate(-3 101 203)"
      />

      {/* Left arm: dashed stroke, drooping downward — no energy to hold it up */}
      <line
        x1="81" y1="124" x2="37" y2="192"
        stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray="7 4"
      />

      {/* Right arm: solid but raised at an awkward angle — uncontrolled tension */}
      <line x1="121" y1="118" x2="163" y2="154" stroke={color} strokeWidth="9" strokeLinecap="round" />

      {/* Left leg: splayed further out than Student — loss of central grounding */}
      <line x1="91"  y1="224" x2="62"  y2="370" stroke={color} strokeWidth="12" strokeLinecap="round" />

      {/* Right leg: splayed in the opposite direction — asymmetric, unstable */}
      <line x1="110" y1="224" x2="136" y2="366" stroke={color} strokeWidth="12" strokeLinecap="round" />
    </svg>
  )
}
