import { cn } from "@/lib/utils";

/**
 * Pupmeow's flat mascot pets. Used as a friendly fallback when a pet has no photo yet,
 * and in empty states. Colours are picked from the breed / colour text so a "black Lab"
 * looks black and a "white Persian" looks white.
 */

export type DogLook = "golden" | "brown" | "beagle" | "black" | "dalmatian" | "husky" | "cream";
export type CatLook = "orange" | "white" | "black" | "grey" | "violet";
export type PetLook = { species: "dog"; look: DogLook } | { species: "cat"; look: CatLook };

const INK = "#1a2233";

const DOG: Record<DogLook, { body: string; ear: string; muzzle: string; lower?: string; spots?: boolean; blaze?: boolean }> = {
  golden: { body: "#f6b21b", ear: "#d99a0f", muzzle: "#fff1cc" },
  brown: { body: "#7a4b2a", ear: "#4a2c17", muzzle: "#efd2a8" },
  beagle: { body: "#c98b4e", ear: "#6b3a1e", muzzle: "#ffffff", lower: "#4a3426", blaze: true },
  black: { body: "#2b303b", ear: "#191c23", muzzle: "#4b5261" },
  dalmatian: { body: "#ffffff", ear: "#1a2233", muzzle: "#ffffff", spots: true },
  husky: { body: "#8e97a6", ear: "#5c6473", muzzle: "#ffffff", blaze: true },
  cream: { body: "#f2dcb3", ear: "#c9a46b", muzzle: "#fff8e6" },
};

const CAT: Record<CatLook, { body: string; inner: string; stripes?: string; eye?: string }> = {
  orange: { body: "#f0993d", inner: "#f7c6d6", stripes: "#d4762a" },
  white: { body: "#fbf8f3", inner: "#f7c6d6", eye: "#3d8bd9" },
  black: { body: "#262a33", inner: "#e58aa8", eye: "#f6b21b" },
  grey: { body: "#9aa1ac", inner: "#f0b8cb", stripes: "#6c7380" },
  violet: { body: "#7a5af5", inner: "#f7c6d6" },
};

export const TILE_TINTS = ["#fff1cc", "#fde4ea", "#dcf2ef", "#ece7ff", "#e4eefc", "#fdebd3"] as const;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Choose a look from free text like breed, colour and name. */
export function lookFor(species: "dog" | "cat", hints: (string | null | undefined)[] = []): PetLook {
  const t = hints.filter(Boolean).join(" ").toLowerCase();
  const seed = hash(t || species);
  if (species === "cat") {
    if (/black|bombay/.test(t)) return { species, look: "black" };
    if (/white|persian|himalayan|ragdoll/.test(t)) return { species, look: "white" };
    if (/orange|ginger|marmalade|tabby orange/.test(t)) return { species, look: "orange" };
    if (/grey|gray|silver|tabby|russian|british/.test(t)) return { species, look: "grey" };
    const all: CatLook[] = ["orange", "white", "black", "grey", "orange"];
    return { species, look: all[seed % all.length] };
  }
  if (/dalmatian/.test(t)) return { species, look: "dalmatian" };
  if (/beagle|tri-?colou?r/.test(t)) return { species, look: "beagle" };
  if (/black/.test(t)) return { species, look: "black" };
  if (/husky|grey|gray|malamute/.test(t)) return { species, look: "husky" };
  if (/golden|yellow|labrador|lab\b|retriever/.test(t)) return { species, look: "golden" };
  if (/white|cream|spitz|pomeranian|maltese|samoyed/.test(t)) return { species, look: "cream" };
  if (/brown|chocolate|fawn|indie|desi|pariah|tan/.test(t)) return { species, look: "brown" };
  const all: DogLook[] = ["golden", "brown", "beagle", "black", "golden", "brown"];
  return { species, look: all[seed % all.length] };
}

export function tintFor(seed: string) {
  return TILE_TINTS[hash(seed) % TILE_TINTS.length];
}

