import { catalog } from "../data/catalog";
import type { AmplifyStat, CurrencyId, DungeonId, GameState, GearSlot, QuestStatus, TownId } from "../game/types";

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = "mydnf-save-v1";

export function saveGame(storage: SaveStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

const currencyIds: readonly CurrencyId[] = ["gold", "ironDust", "arcShard", "valorToken", "protectionTicket"];
const gearSlots: readonly GearSlot[] = [
  "weapon",
  "core",
  "head",
  "body",
  "legs",
  "belt",
  "boots",
  "necklace",
  "bracelet",
  "ring",
  "sigil",
  "charm"
];
const amplifyStats: readonly AmplifyStat[] = ["crit", "cooldown", "element", "moveSpeed"];
const questStatuses: readonly QuestStatus[] = ["locked", "active", "ready", "completed"];

const catalogGearIds = new Set(catalog.gear.map((item) => item.id));
const catalogQuestIds = new Set(catalog.quests.map((quest) => quest.id));
const dungeonIds = new Set<DungeonId>(catalog.dungeons.map((dungeon) => dungeon.id));
const townIds = new Set<TownId>(catalog.towns.map((town) => town.id));
const gearSlotIds = new Set<GearSlot>(gearSlots);
const amplifyStatIds = new Set<AmplifyStat>(amplifyStats);

function parseSave(rawSave: string): unknown {
  try {
    return JSON.parse(rawSave);
  } catch {
    throw new Error("Malformed save data: JSON parse failed");
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Malformed save data: ${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed save data: ${path} must be an array`);
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Malformed save data: ${path} must be a non-empty string`);
  }

  return value;
}

function requireFiniteNumber(value: unknown, path: string, min: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new Error(`Malformed save data: ${path} must be a finite number >= ${min}`);
  }

  return value;
}

function requireBoolean(value: unknown, path: string): void {
  if (typeof value !== "boolean") {
    throw new Error(`Malformed save data: ${path} must be a boolean`);
  }
}

function validateCurrencies(value: unknown): void {
  const currencies = requireRecord(value, "player.currencies");

  for (const currencyId of currencyIds) {
    if (typeof currencies[currencyId] !== "number" || !Number.isFinite(currencies[currencyId])) {
      throw new Error(`Malformed save data: player.currencies.${currencyId} must be numeric`);
    }
  }
}

function validateInventory(value: unknown): Set<string> {
  const inventory = requireArray(value, "player.inventory");
  const ownedInstanceIds = new Set<string>();

  inventory.forEach((itemValue, index) => {
    const item = requireRecord(itemValue, `player.inventory[${index}]`);
    const itemPath = `player.inventory[${index}]`;
    const instanceId = requireString(item.instanceId, `${itemPath}.instanceId`);
    const catalogGearId = requireString(item.catalogGearId, `${itemPath}.catalogGearId`);

    if (ownedInstanceIds.has(instanceId)) {
      throw new Error(`Malformed save data: duplicate instance id ${instanceId}`);
    }

    if (!catalogGearIds.has(catalogGearId)) {
      throw new Error(`Malformed save data: player.inventory[${index}].catalogGearId is not in catalog`);
    }

    requireFiniteNumber(item.reinforceLevel, `${itemPath}.reinforceLevel`, 0);
    requireFiniteNumber(item.amplifyLevel, `${itemPath}.amplifyLevel`, 0);
    requireBoolean(item.locked, `${itemPath}.locked`);
    requireBoolean(item.bound, `${itemPath}.bound`);
    requireBoolean(item.tradable, `${itemPath}.tradable`);
    requireBoolean(item.sealed, `${itemPath}.sealed`);

    if (item.amplifyStat !== undefined) {
      const amplifyStat = requireString(item.amplifyStat, `${itemPath}.amplifyStat`);

      if (!amplifyStatIds.has(amplifyStat as AmplifyStat)) {
        throw new Error(`Malformed save data: ${itemPath}.amplifyStat is not allowed`);
      }
    }

    ownedInstanceIds.add(instanceId);
  });

  return ownedInstanceIds;
}

