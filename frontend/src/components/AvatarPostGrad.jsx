/**
 * AvatarPostGrad — abstract geometric figure for Chapter 3: Post-Grad.
 *
 * Visual language: head solid again (recovered). Torso is outlined at the
 * top (still reforming) with a partial fill in the lower half — like a
 * health bar that is refilling from the bottom up. Arms raised above the
 * horizontal (~38° upward) and spread outward — the opening posture of
 * emergence, not yet symmetrically resolved. Legs in a wider stance than
 * Chapter 1, grounded but more open.
 *
 * viewBox 0 0 200 400 — no hardcoded width/height; parent controls sizing.
 *
 * @param {{ style?: React.CSSProperties }} props
 */
export default function AvatarPostGrad({ style }) {
  const color = '#3a6b4f'

  return (
    <svg
      viewBox="0 0 200 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chapter 3 figure: rising and opening"
      role="img"
      style={style}
    >
      {/* Head: solid — has recovered, back to center */}
      <circle cx="100" cy="62" r="27" fill={color} />

      {/* Torso outline: same dimensions as Student but not yet filled */}
      <rect x="79" y="96" width="42" height="118" rx="5" fill="none" stroke={color} strokeWidth="3.5" />

      {/* Torso partial fill: lower ~half only — refilling from the bottom.
          rx="0" on the left/right so it butts flush against the outline sides. */}
      <rect x="79" y="156" width="42" height="58" rx="0" fill={color} opacity="0.45" />

      {/* Left arm: raised ~38° above horizontal (endpoint y=79 < shoulder y=112).
          The upward angle is what signals emergence vs. the downward Student pose. */}
      <line x1="79"  y1="112" x2="37"  y2="79" stroke={color} strokeWidth="12" strokeLinecap="round" />

      {/* Right arm: exact mirror of left — symmetric, but the wide spread
          still reads as open rather than composed */}
      <line x1="121" y1="112" x2="163" y2="79" stroke={color} strokeWidth="12" strokeLinecap="round" />

      {/* Left leg: wider stance than Student (x=65 vs x=83 at foot) */}
      <line x1="89"  y1="214" x2="65"  y2="370" stroke={color} strokeWidth="14" strokeLinecap="round" />

      {/* Right leg: mirror wide stance */}
      <line x1="111" y1="214" x2="135" y2="370" stroke={color} strokeWidth="14" strokeLinecap="round" />
    </svg>
  )
}
