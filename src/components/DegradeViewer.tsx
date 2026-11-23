import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import data from "../data/degrade_clips.json";
import { asset } from "../lib/paths";
import { keepTime, restoreTime, useLoopInView } from "../lib/useLoopInView";
import VideoToggle from "./VideoToggle";

// Degraded sensors, rendered: one tab per dataset, the fault as chips and its strength as a range input that snaps to
// the precomputed levels (position 0 = the clean input). Every (fault, strength) is one prerendered clip: the faulty
// input on the left, the inference on the right (MakeSense, the dataset's comparison model if it has one, and the
// ground truth). Clips that a viewer can swap share the recording, camera path and timing, so switching keeps the
// moment. A fault may bring its own clean clip (V2X-Real: all four nodes or the ego vehicle alone); a dataset may name
// its axis and clean position differently (RELI11D: a sensor is missing rather than degraded).
type Clip = { src: string; poster: string };
type Level = Clip & { level: string; note?: string };
type Fault = { id: string; label: string; levels: Level[]; clean?: Clip };
type Dataset = {
  id: string;
  label: string;
  baseline: string | null;
  clean: Clip;
  cleanLabel?: string;
  axisLabel?: string;
  faults: Fault[];
};

const DATASETS = data.datasets as unknown as Dataset[];
const HASH = "robustness-";

function Panel({ dataset }: { dataset: Dataset }) {
  const [faultId, setFaultId] = useState(dataset.faults[0].id);
  // index 0 is the clean input, 1..n the fault's levels; start on the middle level so the fault is visible
  const [index, setIndex] = useState(Math.ceil(dataset.faults[0].levels.length / 2));
  const video = useRef<HTMLVideoElement>(null);
  const saved = useRef<{ time: number; playing: boolean } | null>(null);
  useLoopInView(video);

  // the clip of a (fault, position) pair: position 0 is the fault's clean clip, if it has one, else the dataset's
  const clipFor = (id: string, at: number): Clip => {
    const f = dataset.faults.find((x) => x.id === id) ?? dataset.faults[0];
    const c = Math.min(at, f.levels.length);
    return c === 0 ? (f.clean ?? dataset.clean) : f.levels[c - 1];
  };
  const fault = dataset.faults.find((f) => f.id === faultId) ?? dataset.faults[0];
  const clamped = Math.min(index, fault.levels.length);
  const level = clamped === 0 ? null : fault.levels[clamped - 1];
  const clip = clipFor(faultId, index);
  const axis = dataset.axisLabel ?? "Strength";
  const cleanLabel = dataset.cleanLabel ?? "clean";
  const ticks = [cleanLabel, ...fault.levels.map((l) => l.level)];
  const condition = level ? (dataset.axisLabel ? fault.label : `${fault.label} at strength ${level.level}`) : cleanLabel;
  const models = dataset.baseline ? `MakeSense, ${dataset.baseline} and the ground truth` : "MakeSense and the ground truth";
  const sliderId = `strength-${dataset.id}`;
  const chipsLabel = `faults-${dataset.id}`;
  const videoLabel = `${dataset.label}, ${condition}: the faulty input with the inference of ${models}`;

  function change(nextFault: string, nextIndex: number) {
    // Only a new source reloads the player and so needs the moment kept; a swap that has not loaded yet keeps the
    // moment of the clip the viewer was watching.
    if (clipFor(nextFault, nextIndex).src !== clip.src && !saved.current) saved.current = keepTime(video.current);
    setFaultId(nextFault);
    setIndex(nextIndex);
  }

  return (
    <>
      <div className="degrade-controls">
        <div className="control">
          <span className="control-label" id={chipsLabel}>
            {dataset.axisLabel ? "Sensor" : "Fault"}
          </span>
          <ToggleGroup.Root
            type="single"
            value={fault.id}
            onValueChange={(next) => {
              if (next) change(next, Math.max(1, Math.min(clamped, dataset.faults.find((f) => f.id === next)!.levels.length)));
            }}
            aria-labelledby={chipsLabel}
            className="toggle-row"
          >
            {dataset.faults.map((f) => (
              <ToggleGroup.Item key={f.id} value={f.id} className="toggle">
                {f.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
        <div className="control degrade-strength">
          <label className="control-label" htmlFor={sliderId}>
            {axis}
          </label>
          <input
            id={sliderId}
            className="range"
            type="range"
            min={0}
            max={fault.levels.length}
            step={1}
            value={clamped}
            onChange={(event) => change(fault.id, Number(event.target.value))}
            aria-valuetext={level ? (dataset.axisLabel ? level.level : `strength ${level.level}`) : cleanLabel}
          />
          <div className="range-ticks" aria-hidden="true" style={{ "--n": fault.levels.length } as CSSProperties}>
            {ticks.map((t, i) => (
              <span key={t} className={i === clamped ? "is-active" : undefined} style={{ "--i": i } as CSSProperties}>
                {t}
              </span>
            ))}
          </div>
        </div>
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
          width={data.width}
          height={data.height}
          style={{ aspectRatio: `${data.width} / ${data.height}` }}
          onLoadedMetadata={() => {
            restoreTime(video.current, saved.current);
            saved.current = null;
          }}
          aria-label={videoLabel}
        />
        <VideoToggle video={video} label={videoLabel} />
      </div>
      {level?.note ? (
        <p className="note panel-note" aria-live="polite">
          {level.note}
        </p>
      ) : null}
    </>
  );
}

export default function DegradeViewer() {
  const [value, setValue] = useState(DATASETS[0].id);

  // Open the tab named in the URL (#robustness-v2x), once, after hydration (the server renders the first tab).
  useEffect(() => {
    const id = window.location.hash.replace(`#${HASH}`, "");
    if (DATASETS.some((d) => d.id === id)) setValue(id);
  }, []);

  function change(next: string) {
    setValue(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${HASH}${next}`);
  }

  return (
    <Tabs.Root value={value} onValueChange={change}>
      <Tabs.List className="tabs-list" aria-label="Datasets under sensor faults">
        {DATASETS.map((d) => (
          <Tabs.Trigger key={d.id} value={d.id} className="tab">
            {d.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {DATASETS.map((d) => (
        <Tabs.Content key={d.id} value={d.id} className="tab-panel">
          <Panel dataset={d} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
