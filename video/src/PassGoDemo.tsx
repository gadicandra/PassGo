import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Fragment } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { chapterSubtitle, checkInFlow, demo, orderFlow } from "./content";
import { About, Architecture, Background, DemoShot, DemoTitle, FlowScene, Intro, Outro, PhoneShots, SectionBar, Team, Tech, type Section } from "./scenes";
import { sec } from "./theme";

const TRANSITION = sec(0.5);
// Durasi disusun supaya total ± 9 menit 30 detik (batas tugas 10 menit). Narasi tiap adegan ada di NASKAH.md.
const SHOT = sec(14); // tiap layar demo: cukup untuk 2-3 kalimat narasi

type Scene = { key: string; frames: number; node: React.ReactNode; section?: Section; dark?: boolean; slideIn?: boolean };

// Adegan berurutan; durasi total dihitung dari daftar ini (dipakai juga oleh Root).
export const scenes: Scene[] = [
  { key: "intro", frames: sec(12), node: <Intro /> },
  { key: "background", frames: sec(40), node: <Background />, section: "Pengenalan" },
  { key: "about", frames: sec(35), node: <About />, section: "Pengenalan" },
  { key: "team", frames: sec(40), node: <Team />, section: "Tim" },
  { key: "tech", frames: sec(35), node: <Tech />, section: "Teknologi" },
  { key: "architecture", frames: sec(40), node: <Architecture />, section: "Teknologi" },
  { key: "flow-order", frames: sec(38), node: <FlowScene flow={orderFlow} />, section: "Alur" },
  { key: "flow-checkin", frames: sec(38), node: <FlowScene flow={checkInFlow} />, section: "Alur" },
  ...demo.flatMap((shot, index) => {
    const first = index === 0 || demo[index - 1].chapter !== shot.chapter;
    return [
      ...(first ? [{ key: `bab-${shot.chapter}`, frames: sec(5), node: <DemoTitle chapter={shot.chapter} subtitle={chapterSubtitle[shot.chapter]} />, section: "Demo" as const, dark: true }] : []),
      { key: shot.file, frames: SHOT, node: <DemoShot shot={shot} />, section: "Demo" as const, dark: true, slideIn: !first },
    ];
  }),
  { key: "phone", frames: sec(18), node: <PhoneShots />, section: "Demo" },
  { key: "outro", frames: sec(20), node: <Outro /> },
];

export const totalFrames = scenes.reduce((sum, scene) => sum + scene.frames, 0) - (scenes.length - 1) * TRANSITION;

// Frame mulai tiap adegan (transisi tumpang tindih setengah detik dengan adegan sebelumnya).
const starts = scenes.map((_, i) => scenes.slice(0, i).reduce((sum, s) => sum + s.frames - TRANSITION, 0));

/** Bilah bagian tetap diam saat adegan berganti, jadi dipasang di luar TransitionSeries. */
function Bar() {
  const frame = useCurrentFrame();
  let index = 0;
  while (index + 1 < scenes.length && frame >= starts[index + 1] + TRANSITION / 2) index++;
  const scene = scenes[index];
  return scene.section ? <SectionBar current={scene.section} dark={scene.dark} /> : null;
}

export function PassGoDemo() {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {scenes.map((scene, index) => (
          <Fragment key={scene.key}>
            {index > 0 && (
              <TransitionSeries.Transition
                presentation={scene.slideIn ? slide({ direction: "from-right" }) : fade()}
                timing={linearTiming({ durationInFrames: TRANSITION })}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={scene.frames}>{scene.node}</TransitionSeries.Sequence>
          </Fragment>
        ))}
      </TransitionSeries>
      <Bar />
    </AbsoluteFill>
  );
}
