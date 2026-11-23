import { useEffect, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import media from "../data/media.json";
import { DATASETS } from "../data/datasets";
import type { Dataset } from "../data/datasets";
import { asset } from "../lib/paths";
import { useLoopInView } from "../lib/useLoopInView";
import VideoToggle from "./VideoToggle";

const IDS = DATASETS.map((d) => d.id);
const HASH = "results-";

// One tab: the 3D clip is the main element (full width; its size and sources from media.json), then the headline,
// the dataset's main metric pair (its first metric) and, where the paper has one, the honesty note as a muted line.
function Panel({ dataset }: { dataset: Dataset }) {
  const video = useRef<HTMLVideoElement>(null);
  const item = media[dataset.video];
  const main = dataset.metrics[0];
  useLoopInView(video);

  return (
    <>
      <div className="plate panel-video">
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          poster={asset(item.poster)}
          width={item.width}
          height={item.height}
          style={{ aspectRatio: `${item.width} / ${item.height}` }}
          aria-label={dataset.videoLabel}
        >
          {item.sources.map((s) => (
            <source key={s.src} src={asset(s.src)} type={s.type} />
          ))}
        </video>
        <VideoToggle video={video} label={dataset.videoLabel} />
      </div>
      <div className="panel-info">
        <h3>{dataset.headline}</h3>
        <div className="metric">
          <div className="label">{main.label}</div>
          <div className="pair">
            <span className="ours" translate="no">
              {main.ours}
            </span>
            <span className="base">
              {main.baseline} {main.baselineName}
            </span>
          </div>
        </div>
      </div>
      {dataset.note ? <p className="note panel-note">{dataset.note}</p> : null}
    </>
  );
}

export default function DatasetTabs() {
  const [value, setValue] = useState(IDS[0]);

  // Open the tab named in the URL (#results-v2x), once, after hydration (the server renders the first tab).
  useEffect(() => {
    const id = window.location.hash.replace(`#${HASH}`, "");
    if (IDS.includes(id)) setValue(id);
  }, []);

  function change(next: string) {
    setValue(next);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${HASH}${next}`);
  }

  return (
    <Tabs.Root value={value} onValueChange={change}>
      <Tabs.List className="tabs-list" aria-label="Datasets">
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
