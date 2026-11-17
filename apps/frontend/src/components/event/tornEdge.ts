// Tepi kertas sobek untuk hero tiket. Tiket asli sobek mengikuti garis perforasi: hampir lurus,
// ada lekuk kecil di tiap lubang, plus serat halus yang tidak beraturan. Jadi tepi = lekuk perforasi
// + noise lebar tipis + noise halus, per acara beda lewat seed (tidak ada dua robekan yang sama).

/** Tinggi hero desktop (md:h-[440px]); titik tepi dihitung dalam piksel sepanjang tinggi ini. */
export const TEAR_HEIGHT = 440;
/** Lebar maksimum sobekan masuk ke badan tiket. Sobekan menimpa badan selebar ini. */
export const TEAR_DEPTH = 14;
/** Tebal serat putih kertas yang terlihat di tepi setelah robek. */
const FIBER = 2;
/** Jarak antar lubang perforasi di sepanjang garis sobek. */
export const HOLE_GAP = 14;
const STEP = 2;

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

  // Kedalaman sobekan di tiap titik y: dasar 5px, lekuk 2px di tiap lubang perforasi, gelombang lebar 2,5px,
  // serat halus 1,2px. Cukup tidak beraturan supaya terlihat kertas, tapi tetap rapi mengikuti garis.
  const ys: number[] = [];
  for (let y = 0; y <= TEAR_HEIGHT; y += STEP) ys.push(y);
  if (ys[ys.length - 1] !== TEAR_HEIGHT) ys.push(TEAR_HEIGHT);
  const depth = ys.map((y) => {
    const hole = Math.abs(((y + HOLE_GAP / 2) % HOLE_GAP) - HOLE_GAP / 2);
    const scallop = hole < 4 ? 2 * Math.cos((hole / 4) * (Math.PI / 2)) : 0;
    const d = 5 + scallop + 2.5 * broad(y * 0.03) + 1.2 * fine(y * 0.35);
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
