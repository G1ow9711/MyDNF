import { catalog } from "../data/catalog";
import type { GameState } from "../game/types";

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = "mydnf-save-v1";

export function saveGame(storage: SaveStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

function parseSave(rawSave: string): unknown {
  try {
    return JSON.parse(rawSave);
  } catch {
    throw new Error("Malformed save data: JSON parse failed");
  }
}

function validateSave(value: unknown): GameState {
  if (!value || typeof value !== "object") {
    throw new Error("Malformed save data: expected object");
  }

  const candidate = value as Partial<GameState>;

  if (candidate.version !== 1) {
    throw new Error("Incompatible save: expected version 1");
  }

  if (candidate.catalogId !== catalog.id) {
    throw new Error(`Incompatible save: expected catalog ${catalog.id}`);
  }

  return candidate as GameState;
}

export function loadGame(storage: SaveStorage): GameState | null {
  const rawSave = storage.getItem(SAVE_KEY);

  if (rawSave === null) {
    return null;
  }

  return validateSave(parseSave(rawSave));
}

export function clearSave(storage: SaveStorage): void {
  storage.removeItem(SAVE_KEY);
}
