"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Full-screen image viewer: swipe on mobile, arrow keys / buttons on desktop, Esc to close. */
export function Lightbox({ images, startIndex = 0, onClose, alt }: { images: string[]; startIndex?: number; onClose: () => void; alt: string }) {
  const [index, setIndex] = useState(startIndex);
  const ref = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    ref.current?.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <dialog
      ref={ref}
      aria-label={`${alt} — photo viewer`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black"
    >
      <div
        className="relative h-full w-full"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <Image src={images[index]} alt={`${alt} (${index + 1} of ${images.length})`} fill sizes="100vw" className="object-contain" priority />
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/15 p-2.5 hover:bg-white/25" aria-label="Close viewer" autoFocus>
          <X className="h-6 w-6" />
        </button>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 hover:bg-white/25 sm:block" aria-label="Previous photo">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2.5 hover:bg-white/25 sm:block" aria-label="Next photo">
              <ChevronRight className="h-6 w-6" />
            </button>
            <p className="absolute inset-x-0 bottom-6 text-center text-sm font-bold" aria-live="polite">{index + 1} / {images.length}</p>
          </>
        )}
      </div>
    </dialog>
  );
}

/** Swipeable photo strip with dots; tap opens the lightbox. Used on detail pages. */
export function PhotoGallery({ images, alt, aspect = "aspect-square", priority, className, rounded = "rounded-[var(--radius-lg)]" }: { images: string[]; alt: string; aspect?: string; priority?: boolean; className?: string; rounded?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  if (!images.length) return null;
  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={scroller}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto ${aspect} ${rounded} bg-surface-2`}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((src, i) => (
          <button key={src} type="button" onClick={() => setOpen(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={`Open photo ${i + 1} of ${images.length}`}>
            <Image src={src} alt={`${alt} (${i + 1})`} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" priority={priority && i === 0} />
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <span className="absolute right-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-extrabold text-white" aria-hidden>{active + 1}/{images.length}</span>
      )}
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
          {images.map((src, i) => <span key={src} className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-2 bg-white/60"}`} />)}
        </div>
      )}
      {open !== null && <Lightbox images={images} startIndex={open} alt={alt} onClose={() => setOpen(null)} />}
    </div>
  );
}
