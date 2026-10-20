/** Instagram glyph for footer/header links (lucide-react does not ship brand icons). */
export function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7.03 2.5h9.94A4.53 4.53 0 0 1 21.5 7.03v9.94a4.53 4.53 0 0 1-4.53 4.53H7.03A4.53 4.53 0 0 1 2.5 16.97V7.03A4.53 4.53 0 0 1 7.03 2.5Zm0 1.8A2.73 2.73 0 0 0 4.3 7.03v9.94a2.73 2.73 0 0 0 2.73 2.73h9.94a2.73 2.73 0 0 0 2.73-2.73V7.03a2.73 2.73 0 0 0-2.73-2.73H7.03Zm9.72 1.58a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.35A4.65 4.65 0 1 1 7.35 12 4.65 4.65 0 0 1 12 7.35Zm0 1.8A2.85 2.85 0 1 0 14.85 12 2.85 2.85 0 0 0 12 9.15Z" />
    </svg>
  );
}
