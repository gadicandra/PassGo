// Tepi kertas sobek untuk hero tiket, mengikuti teknik skill paper-cinder-transition (Meng To):
// tepi = noise lebar + noise halus di sepanjang garis (bukan gerigi seragam), dan setiap acara
// punya silhouette sendiri lewat seed, supaya dua robekan tidak pernah sama.

/** Tinggi hero desktop (md:h-[440px]); titik tepi dihitung dalam piksel sepanjang tinggi ini. */
export const TEAR_HEIGHT = 440;
/** Lebar maksimum sobekan masuk ke badan tiket. Sobekan menimpa badan selebar ini. */
export const TEAR_DEPTH = 14;
/** Tebal serat putih kertas yang terlihat di tepi setelah robek. */
const FIBER = 3;
const STEP = 5;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}

/** Value noise 1D yang dihaluskan (smoothstep), deterministik per seed. */
function valueNoise(seed: number) {
  const lattice = (i: number) => {
    const x = Math.imul(seed ^ Math.imul(i, 374761393), 668265263) >>> 0;
    return ((x ^ (x >>> 13)) % 1000) / 1000;
  };
  return (t: number) => {
    const i = Math.floor(t);
    const f = t - i;
    const s = f * f * (3 - 2 * f);
    return lattice(i) * (1 - s) + lattice(i + 1) * s;
  };
}

export interface TornEdge {
  /** clip-path badan tiket (tepi kanan bergerigi). */
  body: string;
  /** clip-path sobekan (tepi kiri bergerigi, pas dengan badan). */
  stub: string;
  /** Pita serat putih di tepi badan dan di tepi sobekan. */
  bodyFiber: string;
  stubFiber: string;
}

export function tornEdge(id: string): TornEdge {
  const seed = hash(id);
  const broad = valueNoise(seed);
  const fine = valueNoise(seed ^ 0x9e3779b9);

  // Kedalaman sobekan di tiap titik y: lekukan lebar 8px + serat halus 3px, dijaga 1..TEAR_DEPTH-FIBER.
  const ys: number[] = [];
  for (let y = 0; y <= TEAR_HEIGHT; y += STEP) ys.push(y);
  if (ys[ys.length - 1] !== TEAR_HEIGHT) ys.push(TEAR_HEIGHT);
  const depth = ys.map((y) => {
    const d = 2 + 8 * broad(y * 0.045) + 3 * fine(y * 0.22);
    return Math.min(TEAR_DEPTH - FIBER, Math.max(1, d));
  });

  // Badan: tepi kanan di (100% - d). Sobekan dimulai TEAR_DEPTH sebelum ujung badan, jadi tepinya di (TEAR_DEPTH - d).
  const bodyEdge = ys.map((y, i) => `calc(100% - ${depth[i].toFixed(1)}px) ${y}px`);
  const stubEdge = ys.map((y, i) => `${(TEAR_DEPTH - depth[i]).toFixed(1)}px ${y}px`);

  const bodyFiberIn = ys.map((y, i) => `calc(100% - ${(depth[i] + FIBER).toFixed(1)}px) ${y}px`);
  const stubFiberIn = ys.map((y, i) => `${(TEAR_DEPTH - depth[i] + FIBER).toFixed(1)}px ${y}px`);

  return {
    body: `polygon(0 0, ${bodyEdge.join(", ")}, 0 100%)`,
    stub: `polygon(${stubEdge.join(", ")}, 100% 100%, 100% 0)`,
    bodyFiber: `polygon(${bodyEdge.join(", ")}, ${[...bodyFiberIn].reverse().join(", ")})`,
    stubFiber: `polygon(${stubEdge.join(", ")}, ${[...stubFiberIn].reverse().join(", ")})`,
  };
}
