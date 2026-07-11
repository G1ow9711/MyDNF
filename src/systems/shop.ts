import { addOwnedGear } from "../game/state";
import type { ConsumableId, CurrencyId, CurrencyState, GameState, Rarity, ShopState } from "../game/types";

interface ShopSkuDefinition {
  sku: string;
  cost: Partial<Record<CurrencyId, number>>;
  contents: {
    currencies?: Partial<Record<CurrencyId, number>>;
    gear?: string[];
    cosmetics?: string[];
    boxes?: Record<string, number>;
    consumables?: Partial<Record<ConsumableId, number>>;
  };
}

interface BoxAwardDefinition {
  rarity: Rarity;
  rate: number;
  catalogGearId: string;
}

interface BoxDefinition {
  boxId: string;
  pityThreshold: number;
  awards: BoxAwardDefinition[];
}

export interface BoxRates {
  boxId: string;
  pityThreshold: number;
  entries: Array<{
    rarity: Rarity;
    rate: number;
  }>;
}

export interface BoxOpenResult {
  state: GameState;
  boxId: string;
  award: {
    rarity: Rarity;
    catalogGearId: string;
    instanceId: string;
  };
}

const shopSkus: ShopSkuDefinition[] = [
  {
    sku: "liuli-gift-pack",
    cost: { valorToken: 3 },
    contents: {
      currencies: { ironDust: 80, arcShard: 4, protectionTicket: 2 },
      gear: ["epic-liuli-flow-ring"],
      cosmetics: ["liuli-market-coat"],
      boxes: { "ember-mythic-box": 3 },
      consumables: { "healing-potion": 2, "revival-token": 1 }
    }
  },
  {
    sku: "reinforcement-pack",
    cost: { valorToken: 1 },
    contents: {
      currencies: { gold: 500, ironDust: 120, protectionTicket: 1 }
    }
  },
  {
    sku: "forge-costume-pack",
    cost: { valorToken: 2 },
    contents: {
      cosmetics: ["forge-market-formal"],
      boxes: { "ember-mythic-box": 1 }
    }
  },
  {
    sku: "healing-potion-bundle",
    cost: { gold: 180 },
    contents: {
      consumables: { "healing-potion": 3 }
    }
  },
  {
    sku: "revival-token",
    cost: { valorToken: 1 },
    contents: {
      consumables: { "revival-token": 1 }
    }
  }
];

const boxes: BoxDefinition[] = [
  {
    boxId: "ember-mythic-box",
    pityThreshold: 20,
    awards: [
      { rarity: "common", rate: 0.55, catalogGearId: "common-ash-weapon" },
      { rarity: "rare", rate: 0.3, catalogGearId: "rare-red-ore-ring" },
      { rarity: "epic", rate: 0.13, catalogGearId: "epic-ember-artisan-ring" },
      { rarity: "mythic", rate: 0.02, catalogGearId: "mythic-ember-artisan-ring" }
    ]
  }
];

function defaultShop(): ShopState {
  return {
    ownedCosmetics: [],
    boxes: {},
    boxPity: {},
    purchasedSkus: []
  };
}

function getShop(state: GameState): ShopState {
  return state.shop ?? defaultShop();
}

function assertEnoughCurrency(currencies: CurrencyState, cost: Partial<Record<CurrencyId, number>>, sku: string): void {
  for (const [currencyId, amount] of Object.entries(cost) as Array<[CurrencyId, number]>) {
    if (currencies[currencyId] < amount) {
      throw new Error(`Insufficient ${currencyId} for shop item ${sku}: need ${amount}, have ${currencies[currencyId]}`);
    }
  }
}

function applyCurrencyContents(
  currencies: CurrencyState,
  cost: Partial<Record<CurrencyId, number>>,
  reward: Partial<Record<CurrencyId, number>> = {}
): CurrencyState {
  const next = { ...currencies };

  for (const [currencyId, amount] of Object.entries(cost) as Array<[CurrencyId, number]>) {
    next[currencyId] -= amount;
  }

  for (const [currencyId, amount] of Object.entries(reward) as Array<[CurrencyId, number]>) {
    next[currencyId] += amount;
  }

  return next;
}

