import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, PointerEvent, ReactNode } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

// The pipeline of the paper's overview figure (Fig. 3), drawn for MM-Fi. Every caption restates the paper's text
// (Sec. 3 and the Fig. 3 caption); no numbers, no new claims.
type Scenario = "all" | "missing" | "degraded";
type Lane = { id: string; name: string; color: string; range: boolean };

const LANES: Lane[] = [
  { id: "rgb", name: "RGB", color: "var(--s-rgb)", range: false },
  { id: "depth", name: "Depth", color: "var(--s-depth)", range: true },
  { id: "mmwave", name: "mmWave", color: "var(--s-mmwave)", range: true },
  { id: "lidar", name: "LiDAR", color: "var(--s-lidar)", range: true },
  { id: "wifi", name: "WiFi", color: "var(--s-wifi)", range: false },
];
const X = [52, 116, 180, 244, 308];

const SCENARIOS: { id: Scenario; label: string; note: string }[] = [
  { id: "all", label: "All sensors", note: "Every MM-Fi sensor is present." },
  { id: "missing", label: "LiDAR missing", note: "Faded: the missing LiDAR contributes no token." },
  {
    id: "degraded",
    label: "LiDAR degraded",
    note: "Hatched: the LiDAR input is degraded, for example by point thinning or angular occlusion.",
  },
];

const STAGES: { title: string; text: Record<Scenario, string> }[] = [
  {
    title: "Sensor adapters",
    text: {
      all: "Each present sensor passes through its own adapter, which turns its input into sensor tokens.",
      missing: "LiDAR is missing, so it contributes no token. Each present sensor passes through its own adapter.",
      degraded: "The degraded LiDAR is present, so it passes through its own adapter like every other sensor.",
    },
  },
  {
    title: "Per-sensor layers",
    text: {
      all: "The fusion core first processes every sensor separately: each sensor's tokens attend only to themselves.",
      missing: "Each present sensor's tokens attend only to themselves. An absent sensor is neither a query nor a key anywhere.",
      degraded: "Each sensor's tokens attend only to themselves, so the degraded LiDAR keeps its own private stream.",
    },
  },
  {
    title: "Shared bottleneck tokens",
    text: {
      all: "Shared bottleneck tokens then join and read the tokens of every sensor. Sensor tokens never read the bottleneck tokens or another sensor.",
      missing: "The bottleneck tokens read and mix the tokens of the present sensors only.",
      degraded: "The degraded LiDAR meets the other sensors only through the shared bottleneck tokens.",
    },
  },
  {
    title: "Dataset head",
    text: {
      all: "Each dataset has its own head, which reads the fused tokens. On MM-Fi it is a pose decoder.",
      missing: "One network predicts from any nonempty subset of sensors, without imputing absent inputs.",
      degraded: "Each dataset has its own head, which reads the fused tokens. On MM-Fi it is a pose decoder.",
    },
  },
  {
    title: "Range readout",
    text: {
      all: "Depth, mmWave and LiDAR measure range; RGB and WiFi CSI do not. A second pass over the range sensors alone sets the distance; the direction comes from all sensors.",
      missing: "Without LiDAR, the second pass runs on depth and mmWave, the range sensors that are present.",
      degraded: "The second pass still reads every range sensor: depth, mmWave and the degraded LiDAR. RGB and WiFi CSI do not enter it.",
    },
  },
];

const STEP_MS = 3000;
const RANGE = 4; // index of the range-readout stage
// band rectangles of the drawing (y, height), one per stage
const BANDS = [
  [46, 84],
  [136, 86],
  [228, 110],
  [344, 62],
  [412, 130],
];

// Static parts are hoisted, so the stage timer does not re-render them.
const HATCH_DEFS = (
  <defs>
    <pattern id="mp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" className="mp-hatch-bg" />
      <rect width="2.6" height="6" className="mp-hatch-fg" />
    </pattern>
    <pattern id="mp-hatch-fine" width="3.5" height="3.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3.5" height="3.5" className="mp-hatch-bg" />
      <rect width="1.6" height="3.5" className="mp-hatch-fg" />
    </pattern>
  </defs>
);

function Arrow({ x, y1, y2, className }: { x: number; y1: number; y2: number; className: string }) {
  return (
    <g className={className}>
      <line x1={x} y1={y1} x2={x} y2={y2 - 5} />
      <path d={`M${x - 4} ${y2 - 6}L${x + 4} ${y2 - 6}L${x} ${y2}Z`} />
    </g>
  );
}

