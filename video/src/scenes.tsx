import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { about, architecture, background, intro, links, phone, security, team, tech, type Shot } from "./content";
import { color, font } from "./theme";

/** Muncul naik dengan pegas, dengan jeda `delay` frame. */
function useRise(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)` } satisfies CSSProperties;
}

function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...useRise(delay), ...style }}>{children}</div>;
}

const page: CSSProperties = { backgroundColor: color.navy, color: color.cream, fontFamily: font.sans, padding: "90px 120px" };

/** Label bab kecil di kiri atas (mis. "02 · Pembagian tugas"). */
function Chapter({ children }: { children: ReactNode }) {
  return (
    <Rise>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: color.sun }}>{children}</p>
    </Rise>
  );
}

function Wordmark({ size = 96 }: { size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: color.brand,
        color: color.cream,
        fontFamily: font.display,
        fontSize: size,
        letterSpacing: -2,
        padding: `${size * 0.12}px ${size * 0.45}px ${size * 0.12}px ${size * 0.25}px`,
        borderRadius: size * 0.12,
        // Takik setengah lingkaran di kanan, seperti tiket (sama dengan logo di aplikasi).
        maskImage: `radial-gradient(circle at 100% 50%, transparent ${size * 0.18}px, #000 ${size * 0.18 + 1}px)`,
      }}
    >
      PASSGO
    </div>
  );
}

