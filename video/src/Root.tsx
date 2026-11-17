import { Composition } from "remotion";
import { PassGoDemo, totalFrames } from "./PassGoDemo";
import { FPS } from "./theme";

export function RemotionRoot() {
  return <Composition id="PassGoDemo" component={PassGoDemo} durationInFrames={totalFrames} fps={FPS} width={1920} height={1080} />;
}