function addBoxes(current: Record<string, number>, boxesToAdd: Record<string, number> = {}): Record<string, number> {
  const next = { ...current };

  for (const [boxId, count] of Object.entries(boxesToAdd)) {
    next[boxId] = (next[boxId] ?? 0) + count;
  }

  return next;
}

function findBox(boxId: string): BoxDefinition {
  const box = boxes.find((item) => item.boxId === boxId);

  if (!box) {
    throw new Error(`Unknown random box: ${boxId}`);
  }

  return box;
}

export function isKnownBoxId(boxId: string): boolean {
  return boxes.some((item) => item.boxId === boxId);
}

function normalizeRoll(roll: number): number {
  if (!Number.isFinite(roll)) {
    return 0;
  }

  return Math.min(Math.max(roll, 0), 0.999999);
}

function chooseAward(box: BoxDefinition, roll: number): BoxAwardDefinition {
  const normalized = normalizeRoll(roll);
  let cumulative = 0;

  for (const award of box.awards) {
    cumulative += award.rate;
    if (normalized < cumulative) {
      return award;
    }
  }

  return box.awards[box.awards.length - 1];
}

function mythicAward(box: BoxDefinition): BoxAwardDefinition {
  const award = box.awards.find((entry) => entry.rarity === "mythic");

  if (!award) {
    throw new Error(`Random box has no mythic pity award: ${box.boxId}`);
  }

  return award;
}

export function buyShopItem(state: GameState, sku: string): GameState {
  const item = shopSkus.find((entry) => entry.sku === sku);

  if (!item) {
    throw new Error(`Unknown shop item: ${sku}`);
  }

  assertEnoughCurrency(state.player.currencies, item.cost, sku);

  const shop = getShop(state);
  const ownedCosmetics = new Set(shop.ownedCosmetics);

  for (const cosmeticId of item.contents.cosmetics ?? []) {
    ownedCosmetics.add(cosmeticId);
  }

  let next: GameState = {
    ...state,
    shop: {
      ...shop,
      ownedCosmetics: [...ownedCosmetics],
      boxes: addBoxes(shop.boxes, item.contents.boxes),
      purchasedSkus: [...shop.purchasedSkus, sku]
    },
    player: {
      ...state.player,
      currencies: applyCurrencyContents(state.player.currencies, item.cost, item.contents.currencies),
      consumables: Object.entries(item.contents.consumables ?? {}).reduce(
        (consumables, [consumableId, amount]) => ({
          ...consumables,
          [consumableId]: (consumables[consumableId as ConsumableId] ?? 0) + amount
        }),
        state.player.consumables
      ) as Record<ConsumableId, number>
    }
  };

  for (const catalogGearId of item.contents.gear ?? []) {
    next = addOwnedGear(next, catalogGearId);
  }

  return next;
}

export function getBoxRates(boxId: string): BoxRates {
  const box = findBox(boxId);

  return {
    boxId,
    pityThreshold: box.pityThreshold,
    entries: box.awards.map((award) => ({
      rarity: award.rarity,
      rate: award.rate
    }))
  };
}

export function openRandomBox(state: GameState, boxId: string, rng: () => number): BoxOpenResult {
  const box = findBox(boxId);
  const shop = getShop(state);
  const boxCount = shop.boxes[boxId] ?? 0;

  if (boxCount <= 0) {
    throw new Error(`No random boxes available: ${boxId}`);
  }

  const currentPity = shop.boxPity[boxId] ?? 0;
  const rolledAward = chooseAward(box, rng());
  const award = rolledAward.rarity !== "mythic" && currentPity + 1 >= box.pityThreshold
    ? mythicAward(box)
    : rolledAward;
  const nextPity = award.rarity === "mythic" ? 0 : currentPity + 1;
  const stateWithBoxConsumed: GameState = {
    ...state,
    shop: {
      ...shop,
      boxes: {
        ...shop.boxes,
        [boxId]: boxCount - 1
      },
      boxPity: {
        ...shop.boxPity,
        [boxId]: nextPity
      }
    }
  };
  const nextState = addOwnedGear(stateWithBoxConsumed, award.catalogGearId);
  const ownedAward = nextState.player.inventory[nextState.player.inventory.length - 1];

  return {
    state: nextState,
    boxId,
    award: {
      rarity: award.rarity,
      catalogGearId: award.catalogGearId,
      instanceId: ownedAward.instanceId
    }
  };
}