export function Pipeline({ stage, scenario }: { stage: number; scenario: Scenario }) {
  // Opacity of a lane's element in a band: the active band is lit; in the range-readout stage the range sensors stay
  // lit (the second pass) and RGB and WiFi fade; a missing sensor is faded everywhere.
  const laneAlpha = (band: number, lane: Lane) => {
    let a = band === stage ? 1 : 0.38;
    if (stage === RANGE) a = lane.range ? 0.9 : 0.16;
    return scenario === "missing" && lane.id === "lidar" ? a * 0.32 : a;
  };
  const bandAlpha = (band: number) => (band === stage ? 1 : stage === RANGE && band > 1 ? 0.9 : 0.38);

  return (
    <svg
      className="mp-svg"
      viewBox="0 0 360 548"
      width="360"
      height="548"
      role="img"
      aria-label="MakeSense on MM-Fi: sensor adapters, per-sensor layers, shared bottleneck tokens, a pose decoder and the range readout."
    >
      {HATCH_DEFS}

      {BANDS.map(([y, h], i) => (
        <g key={i}>
          <rect x="4" y={y} width="352" height={h} rx="10" className="mp-band" style={{ opacity: i === stage ? 1 : 0 }} />
          <text x="16" y={y + 18} className={i === stage ? "mp-label is-active" : "mp-label"}>
            {STAGES[i].title}
          </text>
        </g>
      ))}

      {LANES.map((lane, i) => {
        const cx = X[i];
        const missing = scenario === "missing" && lane.id === "lidar";
        const degraded = scenario === "degraded" && lane.id === "lidar";
        const cls = `mp-lane${missing ? " is-missing" : ""}${degraded ? " is-degraded" : ""}`;
        const token = (x: number, y: number, key: string) =>
          missing ? null : <rect key={key} x={x} y={y} width="7" height="7" rx="1.5" className="mp-token" />;
        return (
          <g key={lane.id} className={cls} style={{ "--c": lane.color } as CSSProperties}>
            {/* sensor chip; the bar under it marks the range sensors in the range-readout stage */}
            <g className="mp-fade" style={{ opacity: missing ? 0.32 : stage === RANGE && !lane.range ? 0.4 : 1 }}>
              <rect x={cx - 29} y="8" width="58" height="30" rx="8" className="mp-chip" />
              <text x={cx} y="27.5" className="mp-chip-text">
                {lane.name}
              </text>
            </g>
            <rect
              x={cx - 20}
              y="40"
              width="40"
              height="3"
              rx="1.5"
              className="mp-range-mark mp-fade"
              style={{ opacity: stage === RANGE && lane.range && !missing ? 1 : 0 }}
            />
            {/* adapter and sensor tokens */}
            <g className="mp-fade" style={{ opacity: laneAlpha(0, lane) }}>
              <path d={`M${cx - 20} 72H${cx + 20}L${cx + 10} 100H${cx - 10}Z`} className="mp-adapter" />
              {[0, 1, 2, 3].map((k) => token(cx - 17 + k * 9, 108, `t${k}`))}
            </g>
            {/* per-sensor layers */}
            <g className="mp-fade" style={{ opacity: laneAlpha(1, lane) }}>
              <rect x={cx - 15} y="162" width="30" height="52" rx="9" className="mp-stream" />
              {[171.5, 184.5, 197.5].map((y, k) => token(cx - 3.5, y, `p${k}`))}
            </g>
            {/* the same private stream in the bottleneck layers, read by the shared tokens */}
            <g className="mp-fade" style={{ opacity: laneAlpha(2, lane) }}>
              <rect x={cx - 15} y="254" width="30" height="40" rx="9" className="mp-stream" />
              {[257.5, 270.5, 283.5].map((y, k) => token(cx - 3.5, y, `b${k}`))}
              {missing ? null : <line x1={cx} y1="294" x2={cx} y2="304" className="mp-wire" />}
            </g>
          </g>
        );
      })}

      {/* bottleneck tokens: they read every present stream; the streams never read them */}
      <g className="mp-fade" style={{ opacity: bandAlpha(2) }}>
        <line x1={X[0]} y1="304" x2={X[4]} y2="304" className="mp-wire" />
        <Arrow x={180} y1={304} y2={318} className="mp-arrow" />
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={126 + k * 14} y="320" width="10" height="10" rx="1.5" className="mp-bottleneck" />
        ))}
      </g>

      {/* dataset head */}
      <g className="mp-fade" style={{ opacity: bandAlpha(3) }}>
        <Arrow x={180} y1={331} y2={369} className="mp-arrow" />
        <rect x="110" y="370" width="140" height="28" rx="8" className="mp-box" />
        <text x="180" y="388.5" className="mp-box-text">
          Pose decoder
        </text>
      </g>

      {/* range readout: direction from all sensors, distance from the second pass over the range sensors */}
      <g className="mp-fade" style={{ opacity: bandAlpha(4) }}>
        <Arrow x={164} y1={399} y2={469} className="mp-arrow" />
        <Arrow x={196} y1={399} y2={469} className="mp-arrow is-range" />
        <text x="157" y="448" className="mp-small" textAnchor="end">
          Direction
        </text>
        <text x="203" y="448" className="mp-small is-range">
          Range
        </text>
        <rect x="118" y="470" width="124" height="28" rx="14" className="mp-readout" />
        <text x="180" y="488.5" className="mp-box-text">
          Root position
        </text>
        <Arrow x={180} y1={499} y2={515} className="mp-arrow" />
        <text x="180" y="531" className="mp-box-text is-strong">
          3D pose
        </text>
      </g>
    </svg>
  );
}