export function Intro() {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 120], [0.4, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ ...page, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, rgba(240,78,35,${0.35 * glow}), transparent 60%)` }} />
      <Rise>
        <Wordmark size={150} />
      </Rise>
      <Rise delay={12}>
        <p style={{ fontSize: 46, fontWeight: 600, marginTop: 50, maxWidth: 1300 }}>{intro.subtitle}</p>
      </Rise>
      <Rise delay={24}>
        <p style={{ fontSize: 30, color: color.muted, marginTop: 10 }}>{intro.meta}</p>
      </Rise>
    </AbsoluteFill>
  );
}

/** Adegan judul + paragraf + 3 kartu bernomor (Latar Belakang, Pengenalan Aplikasi). */
function PointsScene({ chapter, data }: { chapter: string; data: { title: string; lead: string; points: Array<{ title: string; body: string }> } }) {
  return (
    <AbsoluteFill style={page}>
      <Chapter>{chapter}</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 84, fontWeight: 700, margin: "24px 0 0", letterSpacing: -1 }}>{data.title}</h1>
      </Rise>
      <Rise delay={12}>
        <p style={{ fontSize: 38, color: "rgba(255,248,240,0.8)", maxWidth: 1450, lineHeight: 1.4, marginTop: 20 }}>{data.lead}</p>
      </Rise>
      <div style={{ display: "flex", gap: 36, marginTop: 64 }}>
        {data.points.map((point, index) => (
          <Rise key={point.title} delay={24 + index * 10} style={{ flex: 1, display: "flex" }}>
            <div style={{ flex: 1, backgroundColor: color.navySoft, borderRadius: 28, padding: 44, minHeight: 360, borderTop: `8px solid ${[color.brand, color.sun, color.teal][index]}` }}>
              <p style={{ fontSize: 30, fontWeight: 700, color: [color.brand, color.sun, "#5fb3a8"][index], margin: 0 }}>0{index + 1}</p>
              <p style={{ fontSize: 42, fontWeight: 700, margin: "18px 0 0" }}>{point.title}</p>
              <p style={{ fontSize: 30, lineHeight: 1.45, color: "rgba(255,248,240,0.78)", marginTop: 16 }}>{point.body}</p>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export const Background = () => <PointsScene chapter="01 · Latar Belakang" data={background} />;
export const About = () => <PointsScene chapter="02 · Pengenalan" data={about} />;

/** Diagram alur: Browser, Frontend, REST API, Basis Data, dengan layanan pihak ketiga di bawahnya. */
export function Architecture() {
  const frame = useCurrentFrame();
  const { nodes, services } = architecture;
  const chain = [nodes.client, nodes.frontend, nodes.backend, nodes.database];
  const accents = [color.muted, color.brand, color.sun, "#5fb3a8"];
  return (
    <AbsoluteFill style={page}>
      <Chapter>05 · Arsitektur</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 84, fontWeight: 700, margin: "24px 0 0", letterSpacing: -1 }}>{architecture.title}</h1>
      </Rise>
      <Rise delay={12}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.8)", maxWidth: 1500, lineHeight: 1.4, marginTop: 20 }}>{architecture.lead}</p>
      </Rise>
      <div style={{ display: "flex", alignItems: "center", marginTop: 70 }}>
        {chain.map((node, index) => (
          <div key={node.title} style={{ display: "flex", alignItems: "center", flex: index === chain.length - 1 ? "0 0 auto" : 1 }}>
            <Rise delay={20 + index * 12}>
              <div style={{ width: 330, backgroundColor: color.navySoft, borderRadius: 26, padding: "34px 30px", borderLeft: `8px solid ${accents[index]}` }}>
                <p style={{ fontSize: 38, fontWeight: 700, margin: 0 }}>{node.title}</p>
                <p style={{ fontSize: 25, color: "rgba(255,248,240,0.75)", margin: "10px 0 0" }}>{node.body}</p>
              </div>
            </Rise>
            {index < chain.length - 1 && (
              // Panah tumbuh dari kiri ke kanan setelah kotak di kirinya muncul.
              <div style={{ flex: 1, height: 6, margin: "0 18px", backgroundColor: "rgba(255,248,240,0.15)", borderRadius: 9, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    backgroundColor: color.brand,
                    width: `${interpolate(frame, [30 + index * 12, 50 + index * 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Rise delay={70}>
        <p style={{ fontSize: 28, fontWeight: 700, color: color.sun, margin: "70px 0 20px" }}>Layanan terintegrasi</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
          {services.map((service) => (
            <div key={service} style={{ backgroundColor: "rgba(255,248,240,0.08)", borderRadius: 18, padding: "22px 26px", fontSize: 26, fontWeight: 600, lineHeight: 1.35 }}>
              {service}
            </div>
          ))}
        </div>
      </Rise>
    </AbsoluteFill>
  );
}

export function Security() {
  return (
    <AbsoluteFill style={page}>
      <Chapter>06 · Keamanan</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 84, fontWeight: 700, margin: "24px 0 0", letterSpacing: -1 }}>{security.title}</h1>
      </Rise>
      <Rise delay={12}>
        <p style={{ fontSize: 34, color: "rgba(255,248,240,0.8)", marginTop: 20 }}>{security.lead}</p>
      </Rise>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 50 }}>
        {security.points.map((point, index) => (
          <Rise key={point.title} delay={22 + index * 8}>
            <div style={{ backgroundColor: color.navySoft, borderRadius: 26, padding: "34px 36px", minHeight: 250 }}>
              <p style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{point.title}</p>
              <p style={{ fontSize: 27, lineHeight: 1.45, color: "rgba(255,248,240,0.78)", marginTop: 14 }}>{point.body}</p>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Team() {
  return (
    <AbsoluteFill style={page}>
      <Chapter>03 · Tim</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 76, fontWeight: 700, margin: "24px 0 50px", letterSpacing: -1 }}>Pembagian Tugas</h1>
      </Rise>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {team.map((member, index) => (
          <Rise key={member.name} delay={14 + index * 8}>
            <div style={{ backgroundColor: color.cream, color: color.navy, borderRadius: 28, padding: "36px 44px", display: "flex", gap: 32 }}>
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 999,
                  flexShrink: 0,
                  backgroundColor: [color.brand, color.teal, color.sun, color.navy][index],
                  color: color.cream,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: font.display,
                  fontSize: 44,
                }}
              >
                {member.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
              </div>
              <div>
                <p style={{ fontSize: 34, fontWeight: 700, margin: 0 }}>{member.name}</p>
                <p style={{ fontSize: 22, color: "#6b6b66", margin: "4px 0 14px" }}>{member.nim}</p>
                <ul style={{ fontSize: 25, lineHeight: 1.5, margin: 0, paddingLeft: 26 }}>
                  {member.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Tech() {
  return (
    <AbsoluteFill style={page}>
      <Chapter>04 · Teknologi</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 76, fontWeight: 700, margin: "24px 0 50px", letterSpacing: -1 }}>Teknologi yang Digunakan</h1>
      </Rise>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
        {tech.map((column, index) => (
          <Rise key={column.group} delay={14 + index * 8}>
            <div style={{ backgroundColor: color.navySoft, borderRadius: 28, padding: 40, height: 560 }}>
              <p style={{ fontSize: 30, fontWeight: 700, color: [color.brand, color.sun, "#5fb3a8", "#8ea7ff"][index], margin: 0 }}>{column.group}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 30 }}>
                {column.items.map((item) => (
                  <div key={item} style={{ backgroundColor: "rgba(255,248,240,0.08)", borderRadius: 18, padding: "20px 24px", fontSize: 30, fontWeight: 600 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** Pembatas bab demo, mis. "Demo · Peserta". */
export function DemoTitle({ chapter, subtitle }: { chapter: string; subtitle: string }) {
  return (
    <AbsoluteFill style={{ ...page, justifyContent: "center" }}>
      <Chapter>07 · Demo Aplikasi</Chapter>
      <Rise delay={6}>
        <h1 style={{ fontSize: 140, fontWeight: 700, margin: "20px 0 0", letterSpacing: -3 }}>{chapter}</h1>
      </Rise>
      <Rise delay={14}>
        <p style={{ fontSize: 40, color: "rgba(255,248,240,0.75)", marginTop: 20 }}>{subtitle}</p>
      </Rise>
    </AbsoluteFill>
  );
}

/** Satu layar demo: teks di kiri, screenshot dalam bingkai browser di kanan dengan zoom pelan. */
export function DemoShot({ shot, index, total }: { shot: Shot; index: number; total: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08]);
  const pan = interpolate(frame, [0, durationInFrames], [0, -3]);
  return (
    <AbsoluteFill style={{ ...page, padding: 80, flexDirection: "row", alignItems: "center", gap: 70 }}>
      <div style={{ width: 470, flexShrink: 0 }}>
        <Rise>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: color.sun }}>
            Demo · {shot.chapter}
          </p>
        </Rise>
        <Rise delay={6}>
          <h2 style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.08, margin: "22px 0 0", letterSpacing: -1 }}>{shot.title}</h2>
        </Rise>
        <Rise delay={12}>
          <p style={{ fontSize: 32, lineHeight: 1.45, color: "rgba(255,248,240,0.8)", marginTop: 26 }}>{shot.body}</p>
        </Rise>
        <Rise delay={18}>
          <p style={{ fontSize: 22, color: color.muted, marginTop: 40 }}>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
        </Rise>
      </div>
      <Rise delay={4} style={{ flex: 1 }}>
        <div style={{ borderRadius: 22, overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 40px 90px rgba(0,0,0,0.45)" }}>
          <div style={{ height: 52, backgroundColor: "#eef0f4", display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
              <span key={dot} style={{ width: 15, height: 15, borderRadius: 99, backgroundColor: dot }} />
            ))}
            <span style={{ marginLeft: 20, flex: 1, height: 32, borderRadius: 10, backgroundColor: "#fff", color: "#6b6b66", fontSize: 18, display: "flex", alignItems: "center", padding: "0 16px" }}>
              {shot.url}
            </span>
          </div>
          <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
            <Img
              src={staticFile(`shots/${shot.file}.png`)}
              style={{ width: "100%", transform: `scale(${zoom}) translateY(${pan}%)`, transformOrigin: "50% 20%" }}
            />
          </div>
        </div>
      </Rise>
    </AbsoluteFill>
  );
}

export function PhoneShots() {
  return (
    <AbsoluteFill style={{ ...page, flexDirection: "row", alignItems: "center", gap: 80 }}>
      <div style={{ width: 600 }}>
        <Chapter>07 · Demo Aplikasi</Chapter>
        <Rise delay={6}>
          <h2 style={{ fontSize: 72, fontWeight: 700, margin: "22px 0 0", letterSpacing: -1 }}>{phone.title}</h2>
        </Rise>
        <Rise delay={12}>
          <p style={{ fontSize: 34, lineHeight: 1.45, color: "rgba(255,248,240,0.8)", marginTop: 26 }}>{phone.body}</p>
        </Rise>
      </div>
      <div style={{ display: "flex", gap: 50 }}>
        {phone.files.map((file, index) => (
          <Rise key={file} delay={10 + index * 10}>
            <div style={{ width: 400, borderRadius: 56, padding: 14, backgroundColor: "#0b1222", boxShadow: "0 40px 90px rgba(0,0,0,0.5)" }}>
              <div style={{ borderRadius: 44, overflow: "hidden", aspectRatio: "390 / 844" }}>
                <Img src={staticFile(`shots/${file}.png`)} style={{ width: "100%" }} />
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Outro() {
  return (
    <AbsoluteFill style={{ ...page, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <Rise>
        <Wordmark size={110} />
      </Rise>
      <Rise delay={10}>
        <h1 style={{ fontSize: 96, fontWeight: 700, margin: "50px 0 0", letterSpacing: -2 }}>Terima Kasih</h1>
      </Rise>
      <Rise delay={20}>
        <p style={{ fontSize: 36, color: "rgba(255,248,240,0.8)", marginTop: 30 }}>Repositori: {links.repo}</p>
        <p style={{ fontSize: 36, color: "rgba(255,248,240,0.8)", marginTop: 8 }}>Aplikasi web: {links.web}</p>
      </Rise>
    </AbsoluteFill>
  );
}