function validateEquipmentRefs(value: unknown, path: string, ownedInstanceIds: Set<string>): void {
  const equipment = requireRecord(value, path);

  for (const [slot, instanceId] of Object.entries(equipment)) {
    if (!gearSlotIds.has(slot as GearSlot)) {
      throw new Error(`Malformed save data: ${path}.${slot} is not a valid gear slot`);
    }

    const ownedInstanceId = requireString(instanceId, `${path}.${slot}`);

    if (!ownedInstanceIds.has(ownedInstanceId)) {
      throw new Error(`Malformed save data: ${path} references inventory item that does not exist: ${ownedInstanceId}`);
    }
  }
}

function validateLoadouts(value: unknown, ownedInstanceIds: Set<string>): void {
  const loadouts = requireArray(value, "player.loadouts");

  if (loadouts.length !== 3) {
    throw new Error("Malformed save data: player.loadouts must contain exactly 3 entries");
  }

  loadouts.forEach((loadout, index) => validateEquipmentRefs(loadout, `player.loadouts[${index}]`, ownedInstanceIds));
}

function validateQuests(value: unknown): void {
  const quests = requireRecord(value, "player.quests");

  for (const [questId, status] of Object.entries(quests)) {
    if (!catalogQuestIds.has(questId)) {
      throw new Error(`Malformed save data: player.quests contains unknown quest id ${questId}`);
    }

    if (!questStatuses.includes(status as QuestStatus)) {
      throw new Error(`Malformed save data: player.quests.${questId} has invalid status`);
    }
  }
}

function validateUnlockedDungeons(value: unknown): void {
  const unlockedDungeons = requireArray(value, "player.unlockedDungeons");

  for (const dungeonId of unlockedDungeons) {
    if (typeof dungeonId !== "string" || !dungeonIds.has(dungeonId as DungeonId)) {
      throw new Error(`Malformed save data: player.unlockedDungeons contains unknown dungeon id ${String(dungeonId)}`);
    }
  }
}

function validateSave(value: unknown): GameState {
  const candidateRecord = requireRecord(value, "save");

  const candidate = candidateRecord as Partial<GameState>;

  if (candidate.version !== 1) {
    throw new Error("Incompatible save: expected version 1");
  }

  if (candidate.catalogId !== catalog.id) {
    throw new Error(`Incompatible save: expected catalog ${catalog.id}`);
  }

  const currentTown = requireString(candidate.currentTown, "currentTown");

  if (!townIds.has(currentTown as TownId)) {
    throw new Error("Malformed save data: currentTown must be a valid catalog town id");
  }

  if (
    candidate.currentDungeonId !== undefined &&
    !dungeonIds.has(requireString(candidate.currentDungeonId, "currentDungeonId") as DungeonId)
  ) {
    throw new Error("Malformed save data: currentDungeonId must be a valid catalog dungeon id");
  }

  if (!Array.isArray(candidate.seenTutorials) || candidate.seenTutorials.some((item) => typeof item !== "string")) {
    throw new Error("Malformed save data: seenTutorials must be a string array");
  }

  const player = requireRecord(candidate.player, "player");
  const heroId = requireString(player.heroId, "player.heroId");

  if (heroId !== catalog.hero.id) {
    throw new Error(`Malformed save data: player.heroId must be ${catalog.hero.id}`);
  }

  requireFiniteNumber(player.level, "player.level", 1);
  requireFiniteNumber(player.experience, "player.experience", 0);
  requireFiniteNumber(player.heat, "player.heat", 0);
  validateCurrencies(player.currencies);
  const ownedInstanceIds = validateInventory(player.inventory);
  validateEquipmentRefs(player.equipment, "player.equipment", ownedInstanceIds);
  validateLoadouts(player.loadouts, ownedInstanceIds);
  validateQuests(player.quests);
  validateUnlockedDungeons(player.unlockedDungeons);

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
