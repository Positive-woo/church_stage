import { createContext, useContext, type TouchEvent } from "react";

export interface StageMapViewportContextValue {
  scale: number;
  pan: { x: number; y: number };
  zoomIn: () => void;
  zoomOut: () => void;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

const noopTouch = () => {};

export const StageMapViewportContext = createContext<StageMapViewportContextValue>({
  scale: 1,
  pan: { x: 0, y: 0 },
  zoomIn: () => {},
  zoomOut: () => {},
  onTouchStart: noopTouch,
  onTouchMove: noopTouch,
  onTouchEnd: noopTouch,
});

export function useStageMapViewport() {
  return useContext(StageMapViewportContext);
}
