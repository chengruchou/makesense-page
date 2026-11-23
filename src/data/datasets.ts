// One tab per dataset. Numbers: main-paper Tables 2 and 3 (mean ± SD over three seeds); the baseline is the
// strongest compared baseline of the paper for that metric. The clip is the dataset's 3D video (a media.json entry);
// the headline states the result, and the clip's accessible name says what the clip itself shows.
export interface Metric {
  label: string;
  ours: string;
  baseline: string;
  baselineName: string;
}

export interface Dataset {
  id: string;
  label: string;
  task: string;
  video: "mmfi_3d" | "v2x_3d" | "mmaud_3d" | "he_3d" | "reli_3d";
  /** accessible name of the clip: what it shows (clean input where the headline names a fault) */
  videoLabel: string;
  headline: string;
  metrics: Metric[];
  note?: string;
}

export const DATASETS: Dataset[] = [
  {
    id: "mmfi",
    label: "MM-Fi",
    task: "3D human pose from five sensors",
    video: "mmfi_3d",
    videoLabel:
      "MM-Fi in 3D: the pose of MakeSense and the ground truth on one recording in the unseen room, beside the " +
      "five clean sensor inputs",
    headline: "Lowest pose error, also in an unseen room",
    metrics: [
      { label: "MPJPE, ID test (mm) ↓", ours: "58.4 ± 1.4", baseline: "79.6 ± 7.9", baselineName: "X-Fi + our degradation training" },
      { label: "MPJPE, unseen room (mm) ↓", ours: "80.2 ± 0.7", baseline: "114.4 ± 5.0", baselineName: "X-Fi + our degradation training" },
    ],
  },
  {
    id: "v2x",
    label: "V2X-Real",
    task: "Cooperative 3D detection from up to four nodes",
    video: "v2x_3d",
    videoLabel:
      "V2X-Real in 3D: the boxes of MakeSense (left) and Pyramid Fusion (right) over the LiDAR points of four " +
      "nodes, marked as hits, misses and false alarms",
    headline: "MakeSense detects best, alone or with four nodes",
    metrics: [{ label: "AP50 ↑", ours: "44.4 ± 1.2", baseline: "40.7 ± 1.1", baselineName: "Pyramid Fusion" }],
    note: "Within the baselines' 70 m range, MakeSense reaches 44.2 ± 1.2.",
  },
  {
    id: "mmaud",
    label: "MMAUD",
    task: "UAV localization",
    video: "mmaud_3d",
    videoLabel:
      "MMAUD in 3D: the drone positions reported by MakeSense (left) and MMUDCT (right) along the true track, " +
      "over the LiDAR scene",
    headline: "MakeSense reports the drone at every step",
    metrics: [
      { label: "Position error over all steps (m) ↓", ours: "11.99 ± 0.25", baseline: "17.48 ± 0.87", baselineName: "MMUDCT" },
      { label: "Steps with an output ↑", ours: "100 %", baseline: "51.0 ± 3.7 %", baselineName: "MMUDCT" },
    ],
    note: "On the steps where MMUDCT reports a position, it is more accurate (1.50 m against 8.13 m).",
  },
  {
    id: "he",
    label: "Humanoid-Everyday",
    task: "Next-command prediction for a humanoid",
    video: "he_3d",
    videoLabel:
      "Humanoid-Everyday in 3D: the arm command predicted by MakeSense and the true command, with the clean " +
      "camera input",
    headline: "MakeSense predicts the next command best",
    metrics: [
      { label: "nMSE, clean ↓", ours: "0.166 ± 0.005", baseline: "0.175 ± 0.003", baselineName: "ACT" },
      { label: "nMSE, RGB brightness fault ↓", ours: "0.170 ± 0.008", baseline: "0.183 ± 0.001", baselineName: "Late fusion" },
    ],
    note:
      "Copying the last command, which no learned model of the paper reads, is more accurate still. A world model " +
      "on the fused state forecasts that state more accurately than a linear baseline at the longer tested horizons.",
  },
  {
    id: "reli",
    label: "RELI11D",
    task: "3D human pose from RGB, event and LiDAR",
    video: "reli_3d",
    videoLabel: "RELI11D in 3D: the pose of MakeSense, the ground truth and the LiDAR points of the person, with the camera image",
    headline: "MakeSense fits the body best",
    metrics: [{ label: "PA-MPJPE (mm) ↓", ours: "35.7 ± 0.4", baseline: "52.2 ± 1.2", baselineName: "LiDARCap" }],
  },
];