// Lucide icons (ISC License): chevron-left, chevron-right, play, pause.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ICON = {
  prev: <path d="m15 18l-6-6l6-6" />,
  next: <path d="m9 18l6-6l-6-6" />,
  play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
  pause: (
    <>
      <rect width="5" height="18" x="14" y="3" rx="1" />
      <rect width="5" height="18" x="5" y="3" rx="1" />
    </>
  ),
};

// Every caption, invisible, in one grid cell: the caption box keeps the height of the longest one. Static, so hoisted.
const CAPTION_SIZER = (
  <div className="mp-sizer" aria-hidden="true">
    {STAGES.flatMap((s) =>
      SCENARIOS.map((sc) => (
        <div key={`${s.title}-${sc.id}`}>
          <p className="mp-count">Stage</p>
          <p className="mp-title">{s.title}</p>
          <p className="mp-text">{s.text[sc.id]}</p>
        </div>
      )),
    )}
  </div>
);

export default function MethodStepper() {
  const [stage, setStage] = useState(0);
  const [scenario, setScenario] = useState<Scenario>("all");
  const [paused, setPaused] = useState(false); // the viewer's choice (button, focus, manual step)
  const [hovered, setHovered] = useState(false); // a mouse over the widget pauses until it leaves
  const [visible, setVisible] = useState(false); // on screen, in a visible tab
  const root = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);

  // No auto-advance for viewers who prefer reduced motion; the play button still starts it on request.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) setPaused(true);
    const onChange = () => {
      if (query.matches) setPaused(true);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let onScreen = false;
    const update = () => setVisible(onScreen && document.visibilityState === "visible");
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        update();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const running = !paused && !hovered && visible;
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STEP_MS);
    return () => window.clearTimeout(id);
  }, [running, stage]);

  // Focus arriving from outside pauses (except on the play button, so keyboard users can start the walkthrough).
  function onFocus(event: FocusEvent<HTMLDivElement>) {
    const target: Node = event.target;
    const from = event.relatedTarget as Node | null;
    if (target !== playButton.current && !event.currentTarget.contains(from)) setPaused(true);
  }
  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") setHovered(true);
  };
  const step = (delta: number) => {
    setPaused(true);
    setStage((s) => (s + delta + STAGES.length) % STAGES.length);
  };

  const current = STAGES[stage];
  const note = SCENARIOS.find((s) => s.id === scenario)?.note;

  return (
    <div
      ref={root}
      className="widget mp"
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="mp-panel">
        <div className="control">
          <span className="control-label" id="mp-scenario-label">
            Scenario
          </span>
          <ToggleGroup.Root
            type="single"
            value={scenario}
            onValueChange={(next) => {
              if (next === "all" || next === "missing" || next === "degraded") {
                setScenario(next);
                setPaused(true);
              }
            }}
            aria-labelledby="mp-scenario-label"
            className="toggle-row"
          >
            {SCENARIOS.map((s) => (
              <ToggleGroup.Item key={s.id} value={s.id} className="toggle">
                {s.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
        <p className="muted mp-note">{note}</p>

        <div className="mp-caption">
          {CAPTION_SIZER}
          <div aria-live={running ? "off" : "polite"} aria-atomic="true">
            <p className="mp-count">
              Stage {stage + 1} of {STAGES.length}
            </p>
            <p className="mp-title">{current.title}</p>
            <p className="mp-text">{current.text[scenario]}</p>
          </div>
        </div>

        <div className="mp-controls">
          <button type="button" className="mp-button mp-step" onClick={() => step(-1)} aria-label="Previous stage">
            <Icon>{ICON.prev}</Icon>
            <span className="mp-step-text">Previous</span>
          </button>
          <button
            ref={playButton}
            type="button"
            className="mp-button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play the walkthrough" : "Pause the walkthrough"}
          >
            <Icon>{paused ? ICON.play : ICON.pause}</Icon>
            <span>{paused ? "Play" : "Pause"}</span>
          </button>
          <button type="button" className="mp-button mp-step" onClick={() => step(1)} aria-label="Next stage">
            <span className="mp-step-text">Next</span>
            <Icon>{ICON.next}</Icon>
          </button>
        </div>
        <ol className="mp-dots" aria-hidden="true">
          {STAGES.map((s, i) => (
            <li key={s.title} className={i === stage ? "is-active" : undefined} />
          ))}
        </ol>
      </div>

      <div className="mp-figure">
        <Pipeline stage={stage} scenario={scenario} />
      </div>
    </div>
  );
}
