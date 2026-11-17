import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Fragment } from "react";
import { chapterSubtitle, demo } from "./content";
import { About, Architecture, Background, DemoShot, DemoTitle, Intro, Outro, PhoneShots, Security, Team, Tech } from "./scenes";
import { sec } from "./theme";

const TRANSITION = sec(0.5);
// Durasi disusun supaya total ± 9 menit 30 detik (batas tugas 10 menit). Narasi tiap adegan ada di NASKAH.md.
const SHOT = sec(16); // tiap layar demo: cukup untuk 2-3 kalimat narasi

// Adegan berurutan; durasi total dihitung dari daftar ini (dipakai juga oleh Root).
export const scenes: Array<{ key: string; frames: number; node: React.ReactNode; slideIn?: boolean }> = [
  { key: "intro", frames: sec(12), node: <Intro /> },
  { key: "background", frames: sec(40), node: <Background /> },
  { key: "about", frames: sec(35), node: <About /> },
  { key: "team", frames: sec(40), node: <Team /> },
  { key: "tech", frames: sec(40), node: <Tech /> },
  { key: "architecture", frames: sec(45), node: <Architecture /> },
  { key: "security", frames: sec(35), node: <Security /> },
  ...demo.flatMap((shot, index) => {
    const first = index === 0 || demo[index - 1].chapter !== shot.chapter;
    return [
      ...(first ? [{ key: `bab-${shot.chapter}`, frames: sec(5), node: <DemoTitle chapter={shot.chapter} subtitle={chapterSubtitle[shot.chapter]} /> }] : []),
      { key: shot.file, frames: SHOT, node: <DemoShot shot={shot} index={index} total={demo.length} />, slideIn: !first },
    ];
  }),
  { key: "phone", frames: sec(18), node: <PhoneShots /> },
  { key: "outro", frames: sec(20), node: <Outro /> },
];

export const totalFrames = scenes.reduce((sum, scene) => sum + scene.frames, 0) - (scenes.length - 1) * TRANSITION;

export function PassGoDemo() {
  return (
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
  );
}