export function PetArt({
  pet, className, title, mood = "happy",
}: { pet: PetLook; className?: string; title?: string; mood?: "happy" | "calm" }) {
  return (
    <svg viewBox="0 0 120 120" className={cn("block", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {pet.species === "dog" ? <Dog look={pet.look} /> : <Cat look={pet.look} mood={mood} />}
    </svg>
  );
}

function Dog({ look }: { look: DogLook }) {
  const c = DOG[look];
  const outline = look === "dalmatian" || look === "cream" ? { stroke: "#1a223322", strokeWidth: 1.2 } : {};
  return (
    <g>
      {/* ears behind */}
      <path d="M39 44 Q18 44 20 71 Q22 83 31 79 Q36 62 42 50 Z" fill={c.ear} />
      <path d="M81 44 Q102 44 100 71 Q98 83 89 79 Q84 62 78 50 Z" fill={c.ear} />
      {/* head + body as one friendly shape */}
      <path d="M33 121 V64 Q33 30 60 30 Q87 30 87 64 V121 Z" fill={c.body} {...outline} />
      {c.lower && <path d="M33 96 H87 V121 H33 Z" fill={c.lower} />}
      {c.spots && (
        <g fill={INK}>
          <circle cx="44" cy="44" r="3.4" /><circle cx="76" cy="47" r="2.6" /><circle cx="40" cy="92" r="4" />
          <circle cx="78" cy="86" r="5" /><circle cx="56" cy="104" r="3" /><circle cx="70" cy="110" r="2.4" /><circle cx="48" cy="76" r="2" />
        </g>
      )}
      {c.blaze && <path d="M55.5 34 Q60 31 64.5 34 L66.5 62 H53.5 Z" fill="#ffffff" />}
      {c.blaze && <path d="M48 96 Q60 88 72 96 V121 H48 Z" fill="#ffffff" />}
      {/* muzzle */}
      <ellipse cx="60" cy="71" rx="16" ry="12" fill={c.muzzle} />
      {/* eyes */}
      <circle cx="48.5" cy="56" r="3.6" fill={INK} /><circle cx="49.6" cy="54.8" r="1.2" fill="#fff" />
      <circle cx="71.5" cy="56" r="3.6" fill={INK} /><circle cx="72.6" cy="54.8" r="1.2" fill="#fff" />
      {/* nose + smile */}
      <ellipse cx="60" cy="65.5" rx="5.6" ry="4.1" fill={INK} />
      <path d="M52.5 73 Q60 80 67.5 73" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* paws */}
      <ellipse cx="48" cy="119" rx="8" ry="4.4" fill="#fff8e6" />
      <ellipse cx="72" cy="119" rx="8" ry="4.4" fill="#fff8e6" />
    </g>
  );
}

function Cat({ look, mood }: { look: CatLook; mood: "happy" | "calm" }) {
  const c = CAT[look];
  const dark = look === "black" || look === "violet";
  const line = dark ? "#ffffff" : INK;
  const outline = look === "white" ? { stroke: "#1a223322", strokeWidth: 1.2 } : {};
  const openEyes = Boolean(c.eye) && mood === "calm";
  return (
    <g>
      <path d="M36 56 L40 22 L58 40 Z" fill={c.body} {...outline} />
      <path d="M84 56 L80 22 L62 40 Z" fill={c.body} {...outline} />
      <path d="M40.5 44 L42.5 29 L51 38 Z" fill={c.inner} />
      <path d="M79.5 44 L77.5 29 L69 38 Z" fill={c.inner} />
      <path d="M36 121 V54 Q36 38 52 38 H68 Q84 38 84 54 V121 Z" fill={c.body} {...outline} />
      {c.stripes && (
        <g fill={c.stripes}>
          <rect x="36" y="80" width="10" height="4" rx="2" /><rect x="36" y="89" width="8" height="4" rx="2" />
          <rect x="74" y="80" width="10" height="4" rx="2" /><rect x="76" y="89" width="8" height="4" rx="2" />
          <rect x="55" y="40" width="10" height="3.5" rx="1.75" />
        </g>
      )}
      {openEyes || look === "black" ? (
        <g>
          <ellipse cx="50" cy="60" rx="4" ry="4.4" fill={c.eye ?? "#f6b21b"} /><ellipse cx="50" cy="60" rx="1.5" ry="3.2" fill={INK} />
          <ellipse cx="70" cy="60" rx="4" ry="4.4" fill={c.eye ?? "#f6b21b"} /><ellipse cx="70" cy="60" rx="1.5" ry="3.2" fill={INK} />
        </g>
      ) : (
        <g stroke={line} strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M45 60 Q50 55 55 60" /><path d="M65 60 Q70 55 75 60" />
        </g>
      )}
      <path d="M56.5 66.5 H63.5 L60 70.5 Z" fill={dark ? "#f7c6d6" : "#e58aa8"} />
      <path d="M60 70.5 V72.5 M60 72.5 Q56.5 76 53 73.5 M60 72.5 Q63.5 76 67 73.5" stroke={line} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g stroke={dark ? "#ffffff99" : "#1a223355"} strokeWidth="1.6" strokeLinecap="round">
        <path d="M27 66 H44" /><path d="M28 72 H44" /><path d="M76 66 H93" /><path d="M76 72 H92" />
      </g>
      <ellipse cx="49" cy="119" rx="7.5" ry="4.2" fill={dark ? "#3a3f4b" : "#fff8e6"} />
      <ellipse cx="71" cy="119" rx="7.5" ry="4.2" fill={dark ? "#3a3f4b" : "#fff8e6"} />
    </g>
  );
}
