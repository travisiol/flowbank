"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { Pause, Play } from "lucide-react";

import { site } from "@/lib/site";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

/**
 * The hero’s two glass shapes. Pure CSS geometry (see .flowbank-shape in
 * globals.css); this component only drives the pointer tilt and the
 * play/pause state, and respects prefers-reduced-motion and hidden tabs.
 */
export function Sculpture() {
  const frame = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const motionAllowed = useSyncExternalStore(
    subscribeReducedMotion,
    () => !window.matchMedia(REDUCED).matches,
    () => false,
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  );

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const running = motionAllowed && !paused && visible;

  function resetTilt() {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    frame.current?.style.setProperty("--tilt-x", "0deg");
    frame.current?.style.setProperty("--tilt-y", "0deg");
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!running || event.pointerType !== "mouse" || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const tiltY = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    const tiltX = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      frame.current?.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      frame.current?.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    });
  }

  return (
    <div ref={frame} className="flowbank-motion" data-running={running} onPointerMove={onPointerMove} onPointerLeave={resetTilt}>
      <div className="flowbank-sculpture" role="img" aria-label={`${site.name}’s two overlapping emerald glass shapes`}>
        <div className="flowbank-shape flowbank-shape-back" />
        <div className="flowbank-shape flowbank-shape-front" />
      </div>
      {motionAllowed && (
        <button
          type="button"
          className="motion-toggle"
          aria-label={paused ? "Play logo animation" : "Pause logo animation"}
          title={paused ? "Play animation" : "Pause animation"}
          onClick={() => {
            resetTilt();
            setPaused(!paused);
          }}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </div>
  );
}
