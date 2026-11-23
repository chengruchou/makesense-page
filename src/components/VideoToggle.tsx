import { useEffect, useState } from "react";

// The play / pause button of an island's looping clip (WCAG 2.2.2), the same control as LoopVideo.astro: it sits
// over the clip, shows play while the clip is paused, and its label names the clip. The video may swap its source;
// the button follows the element's own state. Icons: Lucide play and pause (ISC License, https://lucide.dev/license),
// inlined so no icon set ships to the browser; the stylesheet fills them.
export default function VideoToggle({
  video,
  label,
}: {
  video: { current: HTMLVideoElement | null };
  label: string;
}) {
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const sync = () => setPaused(element.paused);
    const events = ["play", "pause", "emptied", "loadeddata"];
    for (const name of events) element.addEventListener(name, sync);
    sync();
    return () => {
      for (const name of events) element.removeEventListener(name, sync);
    };
  }, [video]);

  function toggle() {
    const element = video.current;
    if (!element) return;
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  }

  return (
    <button
      type="button"
      className="video-toggle"
      data-state={paused ? "paused" : "playing"}
      aria-label={`${paused ? "Play" : "Pause"}: ${label}`}
      onClick={toggle}
    >
      <svg className="icon icon-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
        />
      </svg>
      <svg className="icon icon-pause" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <rect width="5" height="18" x="14" y="3" rx="1" />
          <rect width="5" height="18" x="5" y="3" rx="1" />
        </g>
      </svg>
    </button>
  );
}
