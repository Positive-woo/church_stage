import { useCallback, useEffect, useState } from "react";
import { supabase, createId } from "../lib/supabase";
import {
  stageLayoutFromRows,
  zoneSizeFromDimensions,
  zoneTypeToRow,
  zoneToRow,
  boxPositionToRow,
  type ZoneType,
  type Zone,
  type BoxPosition,
} from "../lib/db/mappers";
import type { StageElementRow } from "../lib/db/types";
import type { ZoneSize } from "../lib/zoneSize";

const defaultZoneTypes: ZoneType[] = [
  { id: "stage", label: "무대", color: "bg-purple-100 border-purple-400 text-purple-800" },
  { id: "seats", label: "객석", color: "bg-blue-100 border-blue-400 text-blue-800" },
  { id: "soundbooth", label: "사운드부스", color: "bg-green-100 border-green-400 text-green-800" },
  { id: "entrance", label: "출입구", color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  { id: "restroom", label: "화장실", color: "bg-gray-100 border-gray-400 text-gray-800" },
];

async function seedDefaultZoneTypes() {
  const rows = defaultZoneTypes.map(zoneTypeToRow);
  await supabase.from("stage_elements").upsert(rows);
}

export function useStageLayout(isEditMode = true) {
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>(defaultZoneTypes);
  const [zones, setZones] = useState<Zone[]>([]);
  const [boxPositions, setBoxPositions] = useState<BoxPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: rows, error: fetchError } = await supabase
        .from("stage_elements")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError?.message?.includes("statement timeout") && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const layout = stageLayoutFromRows((rows ?? []) as StageElementRow[]);

      if (layout.zoneTypes.length === 0 && isEditMode) {
        await seedDefaultZoneTypes();
        const { data: seeded } = await supabase
          .from("stage_elements")
          .select("*")
          .eq("type", "zone_type");
        const seededLayout = stageLayoutFromRows((seeded ?? []) as StageElementRow[]);
        setZoneTypes(seededLayout.zoneTypes.length ? seededLayout.zoneTypes : defaultZoneTypes);
      } else if (layout.zoneTypes.length === 0) {
        setZoneTypes(defaultZoneTypes);
      } else {
        setZoneTypes(layout.zoneTypes);
      }

      setZones(layout.zones);
      setBoxPositions(layout.boxPositions);
      setError(null);
      return;
    }
  }, [isEditMode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      await fetchAll();
      if (!cancelled) setLoading(false);
    })();

    const channel = supabase
      .channel("realtime-stage-elements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stage_elements" }, ({ new: row }) => {
        const r = row as StageElementRow;
        if (r.type === "zone_type") {
          setZoneTypes((prev) => [...prev, { id: r.id, label: r.name, color: r.color }]);
        } else if (r.type === "zone") {
          setZones((prev) => [...prev, { id: r.id, zoneTypeId: r.name, x: r.x, y: r.y, size: zoneSizeFromDimensions(r.width, r.height) }]);
        } else if (r.type === "box_position") {
          setBoxPositions((prev) => [...prev, { id: r.id, boxId: r.name, x: r.x, y: r.y }]);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stage_elements" }, ({ new: row }) => {
        const r = row as StageElementRow;
        if (r.type === "zone_type") {
          setZoneTypes((prev) => prev.map((zt) => zt.id === r.id ? { id: r.id, label: r.name, color: r.color } : zt));
        } else if (r.type === "zone") {
          setZones((prev) => prev.map((z) => z.id === r.id ? { id: r.id, zoneTypeId: r.name, x: r.x, y: r.y, size: zoneSizeFromDimensions(r.width, r.height) } : z));
        } else if (r.type === "box_position") {
          setBoxPositions((prev) => prev.map((bp) => bp.id === r.id ? { id: r.id, boxId: r.name, x: r.x, y: r.y } : bp));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "stage_elements" }, ({ old: row }) => {
        const id = (row as { id: string }).id;
        setZoneTypes((prev) => prev.filter((zt) => zt.id !== id));
        setZones((prev) => prev.filter((z) => z.id !== id));
        setBoxPositions((prev) => prev.filter((bp) => bp.id !== id));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const upsertElement = async (row: StageElementRow) => {
    if (!isEditMode) return;

    const { error: upsertError } = await supabase.from("stage_elements").upsert(row);
    if (upsertError) setError(upsertError.message);
  };

  const deleteElement = async (id: string) => {
    if (!isEditMode) return;

    const { error: deleteError } = await supabase
      .from("stage_elements")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
  };

  const addZone = async (zoneTypeId: string, size: ZoneSize, x: number, y: number) => {
    const zone: Zone = {
      id: createId(),
      zoneTypeId,
      size,
      x,
      y,
    };
    await upsertElement(zoneToRow(zone));
  };

  const updateZone = async (zone: Zone) => {
    await upsertElement(zoneToRow(zone));
  };

  const deleteZone = async (id: string) => {
    await deleteElement(id);
  };

  const addZoneType = async (zoneType: ZoneType) => {
    await upsertElement(zoneTypeToRow(zoneType));
  };

  const updateZoneType = async (zoneType: ZoneType) => {
    await upsertElement(zoneTypeToRow(zoneType));
  };

  const deleteZoneType = async (zoneTypeId: string) => {
    const zonesToDelete = zones.filter((z) => z.zoneTypeId === zoneTypeId);
    for (const zone of zonesToDelete) {
      await deleteElement(zone.id);
    }
    await deleteElement(zoneTypeId);
  };

  const addBoxPosition = async (boxId: string, x: number, y: number) => {
    const bp: BoxPosition = { id: createId(), boxId, x, y };
    await upsertElement(boxPositionToRow(bp));
  };

  const updateBoxPosition = async (bp: BoxPosition) => {
    await upsertElement(boxPositionToRow(bp));
  };

  const deleteBoxPosition = async (id: string) => {
    await deleteElement(id);
  };

  return {
    zoneTypes,
    zones,
    boxPositions,
    loading,
    error,
    addZone,
    updateZone,
    deleteZone,
    addZoneType,
    updateZoneType,
    deleteZoneType,
    addBoxPosition,
    updateBoxPosition,
    deleteBoxPosition,
    refetch: fetchAll,
  };
}
