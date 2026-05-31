import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase, createId } from "../../lib/supabase";
import { itemFromRow, itemToRow, boxFromRow, boxToRow } from "../../lib/db/mappers";
import type { ItemRow, BoxRow } from "../../lib/db/types";

export interface Item {
  id: string;
  name: string;
  detailName: string;
  category: string;
  quantity: number;
  prepared: boolean;
  assignedBoxId?: string;
}

export interface BoxItem {
  name: string;
  quantity: number;
}

export interface Box {
  id: string;
  name: string;
  items: BoxItem[];
  location: string;
  imageUrls: string[];
  placed: boolean;
}

interface AppContextType {
  items: Item[];
  boxes: Box[];
  loading: boolean;
  error: string | null;
  setItems: (items: Item[]) => void;
  setBoxes: (boxes: Box[]) => void;
  addItem: (item: Omit<Item, "id">) => Promise<boolean>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addBox: (box: Omit<Box, "id" | "items" | "imageUrls" | "placed">) => Promise<boolean>;
  updateBox: (box: Box) => Promise<void>;
  deleteBox: (id: string) => Promise<void>;
  assignItemToBox: (itemId: string, boxId: string | undefined) => Promise<void>;
  getItemsForBox: (boxId: string) => Item[];
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [itemsRes, boxesRes] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: true }),
      supabase.from("boxes").select("*").order("created_at", { ascending: true }),
    ]);

    if (itemsRes.error || boxesRes.error) {
      setError(itemsRes.error?.message ?? boxesRes.error?.message ?? "데이터 로드 실패");
      return;
    }

    setItems((itemsRes.data as ItemRow[]).map(itemFromRow));
    setBoxes((boxesRes.data as BoxRow[]).map(boxFromRow));
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
      .channel("realtime-app-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "boxes" }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addItem = async (item: Omit<Item, "id">) => {
    const newItem: Item = { ...item, id: createId() };
    const row = itemToRow(newItem);
    const { error: insertError } = await supabase.from("items").insert({
      id: row.id,
      name: row.name,
      detail_name: row.detail_name,
      category: row.category,
      quantity: row.quantity,
      status: row.status,
      box_id: row.box_id,
    });
    if (insertError) {
      setError(insertError.message);
      return false;
    }
    await fetchAll();
    return true;
  };

  const updateItem = async (item: Item) => {
    const { error: updateError } = await supabase
      .from("items")
      .update({
        name: item.name,
        detail_name: item.detailName,
        category: item.category,
        quantity: item.quantity,
        status: item.prepared ? "prepared" : "pending",
        box_id: item.assignedBoxId ?? null,
      })
      .eq("id", item.id);
    if (updateError) setError(updateError.message);
  };

  const deleteItem = async (id: string) => {
    const { error: deleteError } = await supabase.from("items").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
  };

  const addBox = async (box: Omit<Box, "id" | "items" | "imageUrls" | "placed">) => {
    const newBox: Box = {
      ...box,
      id: createId(),
      items: [],
      imageUrls: [],
      placed: false,
    };
    const { error: insertError } = await supabase.from("boxes").insert({
      id: newBox.id,
      name: newBox.name,
      category: "기타",
      location: newBox.location,
      photos: [],
      status: "unplaced",
    });
    if (insertError) {
      setError(insertError.message);
      return false;
    }
    await fetchAll();
    return true;
  };

  const updateBox = async (box: Box) => {
    const { error: updateError } = await supabase
      .from("boxes")
      .update({
        name: box.name,
        location: box.location,
        photos: box.imageUrls,
        status: box.placed ? "placed" : "unplaced",
      })
      .eq("id", box.id);
    if (updateError) setError(updateError.message);
  };

  const deleteBox = async (id: string) => {
    const assignedItems = items.filter((item) => item.assignedBoxId === id);
    for (const item of assignedItems) {
      await updateItem({ ...item, assignedBoxId: undefined });
    }
    const { error: deleteError } = await supabase.from("boxes").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
  };

  const assignItemToBox = async (itemId: string, boxId: string | undefined) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    await updateItem({ ...item, assignedBoxId: boxId });
  };

  const getItemsForBox = (boxId: string) => {
    return items.filter((item) => item.assignedBoxId === boxId);
  };

  return (
    <AppContext.Provider
      value={{
        items,
        boxes,
        loading,
        error,
        setItems,
        setBoxes,
        addItem,
        updateItem,
        deleteItem,
        addBox,
        updateBox,
        deleteBox,
        assignItemToBox,
        getItemsForBox,
        refetch: fetchAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
