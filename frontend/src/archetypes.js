/**
 * Single source of truth for archetype identity data.
 * Imported by Prologue, ActTwo, and ChapterTimeline.
 */
const _archetypes = [
  {
    name:     'The Sovereign',
    color:    '#f0c040',
    slug:     'sovereign',
    oneliner: 'Peak vitality. Body and mind in rare alignment.',
    signals:  [{ dir: 'up', label: 'HRV' }, { dir: 'up', label: 'Recovery' }],
  },
  {
    name:     'The Warrior',
    color:    '#e05a2b',
    slug:     'warrior',
    oneliner: 'Pushing hard. High output, still absorbing the cost.',
    signals:  [{ dir: 'up', label: 'Strain' }, { dir: 'up', label: 'Load Ratio' }],
  },
  {
    name:     'The Sage',
    color:    '#4a90d9',
    slug:     'sage',
    oneliner: 'Deeply restored. The body has done its deepest work.',
    signals:  [
      { dir: 'up',   label: 'Deep Sleep' },
      { dir: 'up',   label: 'Recovery'   },
      { dir: 'down', label: 'Strain'     },
    ],
  },
  {
    name:     'The Wanderer',
    color:    '#9b6dbd',
    slug:     'wanderer',
    oneliner: 'Between states. Searching for rhythm.',
    signals:  [{ dir: 'down', label: 'HRV Stability' }, { dir: 'down', label: 'Recovery' }],
  },
  {
    name:     'The Hermit',
    color:    '#7a8fa6',
    slug:     'hermit',
    oneliner: 'Withdrawn. The body asking for stillness.',
    signals:  [{ dir: 'down', label: 'Recovery' }, { dir: 'down', label: 'Strain' }],
  },
  {
    name:     'The Shadow',
    color:    '#c05050',
    slug:     'shadow',
    oneliner: 'Crashed. Fighting something from the inside.',
    signals:  [{ dir: 'down', label: 'HRV' }, { dir: 'down', label: 'Recovery' }],
  },
  {
    name:     'The Phoenix',
    color:    '#e8924a',
    slug:     'phoenix',
    oneliner: 'Rebounding. Something is returning.',
    signals:  [{ dir: 'up', label: 'HRV Rebound' }],
  },
  {
    name:     'The Vessel',
    color:    '#4e9e6a',
    slug:     'vessel',
    oneliner: 'Steady. The body in its natural rhythm.',
    signals:  [{ dir: 'up', label: 'HRV Stability' }],
  },
]

export const ARCHETYPES = _archetypes.map(a => ({
  ...a,
  img: `/archetypes/${a.slug}.jpg`,
  vid: `/archetypes/${a.slug}.mp4`,
}))

/** Keyed by name for O(1) lookup: ARCHETYPE_MAP['The Sovereign'] → { color, slug, ... } */
export const ARCHETYPE_MAP = Object.fromEntries(ARCHETYPES.map(a => [a.name, a]))
