export const ITEM_CATEGORIES = [
  "싱어팀",
  "악기팀",
  "엔지니어팀",
  "기타",
] as const;

export const DEFAULT_ITEM_CATEGORY = "싱어팀";

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const LEGACY_INSTRUMENT_CATEGORIES = new Set(["피아노", "드럼", "베이스", "일렉"]);

export function normalizeItemCategory(category: string): string {
  return LEGACY_INSTRUMENT_CATEGORIES.has(category) ? "악기팀" : category;
}
