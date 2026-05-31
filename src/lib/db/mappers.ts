import type { Item, Box } from "../../app/context/AppContext";
import type { ItemRow, BoxRow, StageElementRow } from "./types";
import type { ZoneSize } from "../../app/lib/zoneSize";
import { ZONE_SIZE_PRESETS } from "../../app/lib/zoneSize";

export function itemFromRow(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    prepared: row.status === "prepared",
    assignedBoxId: row.box_id ?? undefined,
  };
}

export function itemToRow(item: Item): ItemRow {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    status: item.prepared ? "prepared" : "pending",
    box_id: item.assignedBoxId ?? null,
    created_at: new Date().toISOString(),
  };
}

export function boxFromRow(row: BoxRow): Box {
  return {
    id: row.id,
    name: row.name,
    items: [],
    location: row.location,
    imageUrls: Array.isArray(row.photos) ? row.photos : [],
    placed: row.status === "placed",
  };
}

export function boxToRow(box: Box): BoxRow {
  return {
    id: box.id,
    name: box.name,
    category: "기타",
    location: box.location,
    photos: box.imageUrls,
    status: box.placed ? "placed" : "unplaced",
    created_at: new Date().toISOString(),
  };
}

export interface ZoneType {
  id: string;
  label: string;
  color: string;
}

export interface Zone {
  id: string;
  zoneTypeId: string;
  x: number;
  y: number;
  size: ZoneSize;
}

export interface BoxPosition {
  id: string;
  boxId: string;
  x: number;
  y: number;
}

export function zoneSizeFromDimensions(width: number, height: number): ZoneSize {
  const entries = Object.entries(ZONE_SIZE_PRESETS) as [ZoneSize, { width: number; height: number }][];
  const match = entries.find(([, d]) => d.width === width && d.height === height);
  return match?.[0] ?? "m";
}

export function stageLayoutFromRows(rows: StageElementRow[]): {
  zoneTypes: ZoneType[];
  zones: Zone[];
  boxPositions: BoxPosition[];
} {
  const zoneTypes: ZoneType[] = [];
  const zones: Zone[] = [];
  const boxPositions: BoxPosition[] = [];

  for (const row of rows) {
    if (row.type === "zone_type") {
      zoneTypes.push({ id: row.id, label: row.name, color: row.color });
    } else if (row.type === "zone") {
      zones.push({
        id: row.id,
        zoneTypeId: row.name,
        x: row.x,
        y: row.y,
        size: zoneSizeFromDimensions(row.width, row.height),
      });
    } else if (row.type === "box_position") {
      boxPositions.push({
        id: row.id,
        boxId: row.name,
        x: row.x,
        y: row.y,
      });
    }
  }

  return { zoneTypes, zones, boxPositions };
}

export function zoneTypeToRow(zt: ZoneType): StageElementRow {
  return {
    id: zt.id,
    type: "zone_type",
    name: zt.label,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: zt.color,
    created_at: new Date().toISOString(),
  };
}

export function zoneToRow(zone: Zone): StageElementRow {
  const dims = ZONE_SIZE_PRESETS[zone.size];
  return {
    id: zone.id,
    type: "zone",
    name: zone.zoneTypeId,
    x: zone.x,
    y: zone.y,
    width: dims.width,
    height: dims.height,
    color: "",
    created_at: new Date().toISOString(),
  };
}

export function boxPositionToRow(bp: BoxPosition): StageElementRow {
  return {
    id: bp.id,
    type: "box_position",
    name: bp.boxId,
    x: bp.x,
    y: bp.y,
    width: 100,
    height: 80,
    color: "",
    created_at: new Date().toISOString(),
  };
}
