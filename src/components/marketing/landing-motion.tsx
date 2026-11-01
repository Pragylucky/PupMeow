"use client";

import { useEffect, useRef, useState } from "react";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { cn } from "@/lib/utils";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** True while the element is on screen; with `once`, stays true after the first sighting. */
function useInView<T extends Element>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, inView] as const;
}

/** Fades its content up when it scrolls into view. Without JS (or with reduced motion) it's simply visible — see `.reveal` in globals.css. */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)} data-shown={inView ? "" : undefined}>
      {children}
    </div>
  );
}

/** Counts up from 0 to `value` the first time it's seen. Server-renders the real number. */
export function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(value);
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
    </span>
  );
}

/**
 * Slot-machine word swap: the next word rolls up through a clipped window while the box eases to its width,
 * then a hand-drawn underline sketches in. Pauses off screen. Screen readers get the first word only.
 */
export function RotatingWord({
  words,
  interval = 2800,
  className,
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [box, inView] = useInView<HTMLSpanElement>(false);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [i, setI] = useState(0);
  const [width, setWidth] = useState<number>();
  const prev = (i - 1 + words.length) % words.length;

  useEffect(() => {
    if (!inView || words.length < 2 || prefersReducedMotion()) return;
    const id = setInterval(() => setI((x) => (x + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [inView, words.length, interval]);

  // Track the active word's width (it changes with web-font loading and breakpoints) so the box can ease between words.
  useEffect(() => {
    const el = refs.current[i];
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [i]);

  return (
    <>
      <span className="sr-only">{words[0]}</span>
      <span
        ref={box}
        aria-hidden
        className={cn(
          "relative inline-block align-baseline whitespace-nowrap transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] [clip-path:inset(-0.08em_-0.04em_-0.5em_-0.04em)]",
          className,
        )}
        style={{ width }}
      >
        {words.map((w, k) => (
          <span
            key={w}
            ref={(el) => {
              refs.current[k] = el;
            }}
            className={cn(
              // w-max: size to the word, never to the box, or a pre-font-load measurement would lock in.
              "inline-block w-max",
              k !== i ? "absolute top-0 left-0" : "relative",
              k === i || k === prev
                ? "transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
                : "transition-none",
              k === i
                ? "translate-y-0"
                : k === prev
                  ? "-translate-y-[125%] opacity-0"
                  : "translate-y-[160%] opacity-0",
            )}
          >
            {w}
            {/* Zero-size anchor on the baseline. The svg has no top/bottom, so it hangs from here — font metrics differ per browser, the baseline doesn't. */}
            <span className="inline-block h-0 w-0 align-baseline">
              <svg
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                className={cn(
                  // Just under the baseline, behind the letters, so descenders cross it like a marker stroke.
                  "text-secondary pointer-events-none absolute -left-[0.04em] -z-10 mt-[0.01em] h-[0.2em] w-[calc(100%+0.08em)] overflow-visible",
                  // Wipes in left to right, like a pen stroke.
                  k === i
                    ? "transition-[clip-path] delay-300 duration-700 ease-out [clip-path:inset(-60%_-4%_-60%_-4%)]"
                    : "[clip-path:inset(-60%_104%_-60%_-4%)]",
                )}
              >
                <path
                  d="M2 8 C 20 3, 40 3, 58 6 S 88 9, 98 4"
                  stroke="currentColor"
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
          </span>
        ))}
      </span>
    </>
  );
}

/** The hero dog and cat: idle animations from <PetArt animated>, eyes that follow the pointer, and a hop (dog) or stretch (cat) with a heart when tapped. */
export function HeroPets({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  const pets = useRef<(HTMLButtonElement | null)[]>([]);
  const [excited, setExcited] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const el of pets.current) {
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height * 0.45);
          const d = Math.hypot(dx, dy) || 1;
          const pull = Math.min(1, d / 300) * 2.6;
          el.style.setProperty("--look-x", `${((dx / d) * pull).toFixed(2)}px`);
          el.style.setProperty("--look-y", `${((dy / d) * pull * 0.7).toFixed(2)}px`);
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const poke = (k: 0 | 1) => {
    if (prefersReducedMotion()) return;
    setExcited((e) => (k === 0 ? [e[0] + 1, e[1]] : [e[0], e[1] + 1]));
  };

  return children.map((pet, k) => (
    <button
      key={k}
      type="button"
      tabIndex={-1}
      ref={(el) => {
        pets.current[k] = el;
      }}
      onClick={() => poke(k as 0 | 1)}
      className={cn(
        "relative cursor-pointer touch-manipulation outline-none",
        k === 1 && "-ml-10 sm:-ml-16",
      )}
    >
      {/* Remounting on each poke restarts the animation. */}
      <span
        key={excited[k]}
        className={cn(
          "block origin-bottom",
          excited[k] > 0 &&
            (k === 0 ? "animate-[pm-hop_650ms_ease-out]" : "animate-[pm-stretch_700ms_ease-out]"),
        )}
      >
        {pet}
      </span>
      {excited[k] > 0 && (
        <span
          key={`h${excited[k]}`}
          className="pointer-events-none absolute top-[8%] left-1/2 animate-[pm-heart_900ms_ease-out_forwards] text-3xl opacity-0 sm:text-4xl"
        >
          {k === 0 ? "❤️" : "💜"}
        </span>
      )}
    </button>
  ));
}

const KAIA_DEMO = [
  {
    q: "Bruno keeps scratching after walks. Ticks?",
    a: "Could be! Check his ears, neck and between the toes after each walk. If you find one, your vet can suggest the right tick treatment.",
  },
  {
    q: "It's 44° out. When should I walk Mithu?",
    a: "Before 8 am or after sunset. Test the road with your palm — if you can't hold it for 5 seconds, it's too hot for paws. Carry water!",
  },
  {
    q: "Diwali crackers terrify my cat. Help?",
    a: "Give her a quiet room with the windows shut, a hiding box and some soft music. Don't force cuddles. Ask your vet early if she panics badly.",
  },
];

type Phase = "answer" | "question" | "typing";

/** Example Kaia chat that plays through a few exchanges while on screen. Server-renders the first exchange in full. */
export function KaiaDemoChat() {
  const [ref, inView] = useInView<HTMLDivElement>(false);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("answer");

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const wait = { question: 700, typing: 1300, answer: 5000 }[phase];
    const id = setTimeout(() => {
      if (phase === "question") setPhase("typing");
      else if (phase === "typing") setPhase("answer");
      else {
        setIdx((x) => (x + 1) % KAIA_DEMO.length);
        setPhase("question");
      }
    }, wait);
    return () => clearTimeout(id);
  }, [inView, phase]);

  const ex = KAIA_DEMO[idx];
  return (
    <div ref={ref} className="space-y-3" aria-label="Example chat">
      <div className="flex items-center gap-2">
        <KaiaAvatar size={44} className="bg-white" />
        <span className="font-heading text-xl font-semibold">Kaia</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold">
          Example chat
        </span>
      </div>
      {/* Fixed height so swapping exchanges doesn't push the page around. */}
      <div className="min-h-64 space-y-3 sm:min-h-56">
        <p
          key={`q${idx}`}
          className="bg-primary text-on-primary ml-auto max-w-xs animate-[pm-rise_350ms_ease-out_both] rounded-[1.25rem] rounded-br-md px-4 py-3 font-semibold"
        >
          {ex.q}
        </p>
        {phase === "typing" && (
          <p
            className="inline-flex animate-[pm-rise_250ms_ease-out_both] gap-1.5 rounded-[1.25rem] rounded-bl-md bg-white px-4 py-4"
            aria-label="Kaia is typing"
          >
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="bg-ink/50 h-2.5 w-2.5 animate-[pm-dot_900ms_ease-in-out_infinite] rounded-full"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </p>
        )}
        {phase === "answer" && (
          <p
            key={`a${idx}`}
            className="max-w-sm animate-[pm-rise_350ms_ease-out_both] rounded-[1.25rem] rounded-bl-md bg-white px-4 py-3 font-semibold"
          >
            {ex.a}
          </p>
        )}
      </div>
    </div>
  );
}
