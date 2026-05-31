import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  StageMapViewportContext,
  useStageMapViewport,
  type StageMapViewportContextValue,
} from "../context/StageMapViewportContext";
import { cn } from "./ui/utils";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.25;

function touchDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function isStageMapItem(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("[data-stage-map-item]");
}

type TouchMode = "none" | "pinch" | "pan";

function useViewportState(): StageMapViewportContextValue {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const touchState = useRef({
    mode: "none" as TouchMode,
    startDistance: 0,
    startScale: 1,
    startPan: { x: 0, y: 0 },
    startTouch: { x: 0, y: 0 },
  });

  useEffect(() => {
    scaleRef.current = scale;
    panRef.current = pan;
  }, [scale, pan]);

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => clampScale(s - ZOOM_STEP));
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchState.current = {
        mode: "pinch",
        startDistance: touchDistance(e.touches),
        startScale: scaleRef.current,
        startPan: { ...panRef.current },
        startTouch: { x: 0, y: 0 },
      };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && scaleRef.current > 1 && !isStageMapItem(e.target)) {
      touchState.current = {
        mode: "pan",
        startDistance: 0,
        startScale: scaleRef.current,
        startPan: { ...panRef.current },
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchState.current;

    if (state.mode === "pinch" && e.touches.length >= 2) {
      const distance = touchDistance(e.touches);
      if (state.startDistance > 0) {
        const nextScale = clampScale(state.startScale * (distance / state.startDistance));
        setScale(nextScale);
      }
      e.preventDefault();
      return;
    }

    if (state.mode === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - state.startTouch.x;
      const dy = e.touches[0].clientY - state.startTouch.y;
      setPan({
        x: state.startPan.x + dx,
        y: state.startPan.y + dy,
      });
      e.preventDefault();
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    touchState.current.mode = "none";
  }, []);

  return {
    scale,
    pan,
    zoomIn,
    zoomOut,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

export function StageMapViewportProvider({ children }: { children: ReactNode }) {
  const value = useViewportState();

  return (
    <StageMapViewportContext.Provider value={value}>{children}</StageMapViewportContext.Provider>
  );
}

export function StageMapCanvasScrollArea({ children }: { children: ReactNode }) {
  const { scale, pan, onTouchStart, onTouchMove, onTouchEnd } = useStageMapViewport();

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      <div
        className={cn(
          "flex-1 min-h-0 min-w-0 overflow-auto rounded-lg",
          "p-2 md:p-4",
          "bg-gray-50/80"
        )}
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="inline-block origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
