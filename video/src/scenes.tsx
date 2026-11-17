import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { about, architecture, background, intro, links, phone, security, team, tech, type Shot } from "./content";
import { color, font } from "./theme";

/*
  Bahasa visual: tiket kertas PassGo. Kertas krem + tinta navy untuk isi, navy penuh hanya untuk
  pembuka, pembatas bab, dan penutup. Tanpa kartu seragam dan cahaya dekoratif: hierarki dibangun
  dari ukuran huruf, garis tipis, dan foto/produk asli. Gerak: teks muncul per baris dari balik
  garis (reveal), kamera mendorong ke bagian layar yang sedang dijelaskan.
*/

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Baris teks yang "naik" dari balik garis tak terlihat (reveal editorial). */
function Reveal({ at = 0, children, style }: { at?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at, at + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${(1 - progress) * 105}%)`, opacity: progress > 0 ? 1 : 0 }}>{children}</div>
    </div>
  );
}

/** Garis tipis yang tergambar dari kiri. */
function Rule({ at = 0, tone = "rgba(20,33,61,0.18)", style }: { at?: number; tone?: string; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [at, at + 24], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return <div style={{ height: 2, backgroundColor: tone, width: `${width}%`, ...style }} />;
}

/** Garis perforasi tiket (titik-titik) yang tergambar, motif merek PassGo. */
function Perforation({ at = 0, tone = color.brand }: { at?: number; tone?: string }) {
  const frame = useCurrentFrame();
  const size = interpolate(frame, [at, at + 30], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return <div style={{ backgroundImage: `radial-gradient(circle, ${tone} 3px, transparent 3.5px)`, backgroundSize: "18px 8px", height: 8, width: `${size}%` }} />;
}

const paper: CSSProperties = { backgroundColor: color.cream, color: color.navy, fontFamily: font.sans };
const ink: CSSProperties = { backgroundColor: color.navy, color: color.cream, fontFamily: font.sans };
const display = (size: number): CSSProperties => ({ fontFamily: font.display, fontSize: size, lineHeight: 0.95, letterSpacing: -size * 0.03, margin: 0 });
const label: CSSProperties = { fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: 0 };
const softInk = "rgba(20,33,61,0.75)";

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

/* ---------- Pembuka: potongan foto acara + kata kinetik, lalu logo ---------- */

export function Intro() {
  const { fps } = useVideoConfig();
  const beat = Math.round(fps * 0.75);
  const logoAt = beat * intro.words.length;
  return (
    <AbsoluteFill style={ink}>
      {intro.words.map((word, index) => (
        <Sequence key={word} from={index * beat} durationInFrames={beat} layout="none">
          <MontageFrame photo={intro.photos[index]} word={word} />
        </Sequence>
      ))}
      <Sequence from={logoAt} layout="none">
        <AbsoluteFill style={{ ...ink, padding: "0 160px", justifyContent: "center" }}>
          <Reveal>
            <Wordmark size={170} />
          </Reveal>
          <div style={{ width: 900, margin: "56px 0 40px" }}>
            <Perforation at={10} />
          </div>
          <Reveal at={18}>
            <p style={{ fontSize: 52, fontWeight: 600, margin: 0 }}>{intro.subtitle}</p>
          </Reveal>
          <Reveal at={28}>
            <p style={{ fontSize: 28, color: "rgba(255,248,240,0.6)", margin: "14px 0 0" }}>{intro.meta}</p>
          </Reveal>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}

function MontageFrame({ photo, word }: { photo: string; word: string }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Img
        src={staticFile(`photos/${photo}.webp`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(frame, [0, 23], [1.12, 1.04])})` }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(20,33,61,0.85), rgba(20,33,61,0.1) 70%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 160px 140px" }}>
        <Reveal>
          <p style={{ ...display(200), color: color.cream }}>{word}</p>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- Latar Belakang: foto penuh di kiri, tiga masalah dipisah garis di kanan ---------- */

