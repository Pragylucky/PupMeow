/** Hero illustration: a dog and a cat peeking over the edge — the brand's signature moment. */
export function PeekingPets({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 170" className={className} role="img" aria-label="A dog and a cat peeking over the edge">
      {/* dog */}
      <g className="pm-peek-dog">
        <path d="M70 70 q-26 -6 -30 34 q10 8 22 2 z" fill="#c98f0b" />
        <path d="M170 70 q26 -6 30 34 q-10 8 -22 2 z" fill="#c98f0b" />
        <path d="M70 170 v-70 q0 -56 50 -56 q50 0 50 56 v70 z" fill="var(--pm-dog)" />
        <ellipse cx="120" cy="128" rx="32" ry="26" fill="#fff4d6" />
        <circle cx="100" cy="100" r="7" fill="#1a2233" /><circle cx="102.5" cy="97.5" r="2.2" fill="#fff" />
        <circle cx="140" cy="100" r="7" fill="#1a2233" /><circle cx="142.5" cy="97.5" r="2.2" fill="#fff" />
        <ellipse cx="120" cy="118" rx="10" ry="7.5" fill="#1a2233" />
        <path d="M110 132 q10 9 20 0" stroke="#1a2233" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M116 136 q4 14 8 0" fill="var(--pm-accent)" />
      </g>
      {/* cat */}
      <g className="pm-peek-cat">
        <path d="M212 92 l6 -46 l30 30 z" fill="var(--pm-cat)" />
        <path d="M318 92 l-6 -46 l-30 30 z" fill="var(--pm-cat)" />
        <path d="M218 74 l4 -18 l12 12 z" fill="#f7c6d6" /><path d="M312 74 l-4 -18 l-12 12 z" fill="#f7c6d6" />
        <path d="M212 170 v-62 q0 -48 53 -48 q53 0 53 48 v62 z" fill="var(--pm-cat)" />
        <path d="M244 104 q6 -7 12 0" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M274 104 q6 -7 12 0" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M259 116 l6 6 l6 -6 z" fill="#f7c6d6" />
        <path d="M265 122 v5 m0 0 q-6 6 -11 1 m11 -1 q6 6 11 1" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M222 118 h20 M224 126 h18 M288 118 h20 M288 126 h18" stroke="#ffffffaa" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* paws on the ledge */}
      <g fill="#fff4d6"><ellipse cx="88" cy="166" rx="14" ry="8" /><ellipse cx="152" cy="166" rx="14" ry="8" /></g>
      <g fill="#a68bff"><ellipse cx="232" cy="166" rx="13" ry="8" /><ellipse cx="298" cy="166" rx="13" ry="8" /></g>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .pm-peek-dog { animation: pm-peek 900ms cubic-bezier(.2,.9,.3,1.3) both; }
          .pm-peek-cat { animation: pm-peek 900ms 180ms cubic-bezier(.2,.9,.3,1.3) both; }
        }
        @keyframes pm-peek { from { transform: translateY(70px); } to { transform: translateY(0); } }
      `}</style>
    </svg>
  );
}
