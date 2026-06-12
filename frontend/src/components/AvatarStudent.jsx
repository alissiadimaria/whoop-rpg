/**
 * AvatarStudent — abstract geometric figure for Chapter 1: The Student.
 *
 * Visual language: fully solid filled shapes, perfect bilateral symmetry,
 * arms hanging at a composed rest angle. Reads as structured, grounded,
 * disciplined. All three avatars share the same base proportions so the
 * same character is recognizable across states.
 *
 * viewBox 0 0 200 400 — no hardcoded width/height; parent controls sizing.
 *
 * @param {{ style?: React.CSSProperties }} props
 */
export default function AvatarStudent({ style }) {
  const color = '#6b4f8e'

  return (
    <svg
      viewBox="0 0 200 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chapter 1 figure: composed and upright"
      role="img"
      style={style}
    >
      {/* Head: solid circle, perfectly centered */}
      <circle cx="100" cy="65" r="27" fill={color} />

      {/* Torso: solid rectangle, straight and structured */}
      <rect x="79" y="99" width="42" height="116" rx="5" fill={color} />

      {/* Left arm: two segments (upper arm → forearm), hanging at ~50° */}
      <line x1="79"  y1="114" x2="44"  y2="168" stroke={color} strokeWidth="13" strokeLinecap="round" />
      <line x1="44"  y1="168" x2="39"  y2="222" stroke={color} strokeWidth="13" strokeLinecap="round" />

      {/* Right arm: exact mirror of left */}
      <line x1="121" y1="114" x2="156" y2="168" stroke={color} strokeWidth="13" strokeLinecap="round" />
      <line x1="156" y1="168" x2="161" y2="222" stroke={color} strokeWidth="13" strokeLinecap="round" />

      {/* Left leg: narrow, straight, composed */}
      <line x1="90"  y1="215" x2="83"  y2="368" stroke={color} strokeWidth="14" strokeLinecap="round" />

      {/* Right leg: mirror of left */}
      <line x1="110" y1="215" x2="117" y2="368" stroke={color} strokeWidth="14" strokeLinecap="round" />
    </svg>
  )
}
