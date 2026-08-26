"use client";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starShadows(count: number, seed: number, spread = 2000) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const x = Math.floor(rand() * spread);
    const y = Math.floor(rand() * spread);
    return `${x}px ${y}px #ffe4c8`;
  }).join(",");
}

const SMALL = starShadows(700, 1);
const MEDIUM = starShadows(200, 2);
const BIG = starShadows(100, 3);

export function Starfield() {
  return (
    <div className="globe-starfield" aria-hidden="true">
      <div className="globe-stars globe-stars--sm" style={{ boxShadow: SMALL }} />
      <div className="globe-stars globe-stars--md" style={{ boxShadow: MEDIUM }} />
      <div className="globe-stars globe-stars--lg" style={{ boxShadow: BIG }} />
    </div>
  );
}
