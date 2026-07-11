import { catalog } from "../data/catalog";
import { defaultConsumables } from "../game/state";
import type {
  AmplifyStat,
  AuctionPriceRecord,
  AdvancementId,
  AuctionStatus,
  ClassId,
  ConsumableId,
  CurrencyId,
  DungeonId,
  GameState,
  GearSlot,
  QuestStatus,
  TownId
} from "../game/types";
import { isKnownAdvancementId, isKnownClassId } from "./classes";
import { normalizeAuctionPriceRecords } from "./market";
import { isKnownBoxId } from "./shop";

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = "mydnf-save-v1";

export function saveGame(storage: SaveStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

const currencyIds: readonly CurrencyId[] = ["gold", "ironDust", "arcShard", "valorToken", "tradeCredit", "protectionTicket"];
const consumableIds: readonly ConsumableId[] = ["healing-potion", "revival-token"];
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
const auctionStatuses: readonly AuctionStatus[] = ["listed", "sold", "expired"];

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

function validateStringArray(value: unknown, path: string): void {
  const items = requireArray(value, path);

  if (items.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`Malformed save data: ${path} must be a string array`);
  }
}

function validateKnownBoxNumberRecord(value: unknown, path: string): void {
  const record = requireRecord(value, path);

  for (const [boxId, amount] of Object.entries(record)) {
    if (!isKnownBoxId(boxId)) {
      throw new Error(`Malformed save data: ${path} contains unknown box ${boxId}`);
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
      throw new Error(`Malformed save data: ${path}.${boxId} must be a non-negative integer`);
    }
  }
}

