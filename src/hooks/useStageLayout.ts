import { useCallback, useEffect, useState } from "react";
import { supabase, createId } from "../lib/supabase";
import {
  stageLayoutFromRows,
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

export function useStageLayout() {
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>(defaultZoneTypes);
  const [zones, setZones] = useState<Zone[]>([]);
  const [boxPositions, setBoxPositions] = useState<BoxPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: rows, error: fetchError } = await supabase
      .from("stage_elements")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const layout = stageLayoutFromRows((rows ?? []) as StageElementRow[]);

    if (layout.zoneTypes.length === 0) {
      await seedDefaultZoneTypes();
      const { data: seeded } = await supabase
        .from("stage_elements")
        .select("*")
        .eq("type", "zone_type");
      const seededLayout = stageLayoutFromRows((seeded ?? []) as StageElementRow[]);
      setZoneTypes(seededLayout.zoneTypes.length ? seededLayout.zoneTypes : defaultZoneTypes);
    } else {
      setZoneTypes(layout.zoneTypes);
    }

    setZones(layout.zones);
    setBoxPositions(layout.boxPositions);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      await fetchAll();
      if (!cancelled) setLoading(false);
    })();

    const channel = supabase
      .channel("realtime-stage-elements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stage_elements" },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const upsertElement = async (row: StageElementRow) => {
    const { error: upsertError } = await supabase.from("stage_elements").upsert(row);
    if (upsertError) setError(upsertError.message);
  };

  const deleteElement = async (id: string) => {
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
