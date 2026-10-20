/** Logo mark as plain JSX for next/og (favicon, Apple icon, PWA icons). */
export function BrandMark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex", background: "#0e7c72", borderRadius: size * 0.25, alignItems: "center", justifyContent: "center" }}>
      <svg width={Math.round(size * 0.84)} height={Math.round(size * 0.84)} viewBox="0 0 120 120">
        <path d="M42 39 q-26 -6 -26 30 q1 15 12 13 q10 -18 14 -43 z" fill="#d99a0f"/><path d="M76 40 l15 -19 l6 29 z" fill="#7a5af5"/><path d="M60 34 A34 34 0 0 0 60 102 Z" fill="#f6b21b"/><path d="M60 34 A34 34 0 0 1 60 102 Z" fill="#7a5af5"/><circle cx="47" cy="64" r="4.5" fill="#1a2233"/><circle cx="48.5" cy="62.5" r="1.4" fill="#fff"/><path d="M68 64 q5 -6 10 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round"/><path d="M53 76 h14 l-7 8 z" fill="#1a2233"/><path d="M60 84 v4 m0 0 q-5 5 -10 1 m10 -1 q5 5 10 1" stroke="#1a2233" strokeWidth="2.6" fill="none" strokeLinecap="round"/><path d="M78 80 h12 M78 86 h11" stroke="#ffffffaa" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
