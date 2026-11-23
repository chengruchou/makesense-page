import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import clips from "../data/subset_clips.json";
import table from "../data/subsets.json";
import { asset } from "../lib/paths";
import { keepTime, restoreTime, useLoopInView } from "../lib/useLoopInView";
import VideoToggle from "./VideoToggle";

// Pick any of the 31 MM-Fi sensor subsets and watch MakeSense's rendered 3D pose for that subset on one recording of
// the unseen room. One player swaps its clip; all 31 clips share the recording, camera path and timing, so the moment
// and the viewpoint stay put when the subset changes. The number beside it is the paper's (three runs, E04).
type Clip = { src: string; poster: string };
type Cell = [number, number];

const CLIPS = clips.clips as Record<string, Clip>;
const ROWS = table.subsets as unknown as Record<string, { e04: Record<string, Cell> }>;
const SENSORS = [
  { id: "rgb", name: "RGB", color: "var(--s-rgb)" },
  { id: "depth", name: "Depth", color: "var(--s-depth)" },
  { id: "mmwave", name: "mmWave", color: "var(--s-mmwave)" },
  { id: "lidar", name: "LiDAR", color: "var(--s-lidar)" },
  { id: "wifi", name: "WiFi", color: "var(--s-wifi)" },
];
const ORDER = SENSORS.map((s) => s.id);
const NAME = Object.fromEntries(SENSORS.map((s) => [s.id, s.name]));
const BASELINE = "X-Fi";

const keyOf = (selected: string[]) => ORDER.filter((s) => selected.includes(s)).join("+");
const mm = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NBSP = String.fromCharCode(160);
const cell = ([mean, sd]: Cell) => `${mm.format(mean)} ± ${mm.format(sd)}${NBSP}mm`;

export default function SensorPicker() {
  const [sensors, setSensors] = useState<string[]>(ORDER);
  const video = useRef<HTMLVideoElement>(null);
  const saved = useRef<{ time: number; playing: boolean } | null>(null);
  useLoopInView(video);

  // Restore a shared selection from the URL once, after hydration (the server renders all five sensors).
  useEffect(() => {
    const fromUrl = (new URLSearchParams(window.location.search).get("sensors") ?? "")
      .split(",")
      .filter((s) => ORDER.includes(s));
    if (fromUrl.length) setSensors(fromUrl);
  }, []);

  function update(next: string[]) {
    // a swap that has not loaded yet keeps the moment of the clip the viewer was watching
    if (!saved.current) saved.current = keepTime(video.current);
    setSensors(next);
    const params = new URLSearchParams(window.location.search);
    params.set("sensors", ORDER.filter((s) => next.includes(s)).join(","));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}${window.location.hash}`);
  }

  const key = keyOf(sensors);
  const clip = CLIPS[key];
  const row = ROWS[key].e04;
  const chosen = ORDER.filter((s) => sensors.includes(s)).map((s) => NAME[s]);
  const videoLabel = `MakeSense's 3D pose from ${chosen.join(", ")} against the ground truth, one recording of the unseen room`;

  return (
    <div className="picker">
      <div className="control">
        <span className="control-label" id="picker-label">
          Sensors given to the model
        </span>
        <ToggleGroup.Root
          type="multiple"
          value={sensors}
          onValueChange={(next) => {
            if (next.length) update(next);
          }}
          aria-labelledby="picker-label"
          className="toggle-row"
        >
          {SENSORS.map((s) => (
            <ToggleGroup.Item key={s.id} value={s.id} className="toggle" style={{ "--dot": s.color } as CSSProperties}>
              <span className="dot" aria-hidden="true" />
              {s.name}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      <div className="plate panel-video">
        <video
          ref={video}
          src={asset(clip.src)}
          poster={asset(clip.poster)}
          muted
          loop
          playsInline
          // metadata, not none: a swapped source must load by itself so the clip resumes at the kept moment
          preload="metadata"
          width={clips.width}
          height={clips.height}
          style={{ aspectRatio: `${clips.width} / ${clips.height}` }}
          onLoadedMetadata={() => {
            restoreTime(video.current, saved.current);
            saved.current = null;
          }}
          aria-label={videoLabel}
        />
        <VideoToggle video={video} label={videoLabel} />
      </div>

      <p className="picker-metric" aria-live="polite">
        <span className="label">MPJPE in the unseen room, {chosen.join(" + ")}</span>
        <span className="ours">
          <span translate="no">MakeSense</span> {cell(row.MakeSense)}
        </span>
        <span className="base">
          {BASELINE} {cell(row[BASELINE])}
        </span>
      </p>
    </div>
  );
}
