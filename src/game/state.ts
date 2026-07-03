import { catalog } from "../data/catalog";
import type { CurrencyState, GameState, GearItem, GearSlot, OwnedGearItem, QuestStatus } from "./types";
import { createTradeBoard } from "../systems/market";

const starterCurrency: CurrencyState = {
  gold: 1500,
  ironDust: 30,
  arcShard: 0,
  valorToken: 0,
  protectionTicket: 1
};

function formatOwnedGearSequence(sequence: number | string): string {
  if (typeof sequence === "number") {
    if (!Number.isInteger(sequence) || sequence < 1) {
      throw new Error(`Owned gear sequence must be a positive integer: ${sequence}`);
    }

    return String(sequence).padStart(3, "0");
  }

  if (sequence.length === 0) {
    throw new Error("Owned gear sequence must not be empty");
  }

  return sequence;
}

export function createOwnedGear(catalogGearId: string, sequence: number | string): OwnedGearItem {
  return {
    instanceId: `owned-${catalogGearId}-${formatOwnedGearSequence(sequence)}`,
    catalogGearId,
    reinforceLevel: 0,
    amplifyLevel: 0,
    locked: false,
    bound: true,
    tradable: false,
    sealed: false
  };
}

export function nextOwnedGearSequence(
  inventory: OwnedGearItem[],
  catalogGearId: string,
  reservedItems: OwnedGearItem[] = []
): number {
  const prefix = `owned-${catalogGearId}-`;
  const maxSequence = [...inventory, ...reservedItems]
    .filter((item) => item.catalogGearId === catalogGearId && item.instanceId.startsWith(prefix))
    .map((item) => item.instanceId.slice(prefix.length))
    .filter((suffix) => /^\d+$/.test(suffix))
    .reduce((max, suffix) => Math.max(max, Number(suffix)), 0);

  return maxSequence + 1;
}

function auctionEscrowItems(state: GameState): OwnedGearItem[] {
  return state.market.auctions.map((auction) => auction.ownedItem);
}

export function addOwnedGear(state: GameState, catalogGearId: string): GameState {
  if (!catalog.gear.some((item) => item.id === catalogGearId)) {
    throw new Error(`Missing catalog gear: ${catalogGearId}`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      inventory: [
        ...state.player.inventory,
        createOwnedGear(
          catalogGearId,
          nextOwnedGearSequence(state.player.inventory, catalogGearId, auctionEscrowItems(state))
        )
      ]
    }
  };
}

function findCommonStarterGear(slot: GearSlot): GearItem | undefined {
  return catalog.gear.find((item) => item.slot === slot && item.rarity === "common");
}

function createInitialQuests(): Record<string, QuestStatus> {
  return Object.fromEntries(
    catalog.quests.map((quest) => [quest.id, quest.id === "prologue-ember-warden" ? "active" : "locked"])
  );
}

export function createInitialState(): GameState {
  const starterWeapon = findCommonStarterGear("weapon");
  const starterCore = findCommonStarterGear("core");
  const inventory = [starterWeapon, starterCore]
    .filter((item): item is GearItem => item !== undefined)
    .map((item) => createOwnedGear(item.id, 1));
  const ownedWeapon = starterWeapon
    ? inventory.find((item) => item.catalogGearId === starterWeapon.id)
    : undefined;

  return {
    version: 1,
    catalogId: catalog.id,
    currentTown: "forge-market",
    seenTutorials: [],
    market: {
      tradeBoard: createTradeBoard("initial-market"),
      auctions: [],
      auctionSequence: 1,
      turn: 0
    },
    shop: {
      ownedCosmetics: [],
      boxes: {},
      boxPity: {},
      purchasedSkus: []
    },
    player: {
      heroId: catalog.hero.id,
      level: 1,
      experience: 0,
      heat: 0,
      currencies: { ...starterCurrency },
      inventory,
      equipment: ownedWeapon ? { weapon: ownedWeapon.instanceId } : {},
      loadouts: [{}, {}, {}],
      quests: createInitialQuests(),
      unlockedDungeons: ["cinder-kiln-alley"]
    }
  };
}
