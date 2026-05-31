export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      items: {
        Row: ItemRow;
        Insert: ItemRow;
        Update: Partial<ItemRow>;
      };
      boxes: {
        Row: BoxRow;
        Insert: BoxRow;
        Update: Partial<BoxRow>;
      };
      stage_elements: {
        Row: StageElementRow;
        Insert: StageElementRow;
        Update: Partial<StageElementRow>;
      };
    };
  };
}

export interface ItemRow {
  id: string;
  name: string;
  detail_name: string;
  category: string;
  quantity: number;
  status: string;
  box_id: string | null;
  created_at: string;
}

export interface BoxRow {
  id: string;
  name: string;
  category: string;
  location: string;
  photos: string[];
  status: string;
  created_at: string;
}

export interface StageElementRow {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  created_at: string;
}
