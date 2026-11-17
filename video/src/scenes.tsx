import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { about, architecture, background, intro, links, phone, team, tech, type Flow, type FlowNode, type Shot } from "./content";
import { color, font } from "./theme";

/*
  Bahasa visual: tiket kertas PassGo. Kertas krem + tinta navy untuk isi, navy penuh hanya untuk
  pembuka, pembatas bab, dan penutup. Tanpa label kecil berhuruf kapital dan tanpa kartu seragam:
  posisi di presentasi ditunjukkan bilah bagian di bawah (lihat SectionBar), hierarki dari ukuran huruf
  dan garis tipis. Gerak hanya untuk menjelaskan: teks muncul per baris, garis dan panah tergambar
  mengikuti alur, kamera mendekat ke bagian layar yang sedang dibahas.
*/

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Baris teks yang naik dari balik garis tak terlihat. */
function Reveal({ at = 0, children, style }: { at?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at, at + 18], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${(1 - progress) * 105}%)`, opacity: progress > 0 ? 1 : 0 }}>{children}</div>
    </div>
  );
}

/** Garis tipis yang tergambar dari kiri. */
function Rule({ at = 0, tone = "rgba(20,33,61,0.18)" }: { at?: number; tone?: string }) {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [at, at + 24], [0, 100], { ...clamp, easing: ease });
  return <div style={{ height: 2, backgroundColor: tone, width: `${width}%` }} />;
}

const paper: CSSProperties = { backgroundColor: color.cream, color: color.navy, fontFamily: font.sans };
const ink: CSSProperties = { backgroundColor: color.navy, color: color.cream, fontFamily: font.sans };
const display = (size: number): CSSProperties => ({ fontFamily: font.display, fontSize: size, lineHeight: 0.95, letterSpacing: -size * 0.03, margin: 0 });
const softInk = "rgba(20,33,61,0.75)";
/** Ruang bawah yang dipakai SectionBar. */
export const BAR_H = 64;
const page: CSSProperties = { ...paper, padding: `100px 120px ${BAR_H + 40}px` };

function Wordmark({ size = 96 }: { size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        backgroundColor: color.brand,
        color: color.cream,
        fontFamily: font.display,
        fontSize: size,
        letterSpacing: -size * 0.02,
        padding: `${size * 0.1}px ${size * 0.42}px ${size * 0.1}px ${size * 0.22}px`,
        borderRadius: size * 0.08,
        // Takik setengah lingkaran di kanan, sama dengan logo di aplikasi.
        maskImage: `radial-gradient(circle at 100% 50%, transparent ${size * 0.17}px, #000 ${size * 0.17 + 1}px)`,
      }}
    >
      PASSGO
    </div>
  );
}

/** Judul adegan isi: ukuran dan posisi sama di semua adegan. */
function Title({ children, at = 0 }: { children: ReactNode; at?: number }) {
  return (
    <Reveal at={at}>
      <h1 style={display(96)}>{children}</h1>
    </Reveal>
  );
}

/* ---------- Bilah bagian di bawah (sama dengan navigasi di PPT) ---------- */

export const SECTIONS = ["Pengenalan", "Tim", "Teknologi", "Alur", "Demo"] as const;
export type Section = (typeof SECTIONS)[number];

