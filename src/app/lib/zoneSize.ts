export type ZoneSize = "s" | "m" | "l";

export const ZONE_SIZE_PRESETS: Record<
  ZoneSize,
  { width: number; height: number; label: string }
> = {
  s: { width: 120, height: 96, label: "S" },
  m: { width: 160, height: 128, label: "M" },
  l: { width: 200, height: 160, label: "L" },
};

export function normalizeZoneSize(size?: string): ZoneSize {
  if (size === "s" || size === "m" || size === "l") return size;
  return "m";
}

export function getZoneDimensions(size?: string) {
  return ZONE_SIZE_PRESETS[normalizeZoneSize(size)];
}