function validatePartialCurrencyRecord(value: unknown, path: string): void {
  const record = requireRecord(value, path);

  for (const [currencyId, amount] of Object.entries(record)) {
    if (
      !currencyIds.includes(currencyId as CurrencyId) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      throw new Error(`Malformed save data: ${path}.${currencyId} must be a valid currency amount`);
    }
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

function validateConsumables(value: unknown): Record<ConsumableId, number> {
  if (value === undefined) {
    return { ...defaultConsumables };
  }

  const consumables = requireRecord(value, "player.consumables");
  const normalized = {} as Record<ConsumableId, number>;

  for (const consumableId of consumableIds) {
    const amount = consumables[consumableId];
    normalized[consumableId] =
      amount === undefined ? defaultConsumables[consumableId] : requireFiniteNumber(amount, `player.consumables.${consumableId}`, 0);
  }

  for (const consumableId of Object.keys(consumables)) {
    if (!consumableIds.includes(consumableId as ConsumableId)) {
      throw new Error(`Malformed save data: player.consumables contains unknown consumable ${consumableId}`);
    }
  }

  return normalized;
}

function validateOwnedGearItem(value: unknown, path: string): string {
  const item = requireRecord(value, path);
  const instanceId = requireString(item.instanceId, `${path}.instanceId`);
  const catalogGearId = requireString(item.catalogGearId, `${path}.catalogGearId`);

  if (!catalogGearIds.has(catalogGearId)) {
    throw new Error(`Malformed save data: ${path}.catalogGearId is not in catalog`);
  }

  requireFiniteNumber(item.reinforceLevel, `${path}.reinforceLevel`, 0);
  requireFiniteNumber(item.amplifyLevel, `${path}.amplifyLevel`, 0);
  requireBoolean(item.locked, `${path}.locked`);
  requireBoolean(item.bound, `${path}.bound`);
  requireBoolean(item.tradable, `${path}.tradable`);
  requireBoolean(item.sealed, `${path}.sealed`);

  if (item.amplifyStat !== undefined) {
    const amplifyStat = requireString(item.amplifyStat, `${path}.amplifyStat`);

    if (!amplifyStatIds.has(amplifyStat as AmplifyStat)) {
      throw new Error(`Malformed save data: ${path}.amplifyStat is not allowed`);
    }
  }

  return instanceId;
}

function validateInventory(value: unknown): Set<string> {
  const inventory = requireArray(value, "player.inventory");
  const ownedInstanceIds = new Set<string>();

  inventory.forEach((itemValue, index) => {
    const itemPath = `player.inventory[${index}]`;
    const instanceId = validateOwnedGearItem(itemValue, itemPath);

    if (ownedInstanceIds.has(instanceId)) {
      throw new Error(`Malformed save data: duplicate instance id ${instanceId}`);
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

  for (const questId of catalogQuestIds) {
    if (quests[questId] === undefined) {
      throw new Error(`Malformed save data: missing quest status ${questId}`);
    }
  }

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

function classResourceMax(classId: ClassId): number {
  return catalog.classes.find((classDef) => classDef.id === classId)?.resource.max ?? 100;
}

function normalizeClassResourceValue(classId: ClassId, value: number): number {
  return Math.min(classResourceMax(classId), Math.max(0, Math.round(value)));
}

function validateClassResources(value: unknown, currentClassId: ClassId, currentHeat: number): Partial<Record<ClassId, number>> {
  if (value === undefined) {
    return {
      [currentClassId]: normalizeClassResourceValue(currentClassId, currentHeat)
    };
  }

  const record = requireRecord(value, "player.classResources");
  const classResources: Partial<Record<ClassId, number>> = {};

  for (const [classId, amount] of Object.entries(record)) {
    if (!isKnownClassId(classId)) {
      throw new Error(`Malformed save data: player.classResources contains unknown class ${classId}`);
    }

    classResources[classId] = normalizeClassResourceValue(
      classId,
      requireFiniteNumber(amount, `player.classResources.${classId}`, 0)
    );
  }

  if (classResources[currentClassId] === undefined) {
    classResources[currentClassId] = normalizeClassResourceValue(currentClassId, currentHeat);
  }

  return classResources;
}

function validateTradeBoard(value: unknown): void {
  const tradeBoard = requireRecord(value, "market.tradeBoard");
  requireString(tradeBoard.id, "market.tradeBoard.id");
  requireString(tradeBoard.seed, "market.tradeBoard.seed");

  const offers = requireArray(tradeBoard.offers, "market.tradeBoard.offers");

  for (const [index, offerValue] of offers.entries()) {
    const path = `market.tradeBoard.offers[${index}]`;
    const offer = requireRecord(offerValue, path);

    requireString(offer.id, `${path}.id`);
    requireString(offer.label, `${path}.label`);
    validatePartialCurrencyRecord(offer.cost, `${path}.cost`);
    validatePartialCurrencyRecord(offer.reward, `${path}.reward`);
  }
}

function validateAuctions(value: unknown, ownedInstanceIds: Set<string>): void {
  const auctions = requireArray(value, "market.auctions");
  const escrowedInstanceIds = new Set<string>();

  for (const [index, auctionValue] of auctions.entries()) {
    const path = `market.auctions[${index}]`;
    const auction = requireRecord(auctionValue, path);
    const itemId = requireString(auction.itemId, `${path}.itemId`);
    const status = requireString(auction.status, `${path}.status`);
    const escrowedItemId = validateOwnedGearItem(auction.ownedItem, `${path}.ownedItem`);

    requireString(auction.id, `${path}.id`);
    requireFiniteNumber(auction.price, `${path}.price`, 1);
    requireFiniteNumber(auction.fee, `${path}.fee`, 0);
    requireFiniteNumber(auction.listedAtTurn, `${path}.listedAtTurn`, 0);

    if (!auctionStatuses.includes(status as AuctionStatus)) {
      throw new Error(`Malformed save data: ${path}.status is not allowed`);
    }

    if (itemId !== escrowedItemId) {
      throw new Error(`Malformed save data: ${path}.itemId must match ${path}.ownedItem.instanceId`);
    }

    if (ownedInstanceIds.has(escrowedItemId) || escrowedInstanceIds.has(escrowedItemId)) {
      throw new Error(`Malformed save data: auction escrow duplicates owned item ${escrowedItemId}`);
    }

    escrowedInstanceIds.add(escrowedItemId);
  }
}

function validateAuctionPriceHistory(value: unknown): void {
  const priceHistory = requireRecord(value, "market.priceHistory");

  for (const [catalogGearId, recordsValue] of Object.entries(priceHistory)) {
    if (!catalogGearIds.has(catalogGearId)) {
      throw new Error(`Malformed save data: market.priceHistory contains unknown catalog gear id ${catalogGearId}`);
    }

    const records = requireArray(recordsValue, `market.priceHistory.${catalogGearId}`);

    for (const [index, recordValue] of records.entries()) {
      const path = `market.priceHistory.${catalogGearId}[${index}]`;
      const record = requireRecord(recordValue, path);
      const recordCatalogGearId = requireString(record.catalogGearId, `${path}.catalogGearId`);

      if (recordCatalogGearId !== catalogGearId) {
        throw new Error(`Malformed save data: ${path}.catalogGearId must match history key`);
      }

      requireFiniteNumber(record.price, `${path}.price`, 1);
      requireFiniteNumber(record.turn, `${path}.turn`, 0);
    }
  }
}

function validateMarket(value: unknown, ownedInstanceIds: Set<string>): void {
  const market = requireRecord(value, "market");

  validateTradeBoard(market.tradeBoard);
  validateAuctions(market.auctions, ownedInstanceIds);
  if (market.priceHistory !== undefined) {
    validateAuctionPriceHistory(market.priceHistory);
  }
  requireFiniteNumber(market.auctionSequence, "market.auctionSequence", 1);
  requireFiniteNumber(market.turn, "market.turn", 0);
}

function normalizeLoadedAuctionPriceHistory(value: unknown): Record<string, AuctionPriceRecord[]> {
  if (value === undefined) {
    return {};
  }

  const priceHistory = requireRecord(value, "market.priceHistory");

  return Object.fromEntries(
    Object.entries(priceHistory).map(([catalogGearId, recordsValue]) => [
      catalogGearId,
      normalizeAuctionPriceRecords(recordsValue as AuctionPriceRecord[])
    ])
  );
}

function validateShop(value: unknown): void {
  const shop = requireRecord(value, "shop");

  validateStringArray(shop.ownedCosmetics, "shop.ownedCosmetics");
  validateKnownBoxNumberRecord(shop.boxes, "shop.boxes");
  validateKnownBoxNumberRecord(shop.boxPity, "shop.boxPity");
  validateStringArray(shop.purchasedSkus, "shop.purchasedSkus");
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

  validateStringArray(candidate.seenTutorials, "seenTutorials");

  const player = requireRecord(candidate.player, "player");
  const heroId = requireString(player.heroId, "player.heroId");
  const classId = requireString(player.classId, "player.classId");

  if (!isKnownClassId(classId)) {
    throw new Error(`Malformed save data: player.classId is not known: ${classId}`);
  }

  if (heroId !== classId) {
    throw new Error("Malformed save data: player.heroId must match player.classId");
  }

  if (player.advancementId !== undefined) {
    const advancementId = requireString(player.advancementId, "player.advancementId");

    if (!isKnownAdvancementId(advancementId)) {
      throw new Error(`Malformed save data: player.advancementId is not known: ${advancementId}`);
    }

    const advancement = catalog.classes
      .flatMap((classDef) => classDef.advancements)
      .find((item) => item.id === (advancementId as AdvancementId));

    if (advancement?.classId !== classId) {
      throw new Error("Malformed save data: player.advancementId does not belong to player.classId");
    }
  }

  requireFiniteNumber(player.level, "player.level", 1);
  requireFiniteNumber(player.experience, "player.experience", 0);
  const playerHeat = requireFiniteNumber(player.heat, "player.heat", 0);
  const classResources = validateClassResources(player.classResources, classId, playerHeat);
  const currentHeat = classResources[classId] ?? normalizeClassResourceValue(classId, playerHeat);
  validateCurrencies(player.currencies);
  const consumables = validateConsumables(player.consumables);
  const ownedInstanceIds = validateInventory(player.inventory);
  validateEquipmentRefs(player.equipment, "player.equipment", ownedInstanceIds);
  validateLoadouts(player.loadouts, ownedInstanceIds);
  validateQuests(player.quests);
  validateUnlockedDungeons(player.unlockedDungeons);
  validateMarket(candidate.market, ownedInstanceIds);
  validateShop(candidate.shop);

  const market = requireRecord(candidate.market, "market");

  return {
    ...candidate,
    player: {
      ...player,
      heat: currentHeat,
      classResources,
      consumables
    },
    market: {
      ...market,
      priceHistory: normalizeLoadedAuctionPriceHistory(market.priceHistory)
    }
  } as GameState;
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