export function SectionBar({ current, dark }: { current: Section; dark?: boolean }) {
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div
        style={{
          height: BAR_H,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 120px",
          backgroundColor: dark ? "rgba(20,33,61,0.96)" : "rgba(255,248,240,0.96)",
          borderTop: `1px solid ${dark ? "rgba(255,248,240,0.12)" : "rgba(20,33,61,0.12)"}`,
          fontFamily: font.sans,
        }}
      >
        <div style={{ fontFamily: font.display, fontSize: 22, color: color.brand, marginRight: 40 }}>PASSGO</div>
        {SECTIONS.map((name) => {
          const on = name === current;
          return (
            <div
              key={name}
              style={{
                fontSize: 21,
                fontWeight: on ? 700 : 500,
                padding: "8px 22px",
                borderRadius: 999,
                backgroundColor: on ? (dark ? color.cream : color.navy) : "transparent",
                color: on ? (dark ? color.navy : color.cream) : dark ? "rgba(255,248,240,0.6)" : "rgba(20,33,61,0.55)",
              }}
            >
              {name}
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", fontSize: 19, color: dark ? "rgba(255,248,240,0.55)" : "rgba(20,33,61,0.5)" }}>Kelompok 10</div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pembuka: judul di kiri, beranda asli di HP di kanan ---------- */

export function Intro() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [8, 60], [140, 0], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ ...ink, padding: "0 160px", justifyContent: "center" }}>
      <div style={{ width: 1000 }}>
        <Reveal>
          <Wordmark size={150} />
        </Reveal>
        <Reveal at={16} style={{ marginTop: 60 }}>
          <p style={{ fontSize: 56, fontWeight: 600, margin: 0, lineHeight: 1.15 }}>{intro.subtitle}</p>
        </Reveal>
        <Reveal at={26} style={{ marginTop: 22 }}>
          <p style={{ fontSize: 28, color: "rgba(255,248,240,0.6)", margin: 0, whiteSpace: "pre-line", lineHeight: 1.4 }}>{intro.meta}</p>
        </Reveal>
      </div>
      <Img
        src={staticFile("shots/p-beranda.png")}
        style={{ position: "absolute", right: 200, top: 120, height: 860, transform: `translateY(${rise}px)`, opacity: interpolate(frame, [8, 30], [0, 1], clamp) }}
      />
    </AbsoluteFill>
  );
}

/* ---------- Latar Belakang: foto penuh di kiri, tiga masalah dipisah garis di kanan ---------- */

export function Background() {
  return (
    <AbsoluteFill style={{ ...paper, flexDirection: "row" }}>
      <div style={{ width: "40%", overflow: "hidden" }}>
        <Img src={staticFile("photos/pasar-2.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ flex: 1, padding: `110px 120px ${BAR_H + 40}px 110px` }}>
        <Title>{background.title}</Title>
        <Reveal at={10}>
          <p style={{ fontSize: 34, lineHeight: 1.45, color: softInk, margin: "28px 0 50px", maxWidth: 900 }}>{background.lead}</p>
        </Reveal>
        {background.points.map((point, index) => (
          <div key={point.title}>
            <Rule at={22 + index * 14} />
            <div style={{ display: "flex", gap: 40, padding: "30px 0" }}>
              <Reveal at={26 + index * 14} style={{ width: 340, flexShrink: 0 }}>
                <p style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{point.title}</p>
              </Reveal>
              <Reveal at={30 + index * 14}>
                <p style={{ fontSize: 29, lineHeight: 1.45, color: softInk, margin: 0 }}>{point.body}</p>
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pengenalan: pernyataan + produk asli yang keluar dari tepi ---------- */

export function About() {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [10, 50], [120, 0], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={paper}>
      <div style={{ position: "absolute", left: 120, top: 100, width: 760 }}>
        <Title>{about.title}</Title>
        <Reveal at={10}>
          <p style={{ fontSize: 33, lineHeight: 1.45, color: softInk, margin: "30px 0 44px" }}>{about.lead}</p>
        </Reveal>
        {about.points.map((point, index) => (
          <div key={point.title}>
            <Rule at={22 + index * 10} />
            <Reveal at={26 + index * 10} style={{ padding: "22px 0" }}>
              <p style={{ fontSize: 28, margin: 0, lineHeight: 1.4 }}>
                <b>{point.title}.</b> <span style={{ color: softInk }}>{point.body}</span>
              </p>
            </Reveal>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 140,
          width: 1220,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(20,33,61,0.25)",
          transform: `translateX(${slide}px)`,
          opacity: interpolate(frame, [10, 30], [0, 1], clamp),
        }}
      >
        <Img src={staticFile("shots/01-beranda.png")} style={{ width: "100%" }} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pembagian tugas: empat kolom dipisah garis tegak ---------- */

export function Team() {
  return (
    <AbsoluteFill style={page}>
      <Title>Pembagian Tugas</Title>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 70 }}>
        {team.map((member, index) => (
          <div key={member.name} style={{ borderLeft: index === 0 ? "none" : "2px solid rgba(20,33,61,0.15)", padding: index === 0 ? "0 44px 0 0" : "0 44px" }}>
            <Reveal at={12 + index * 8}>
              <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.12, margin: 0 }}>{member.name}</p>
            </Reveal>
            <Reveal at={16 + index * 8} style={{ marginTop: 12 }}>
              <p style={{ fontSize: 24, color: "rgba(20,33,61,0.6)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{member.nim}</p>
            </Reveal>
            <div style={{ marginTop: 36 }}>
              {member.tasks.map((task, taskIndex) => (
                <Reveal key={task} at={26 + index * 8 + taskIndex * 4}>
                  <p style={{ fontSize: 27, lineHeight: 1.35, margin: "0 0 18px", color: "rgba(20,33,61,0.85)" }}>{task}</p>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Teknologi: lembar spesifikasi ---------- */

export function Tech() {
  return (
    <AbsoluteFill style={{ ...page, flexDirection: "row", gap: 120 }}>
      <div style={{ width: 560 }}>
        <Title>Teknologi yang</Title>
        <Title at={6}>Digunakan</Title>
      </div>
      <div style={{ flex: 1, paddingTop: 20 }}>
        {tech.map((row, index) => (
          <div key={row.group}>
            <Rule at={16 + index * 12} />
            <div style={{ display: "flex", padding: "36px 0" }}>
              <Reveal at={20 + index * 12} style={{ width: 340, flexShrink: 0 }}>
                <p style={{ fontSize: 30, fontWeight: 700, color: color.brand, margin: 0 }}>{row.group}</p>
              </Reveal>
              <Reveal at={24 + index * 12}>
                <div style={{ display: "flex", flexWrap: "wrap", columnGap: 44, rowGap: 10, fontSize: 36, fontWeight: 600, lineHeight: 1.35 }}>{row.items.map((item) => <span key={item}>{item}</span>)}</div>
              </Reveal>
            </div>
          </div>
        ))}
        <Rule at={66} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Arsitektur: rantai utama, lalu bus ortogonal ke layanan pihak ketiga ---------- */

export function Architecture() {
  const frame = useCurrentFrame();
  const { nodes, services } = architecture;
  const chain = [nodes.client, nodes.frontend, nodes.backend, nodes.database];
  const grow = (at: number) => interpolate(frame, [at, at + 20], [0, 1], { ...clamp, easing: ease });
  // Koordinat dalam kanvas 1680 x 560 (dimulai di bawah judul).
  const boxW = 330, gap = (1680 - 4 * boxW) / 3, rowY = 20, boxH = 150;
  const xs = chain.map((_, i) => i * (boxW + gap));
  const backendX = xs[2] + boxW / 2;
  const busY = 290, svcY = 350, svcW = 300, svcGap = (1680 - 4 * svcW) / 3;
  return (
    <AbsoluteFill style={page}>
      <Title>{architecture.title}</Title>
      <Reveal at={8}>
        <p style={{ fontSize: 30, lineHeight: 1.45, color: softInk, margin: "24px 0 0", maxWidth: 1400 }}>{architecture.lead}</p>
      </Reveal>
      <div style={{ position: "relative", width: 1680, height: 560, marginTop: 50 }}>
        <svg width={1680} height={560} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={color.navy} />
            </marker>
          </defs>
          {xs.slice(0, 3).map((x, i) => {
            const x1 = x + boxW, x2 = xs[i + 1], y = rowY + boxH / 2, p = grow(30 + i * 12);
            return <line key={i} x1={x1 + 6} y1={y} x2={x1 + 6 + (x2 - x1 - 12) * p} y2={y} stroke={color.navy} strokeWidth={3} markerEnd={p > 0.95 ? "url(#arr)" : undefined} />;
          })}
          {/* bus: turun dari backend, melebar, lalu cabang ke tiap layanan */}
          <line x1={backendX} y1={rowY + boxH} x2={backendX} y2={rowY + boxH + (busY - rowY - boxH) * grow(70)} stroke={color.navy} strokeWidth={3} />
          <line x1={svcW / 2 + (backendX - svcW / 2) * (1 - grow(82))} y1={busY} x2={backendX + (3 * (svcW + svcGap) + svcW / 2 - backendX) * grow(82)} y2={busY} stroke={color.navy} strokeWidth={3} />
          {services.map((_, i) => {
            const x = i * (svcW + svcGap) + svcW / 2, p = grow(96 + i * 4);
            return <line key={i} x1={x} y1={busY} x2={x} y2={busY + (svcY - busY - 6) * p} stroke={color.navy} strokeWidth={3} markerEnd={p > 0.95 ? "url(#arr)" : undefined} />;
          })}
        </svg>
        {chain.map((node, i) => {
          const dark = i === 1 || i === 2;
          return (
            <div key={node.title} style={{ position: "absolute", left: xs[i], top: rowY, width: boxW, height: boxH, opacity: grow(16 + i * 12) }}>
              <div style={{ height: "100%", borderRadius: 16, border: `3px solid ${color.navy}`, backgroundColor: dark ? color.navy : color.cream, color: dark ? color.cream : color.navy, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <p style={{ fontSize: 38, fontWeight: 700, margin: 0 }}>{node.title}</p>
                <p style={{ fontSize: 24, margin: "8px 0 0", opacity: 0.75 }}>{node.body}</p>
              </div>
            </div>
          );
        })}
        {services.map((service, i) => {
          const [name, ...rest] = service.split(": ");
          return (
            <div key={service} style={{ position: "absolute", left: i * (svcW + svcGap), top: svcY, width: svcW, height: 130, opacity: grow(100 + i * 4), borderRadius: 14, border: "2px solid rgba(20,33,61,0.25)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 16px" }}>
              <p style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>{name}</p>
              <p style={{ fontSize: 22, margin: "6px 0 0", color: softInk }}>{rest.join(": ")}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Flowchart bernotasi standar, tergambar mengikuti alur ---------- */

const COL_W = 280, ROW_Y = [70, 270, 470];
const SIZE: Record<FlowNode["kind"], [number, number]> = { start: [220, 70], end: [230, 80], proc: [230, 100], dec: [240, 150], io: [240, 100] };
const TONE = { ok: [color.teal, color.cream], warn: ["#FDF1D8", "#8A5A00"], bad: ["#FBE4E2", "#B42318"] } as const;

function anchor(node: FlowNode, side: "l" | "r" | "t" | "b") {
  const [w, h] = SIZE[node.kind];
  const cx = node.c * COL_W + COL_W / 2, cy = ROW_Y[node.r];
  return { l: [cx - w / 2, cy], r: [cx + w / 2, cy], t: [cx, cy - h / 2], b: [cx, cy + h / 2] }[side] as [number, number];
}

export function FlowScene({ flow }: { flow: Flow }) {
  const frame = useCurrentFrame();
  // Urutan muncul = urutan BFS dari "start": simbol tampil, lalu panah keluar tergambar.
  const order: string[] = ["start"];
  for (let i = 0; i < order.length; i++) for (const e of flow.edges) if (e.from === order[i] && !order.includes(e.to)) order.push(e.to);
  const appear = (id: string) => 24 + order.indexOf(id) * 9;
  const byId = Object.fromEntries(flow.nodes.map((n) => [n.id, n]));
  const shown = (id: string) => interpolate(frame, [appear(id), appear(id) + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={page}>
      <Title>{flow.title}</Title>
      <Reveal at={8}>
        <p style={{ fontSize: 28, lineHeight: 1.45, color: softInk, margin: "22px 0 0", maxWidth: 1450 }}>{flow.caption}</p>
      </Reveal>
      <div style={{ position: "relative", width: 1680, height: 560, marginTop: 40 }}>
        <svg width={1680} height={560} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#455566" />
            </marker>
          </defs>
          {flow.edges.map((e) => {
            const a = byId[e.from], b = byId[e.to];
            const vertical = a.c === b.c;
            const [x1, y1] = anchor(a, vertical ? (b.r > a.r ? "b" : "t") : "r");
            const [x2, y2] = anchor(b, vertical ? (b.r > a.r ? "t" : "b") : "l");
            const p = interpolate(frame, [appear(e.from) + 8, appear(e.from) + 16], [0, 1], { ...clamp, easing: ease });
            const tone = e.label === "Tidak" ? (b.tone === "warn" ? "#8A5A00" : "#B42318") : e.label === "Ya" ? color.teal : "#455566";
            return (
              <g key={e.from + e.to} opacity={p > 0 ? 1 : 0}>
                <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke="#455566" strokeWidth={2.5} markerEnd={p > 0.95 ? "url(#fa)" : undefined} />
                {e.label && (
                  <text x={vertical ? x1 + 12 : (x1 + x2) / 2} y={vertical ? (y1 + y2) / 2 + 8 : y1 - 12} fill={tone} fontSize={22} fontWeight={700} fontFamily={font.sans} textAnchor={vertical ? "start" : "middle"} opacity={p}>
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {flow.nodes.map((n) => {
            const [w, h] = SIZE[n.kind];
            const cx = n.c * COL_W + COL_W / 2, cy = ROW_Y[n.r];
            const [fill, , stroke] = n.kind === "start" ? [color.navy, color.cream, "none"] : n.tone ? [TONE[n.tone][0], TONE[n.tone][1], "none"] : [color.cream, color.navy, color.navy];
            const common = { fill, stroke, strokeWidth: 2.5, opacity: shown(n.id) };
            if (n.kind === "dec") return <polygon key={n.id} points={`${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`} {...common} />;
            if (n.kind === "io") return <polygon key={n.id} points={`${cx - w / 2 + 24},${cy - h / 2} ${cx + w / 2},${cy - h / 2} ${cx + w / 2 - 24},${cy + h / 2} ${cx - w / 2},${cy + h / 2}`} {...common} />;
            return <rect key={n.id} x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={n.kind === "proc" ? 6 : h / 2} {...common} />;
          })}
        </svg>
        {flow.nodes.map((n) => {
          const [w, h] = SIZE[n.kind];
          const cx = n.c * COL_W + COL_W / 2, cy = ROW_Y[n.r];
          const fg = n.kind === "start" ? color.cream : n.tone ? TONE[n.tone][1] : color.navy;
          const inset = n.kind === "dec" ? 50 : n.kind === "io" ? 34 : 14;
          return (
            <div key={n.id} style={{ position: "absolute", left: cx - w / 2 + inset, top: cy - h / 2, width: w - 2 * inset, height: h, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: fg, fontSize: n.kind === "dec" ? 21 : 22, fontWeight: n.kind === "proc" || n.kind === "io" ? 500 : 700, lineHeight: 1.2, opacity: shown(n.id) }}>
              {n.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pembatas bab demo ---------- */

export function DemoTitle({ chapter, subtitle }: { chapter: string; subtitle: string }) {
  return (
    <AbsoluteFill style={{ ...ink, padding: "0 160px", justifyContent: "center" }}>
      <Reveal>
        <p style={{ fontSize: 34, color: color.sun, margin: 0, fontWeight: 600 }}>Demo aplikasi</p>
      </Reveal>
      <Reveal at={6} style={{ marginTop: 24 }}>
        <h1 style={{ ...display(220), color: color.cream }}>{chapter}</h1>
      </Reveal>
      <Reveal at={14} style={{ marginTop: 40 }}>
        <p style={{ fontSize: 40, color: "rgba(255,248,240,0.75)", margin: 0 }}>{subtitle}</p>
      </Reveal>
    </AbsoluteFill>
  );
}

/* ---------- Layar demo: produk memenuhi layar, kamera mendorong ke bagian yang dijelaskan ---------- */

export function DemoShot({ shot }: { shot: Shot }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [fx, fy] = shot.focus;
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.3], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: color.cream, overflow: "hidden" }}>
      {/* Gambar dan kursor dalam satu lapisan, jadi kursor ikut terbawa zoom kamera. */}
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}>
        <Img src={staticFile(`shots/${shot.file}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <Cursor x={fx} y={fy} />
      </AbsoluteFill>
      {/* Keterangan bawah (lower third) di atas bilah bagian. */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ background: "linear-gradient(0deg, rgba(20,33,61,0.97) 0%, rgba(20,33,61,0.9) 70%, rgba(20,33,61,0) 100%)", padding: `110px 120px ${BAR_H + 44}px`, fontFamily: font.sans, color: color.cream }}>
          <Reveal at={8}>
            <h2 style={{ ...display(72), color: color.cream }}>{shot.title}</h2>
          </Reveal>
          <Reveal at={14} style={{ marginTop: 16 }}>
            <p style={{ fontSize: 31, lineHeight: 1.4, color: "rgba(255,248,240,0.85)", margin: 0, maxWidth: 1400 }}>{shot.body}</p>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/**
 * Kursor yang dinaskahkan per frame: bergerak dari kanan bawah ke titik fokus, lalu mengeklik
 * (kursor mengecil sesaat dan lingkaran klik melebar). Posisi dalam persen layar.
 */
function Cursor({ x, y }: { x: number; y: number }) {
  const frame = useCurrentFrame();
  const move = interpolate(frame, [18, 58], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const cx = x + 14 * (1 - move), cy = y + 16 * (1 - move);
  const press = interpolate(frame, [62, 66, 72], [1, 0.82, 1], clamp);
  const ring = interpolate(frame, [64, 86], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, opacity: interpolate(frame, [12, 20], [0, 1], clamp) }}>
      {ring > 0 && ring < 1 && (
        <div style={{ position: "absolute", left: -40 * ring, top: -40 * ring, width: 80 * ring, height: 80 * ring, borderRadius: "50%", border: `4px solid ${color.brand}`, opacity: 1 - ring }} />
      )}
      <svg width={34} height={46} viewBox="0 0 17 23" style={{ transform: `scale(${press})`, transformOrigin: "0 0", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}>
        <path d="M1 1 L1 18 L5.5 13.8 L8.6 21 L11.6 19.7 L8.6 12.7 L14.5 12.7 Z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------- Tampilan seluler ---------- */

export function PhoneShots() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...paper, flexDirection: "row", alignItems: "center", padding: `0 120px ${BAR_H}px`, gap: 100 }}>
      <div style={{ width: 640 }}>
        <Title>{phone.title}</Title>
        <Reveal at={10}>
          <p style={{ fontSize: 33, lineHeight: 1.45, color: softInk, margin: "30px 0 0" }}>{phone.body}</p>
        </Reveal>
      </div>
      <div style={{ display: "flex", gap: 56, alignItems: "flex-start" }}>
        {phone.files.map((file, index) => {
          const rise = interpolate(frame, [10 + index * 8, 40 + index * 8], [160, index * 50], { ...clamp, easing: ease });
          return (
            <div key={file} style={{ width: 380, borderRadius: 54, padding: 12, backgroundColor: color.navy, boxShadow: "0 30px 70px rgba(20,33,61,0.3)", transform: `translateY(${rise}px)` }}>
              <div style={{ borderRadius: 42, overflow: "hidden", aspectRatio: "390 / 844" }}>
                <Img src={staticFile(`shots/${file}.png`)} style={{ width: "100%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Penutup ---------- */

export function Outro() {
  return (
    <AbsoluteFill style={{ ...ink, padding: "0 160px", justifyContent: "center" }}>
      <Reveal>
        <Wordmark size={110} />
      </Reveal>
      <Reveal at={10} style={{ marginTop: 56 }}>
        <h1 style={{ ...display(180), color: color.cream }}>Terima Kasih</h1>
      </Reveal>
      <Reveal at={22} style={{ marginTop: 56 }}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.7)", margin: 0 }}>
          Aplikasi web <b style={{ color: color.cream }}>{links.web}</b>
        </p>
      </Reveal>
      <Reveal at={28} style={{ marginTop: 12 }}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.7)", margin: 0 }}>
          Repositori <b style={{ color: color.cream }}>{links.repo}</b>
        </p>
      </Reveal>
    </AbsoluteFill>
  );
}