export function Background() {
  return (
    <AbsoluteFill style={{ ...paper, flexDirection: "row" }}>
      <div style={{ width: "42%", position: "relative", overflow: "hidden" }}>
        <Img src={staticFile("photos/pasar-2.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 60, bottom: 60, right: 60 }}>
          <Reveal>
            <p style={{ ...label, color: color.cream }}>01 Latar belakang</p>
          </Reveal>
        </div>
      </div>
      <div style={{ flex: 1, padding: "110px 120px 0 110px" }}>
        <Reveal at={6}>
          <h1 style={display(92)}>{background.title}</h1>
        </Reveal>
        <Reveal at={14}>
          <p style={{ fontSize: 34, lineHeight: 1.45, color: softInk, margin: "28px 0 50px", maxWidth: 900 }}>{background.lead}</p>
        </Reveal>
        {background.points.map((point, index) => (
          <div key={point.title}>
            <Rule at={26 + index * 14} />
            <div style={{ display: "flex", gap: 40, padding: "30px 0" }}>
              <Reveal at={30 + index * 14} style={{ width: 340, flexShrink: 0 }}>
                <p style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{point.title}</p>
              </Reveal>
              <Reveal at={34 + index * 14}>
                <p style={{ fontSize: 29, lineHeight: 1.45, color: softInk, margin: 0 }}>{point.body}</p>
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pengenalan: pernyataan besar + produk asli yang keluar dari tepi ---------- */

export function About() {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [10, 50], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const [first, ...rest] = about.title.split(" ");
  return (
    <AbsoluteFill style={paper}>
      <div style={{ position: "absolute", left: 120, top: 110, width: 760 }}>
        <Reveal>
          <p style={{ ...label, color: color.brand }}>02 Pengenalan</p>
        </Reveal>
        <Reveal at={8} style={{ marginTop: 30 }}>
          <h1 style={display(110)}>{first}</h1>
        </Reveal>
        <Reveal at={14}>
          <h1 style={display(110)}>{rest.join(" ")}</h1>
        </Reveal>
        <Reveal at={24}>
          <p style={{ fontSize: 33, lineHeight: 1.45, color: softInk, margin: "36px 0 46px" }}>{about.lead}</p>
        </Reveal>
        {about.points.map((point, index) => (
          <div key={point.title}>
            <Rule at={36 + index * 10} />
            <Reveal at={40 + index * 10} style={{ padding: "22px 0" }}>
              <p style={{ fontSize: 28, margin: 0, lineHeight: 1.4 }}>
                <b>{point.title}.</b> <span style={{ color: softInk }}>{point.body}</span>
              </p>
            </Reveal>
          </div>
        ))}
      </div>
      {/* Produk sungguhan sebagai bukti, sengaja terpotong tepi kanan seperti halaman dek profesional. */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 150,
          width: 1220,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(20,33,61,0.25)",
          transform: `translateX(${slide}px)`,
          opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Img src={staticFile("shots/01-beranda.png")} style={{ width: "100%" }} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pembagian tugas: empat kolom dipisah garis tegak, gaya halaman profil ---------- */

export function Team() {
  return (
    <AbsoluteFill style={{ ...paper, padding: "110px 120px" }}>
      <Reveal>
        <p style={{ ...label, color: color.brand }}>03 Tim</p>
      </Reveal>
      <Reveal at={6} style={{ marginTop: 26 }}>
        <h1 style={display(110)}>Pembagian Tugas</h1>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 80 }}>
        {team.map((member, index) => (
          <div key={member.name} style={{ borderLeft: index === 0 ? "none" : "2px solid rgba(20,33,61,0.15)", padding: index === 0 ? "0 44px 0 0" : "0 44px" }}>
            <Reveal at={18 + index * 8}>
              <p style={{ fontSize: 22, fontWeight: 700, color: color.brand, margin: 0 }}>{member.nim}</p>
            </Reveal>
            <Reveal at={22 + index * 8} style={{ marginTop: 16 }}>
              <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.12, margin: 0 }}>{member.name}</p>
            </Reveal>
            <div style={{ marginTop: 36 }}>
              {member.tasks.map((task, taskIndex) => (
                <Reveal key={task} at={32 + index * 8 + taskIndex * 4}>
                  <p style={{ fontSize: 27, lineHeight: 1.35, margin: "0 0 18px", color: "rgba(20,33,61,0.8)" }}>{task}</p>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Teknologi: lembar spesifikasi (label kiri, isi kanan, garis tipis) ---------- */

export function Tech() {
  return (
    <AbsoluteFill style={{ ...paper, padding: "110px 120px", flexDirection: "row", gap: 120 }}>
      <div style={{ width: 560 }}>
        <Reveal>
          <p style={{ ...label, color: color.brand }}>04 Teknologi</p>
        </Reveal>
        <Reveal at={6} style={{ marginTop: 26 }}>
          <h1 style={display(104)}>Teknologi yang</h1>
        </Reveal>
        <Reveal at={12}>
          <h1 style={display(104)}>Digunakan</h1>
        </Reveal>
      </div>
      <div style={{ flex: 1, paddingTop: 30 }}>
        {tech.map((row, index) => (
          <div key={row.group}>
            <Rule at={20 + index * 12} />
            <div style={{ display: "flex", padding: "38px 0" }}>
              <Reveal at={24 + index * 12} style={{ width: 320, flexShrink: 0 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: color.brand, margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>{row.group}</p>
              </Reveal>
              <Reveal at={28 + index * 12}>
                <p style={{ fontSize: 36, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>{row.items.join("  ·  ")}</p>
              </Reveal>
            </div>
          </div>
        ))}
        <Rule at={70} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Arsitektur: rantai datar di atas kertas, garis penghubung tergambar ---------- */

export function Architecture() {
  const { nodes, services } = architecture;
  const chain = [nodes.client, nodes.frontend, nodes.backend, nodes.database];
  return (
    <AbsoluteFill style={{ ...paper, padding: "110px 120px" }}>
      <Reveal>
        <p style={{ ...label, color: color.brand }}>05 Arsitektur</p>
      </Reveal>
      <Reveal at={6} style={{ marginTop: 26 }}>
        <h1 style={display(104)}>{architecture.title}</h1>
      </Reveal>
      <Reveal at={14}>
        <p style={{ fontSize: 32, lineHeight: 1.45, color: softInk, margin: "28px 0 0", maxWidth: 1350 }}>{architecture.lead}</p>
      </Reveal>
      <div style={{ display: "flex", alignItems: "flex-start", marginTop: 90 }}>
        {chain.map((node, index) => (
          <div key={node.title} style={{ display: "flex", alignItems: "flex-start", flex: index === chain.length - 1 ? "0 0 auto" : 1 }}>
            <div style={{ width: 300 }}>
              <Reveal at={24 + index * 14}>
                <p style={{ fontSize: 46, fontWeight: 700, margin: 0 }}>{node.title}</p>
              </Reveal>
              <Reveal at={28 + index * 14}>
                <p style={{ fontSize: 26, color: "rgba(20,33,61,0.7)", margin: "8px 0 0" }}>{node.body}</p>
              </Reveal>
            </div>
            {index < chain.length - 1 && (
              <div style={{ flex: 1, padding: "30px 30px 0" }}>
                <Rule at={34 + index * 14} tone={color.brand} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 110 }}>
        <Rule at={80} />
        <div style={{ display: "flex", gap: 60, paddingTop: 30 }}>
          <Reveal at={84} style={{ width: 300, flexShrink: 0 }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: color.brand, margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>Terhubung ke</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 60px", flex: 1 }}>
            {services.map((service, index) => (
              <Reveal key={service} at={88 + index * 4}>
                <p style={{ fontSize: 29, margin: 0 }}>{service}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Keamanan: dua kolom daftar bergaris, tanpa kartu ---------- */

export function Security() {
  return (
    <AbsoluteFill style={{ ...paper, padding: "110px 120px" }}>
      <Reveal>
        <p style={{ ...label, color: color.brand }}>06 Keamanan</p>
      </Reveal>
      <Reveal at={6} style={{ marginTop: 26 }}>
        <h1 style={display(104)}>{security.title}</h1>
      </Reveal>
      <Reveal at={14}>
        <p style={{ fontSize: 32, color: softInk, margin: "28px 0 60px" }}>{security.lead}</p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 100 }}>
        {security.points.map((point, index) => (
          <div key={point.title}>
            <Rule at={24 + index * 8} />
            <div style={{ padding: "28px 0 32px" }}>
              <Reveal at={28 + index * 8}>
                <p style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{point.title}</p>
              </Reveal>
              <Reveal at={32 + index * 8}>
                <p style={{ fontSize: 27, lineHeight: 1.45, color: softInk, margin: "10px 0 0" }}>{point.body}</p>
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Pembatas bab demo: navy penuh, judul besar, perforasi ---------- */

export function DemoTitle({ chapter, subtitle }: { chapter: string; subtitle: string }) {
  return (
    <AbsoluteFill style={{ ...ink, padding: "0 160px", justifyContent: "center" }}>
      <Reveal>
        <p style={{ ...label, color: color.sun }}>07 Demo aplikasi</p>
      </Reveal>
      <Reveal at={6} style={{ marginTop: 30 }}>
        <h1 style={{ ...display(220), color: color.cream }}>{chapter}</h1>
      </Reveal>
      <div style={{ width: 1100, margin: "50px 0 36px" }}>
        <Perforation at={12} />
      </div>
      <Reveal at={18}>
        <p style={{ fontSize: 40, color: "rgba(255,248,240,0.75)", margin: 0 }}>{subtitle}</p>
      </Reveal>
    </AbsoluteFill>
  );
}

/* ---------- Layar demo: produk memenuhi layar, kamera mendorong ke bagian yang dijelaskan ---------- */

export function DemoShot({ shot, index, total }: { shot: Shot; index: number; total: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [fx, fy] = shot.focus;
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.32], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: color.cream, overflow: "hidden" }}>
      <Img
        src={staticFile(`shots/${shot.file}.png`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}
      />
      {/* Bilah keterangan bawah (lower third): navy pekat, teks kiri, nomor layar kanan. */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            background: "linear-gradient(0deg, rgba(20,33,61,0.96) 0%, rgba(20,33,61,0.9) 70%, rgba(20,33,61,0) 100%)",
            padding: "120px 120px 70px",
            display: "flex",
            alignItems: "flex-end",
            gap: 80,
            fontFamily: font.sans,
            color: color.cream,
          }}
        >
          <div style={{ flex: 1 }}>
            <Reveal at={6}>
              <p style={{ ...label, fontSize: 22, color: color.sun }}>{shot.chapter}</p>
            </Reveal>
            <Reveal at={10} style={{ marginTop: 14 }}>
              <h2 style={{ ...display(76), color: color.cream }}>{shot.title}</h2>
            </Reveal>
            <Reveal at={16} style={{ marginTop: 18 }}>
              <p style={{ fontSize: 31, lineHeight: 1.4, color: "rgba(255,248,240,0.82)", margin: 0, maxWidth: 1300 }}>{shot.body}</p>
            </Reveal>
          </div>
          <Reveal at={20}>
            <p style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,248,240,0.55)", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- Tampilan seluler: dua ponsel di atas kertas, teks kiri ---------- */

export function PhoneShots() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...paper, flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 100 }}>
      <div style={{ width: 640 }}>
        <Reveal>
          <p style={{ ...label, color: color.brand }}>07 Demo aplikasi</p>
        </Reveal>
        <Reveal at={6} style={{ marginTop: 26 }}>
          <h1 style={display(104)}>{phone.title}</h1>
        </Reveal>
        <Reveal at={14}>
          <p style={{ fontSize: 33, lineHeight: 1.45, color: softInk, margin: "30px 0 0" }}>{phone.body}</p>
        </Reveal>
      </div>
      <div style={{ display: "flex", gap: 56, alignItems: "flex-start" }}>
        {phone.files.map((file, index) => {
          const rise = interpolate(frame, [10 + index * 8, 40 + index * 8], [160, index * 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return (
            <div key={file} style={{ width: 400, borderRadius: 54, padding: 12, backgroundColor: color.navy, boxShadow: "0 30px 70px rgba(20,33,61,0.3)", transform: `translateY(${rise}px)` }}>
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
        <Wordmark size={120} />
      </Reveal>
      <Reveal at={10} style={{ marginTop: 60 }}>
        <h1 style={{ ...display(180), color: color.cream }}>Terima Kasih</h1>
      </Reveal>
      <div style={{ width: 1100, margin: "50px 0 40px" }}>
        <Perforation at={18} />
      </div>
      <Reveal at={26}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.8)", margin: 0 }}>
          Repositori <b style={{ color: color.cream }}>{links.repo}</b>
        </p>
      </Reveal>
      <Reveal at={32} style={{ marginTop: 10 }}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.8)", margin: 0 }}>
          Aplikasi web <b style={{ color: color.cream }}>{links.web}</b>
        </p>
      </Reveal>
    </AbsoluteFill>
  );
}
