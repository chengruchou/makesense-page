import { useEffect } from "react";

// A silent clip loops only while it is on screen, never under reduced motion, and stays paused once the viewer paused
// it with its play / pause button. The element may change its source (the pickers swap clips): the observer stays on it.
export function useLoopInView(ref: { current: HTMLVideoElement | null }) {
  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pausedByViewer = false;
    let pausing = false;
    const onPause = () => {
      if (!pausing) pausedByViewer = true;
      pausing = false;
    };
    const onPlay = () => {
      pausedByViewer = false;
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!pausedByViewer) video.play().catch(() => {});
        } else if (!video.paused) {
          pausing = true;
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
    };
  }, [ref]);
}

// Swapping the source of a playing clip: remember where it was, and on the new clip's metadata seek to the same time
// and keep playing, so a viewer who switches a condition keeps the same moment and camera angle.
export function keepTime(video: HTMLVideoElement | null) {
  if (!video) return null;
  return { time: video.currentTime, playing: !video.paused };
}

export function restoreTime(video: HTMLVideoElement | null, saved: { time: number; playing: boolean } | null) {
  if (!video || !saved) return;
  if (Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = Math.min(saved.time, Math.max(0, video.duration - 0.05));
  }
  if (saved.playing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) video.play().catch(() => {});
}
