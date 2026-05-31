export function getStageMapCanvas() {
  return document.getElementById("stage-map-canvas");
}

export function getCanvasLogicalSize(canvas: HTMLElement) {
  return {
    width: canvas.offsetWidth,
    height: canvas.offsetHeight,
  };
}

/** 화면 좌표 → 캔버스 논리 좌표 (확대/축소 반영) */
export function clientToCanvasPosition(
  clientX: number,
  clientY: number,
  scale: number,
  offsetX = 0,
  offsetY = 0
) {
  const canvas = getStageMapCanvas();
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / scale - offsetX / scale;
  const y = (clientY - rect.top) / scale - offsetY / scale;
  return { x, y };
}

export function clampCanvasPosition(
  x: number,
  y: number,
  itemWidth: number,
  itemHeight: number
) {
  const canvas = getStageMapCanvas();
  if (!canvas) return { x, y };

  const { width, height } = getCanvasLogicalSize(canvas);
  return {
    x: Math.max(0, Math.min(width - itemWidth, x)),
    y: Math.max(0, Math.min(height - itemHeight, y)),
  };
}
