export const ITEM_CATEGORIES = [
  "싱어팀",
  "피아노",
  "드럼",
  "베이스",
  "일렉",
  "엔지니어팀",
  "기타",
] as const;

export const DEFAULT_ITEM_CATEGORY = "싱어팀";

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
