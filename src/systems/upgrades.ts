import { catalog } from "../data/catalog";
import type { AmplifyStat, GameState, GearSlot, OwnedGearItem } from "../game/types";

export interface UpgradeResult {
  state: GameState;
  gearId: string;
  type: "reinforce" | "amplify";
  success: boolean;
  protected: boolean;
  levelBefore: number;
  levelAfter: number;
  message: string;
  amplifyStat?: AmplifyStat;
}

const reinforceSuccessRates = [1, 0.95, 0.9, 0.82, 0.74, 0.65, 0.55, 0.45, 0.35, 0.28, 0.2, 0.12] as const;
const amplifySuccessRates = [0.85, 0.75, 0.62, 0.5, 0.38] as const;
const amplifyStats: AmplifyStat[] = ["crit", "cooldown", "element", "moveSpeed"];
const equipmentSlotOrder: GearSlot[] = [
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

function findOwnedGear(state: GameState, gearId: string): OwnedGearItem {
  const ownedGear = state.player.inventory.find((item) => item.instanceId === gearId);

  if (!ownedGear) {
    throw new Error(`Unknown owned gear: ${gearId}`);
  }

  return ownedGear;
}

function findCatalogGear(ownedGear: OwnedGearItem) {
  const catalogGear = catalog.gear.find((item) => item.id === ownedGear.catalogGearId);

  if (!catalogGear) {
    throw new Error(`Missing catalog gear for owned gear: ${ownedGear.instanceId}`);
  }

  return catalogGear;
}

function assertEnough(amount: number, cost: number, label: string): void {
  if (amount < cost) {
    throw new Error(`Insufficient ${label}: need ${cost}, have ${amount}`);
  }
}

function replaceOwnedGear(state: GameState, updated: OwnedGearItem, currencyPatch: Partial<GameState["player"]["currencies"]>): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      currencies: {
        ...state.player.currencies,
        ...currencyPatch
      },
      inventory: state.player.inventory.map((item) => (item.instanceId === updated.instanceId ? updated : item))
    }
  };
}

function chooseAmplifyStat(rng: () => number): AmplifyStat {
  const bucket = Math.min(Math.max(Math.floor(rng() * amplifyStats.length), 0), amplifyStats.length - 1);

  return amplifyStats[bucket];
}

export function reinforce(state: GameState, gearId: string, rng: () => number): UpgradeResult {
  const ownedGear = findOwnedGear(state, gearId);
  findCatalogGear(ownedGear);

  const levelBefore = ownedGear.reinforceLevel;

  if (levelBefore >= 12) {
    throw new Error(`Reinforcement cap reached: +12 for ${gearId}`);
  }

  const goldCost = 120 + levelBefore * 60;
  const ironDustCost = 6 + levelBefore * 2;

  assertEnough(state.player.currencies.gold, goldCost, "gold");
  assertEnough(state.player.currencies.ironDust, ironDustCost, "ironDust");

  const success = rng() < reinforceSuccessRates[levelBefore];
  let levelAfter = levelBefore;
  let wasProtected = false;

  if (success) {
    levelAfter = levelBefore + 1;
  } else if (levelBefore <= 5) {
    levelAfter = levelBefore;
  } else if (state.player.currencies.protectionTicket > 0) {
    wasProtected = true;
    levelAfter = levelBefore;
  } else if (levelBefore <= 9) {
    levelAfter = levelBefore - 1;
  } else {
    levelAfter = 10;
  }

  const updatedGear: OwnedGearItem = {
    ...ownedGear,
    reinforceLevel: levelAfter
  };
  const nextState = replaceOwnedGear(state, updatedGear, {
    gold: state.player.currencies.gold - goldCost,
    ironDust: state.player.currencies.ironDust - ironDustCost,
    protectionTicket: state.player.currencies.protectionTicket - (wasProtected ? 1 : 0)
  });

  return {
    state: nextState,
    gearId,
    type: "reinforce",
    success,
    protected: wasProtected,
    levelBefore,
    levelAfter,
    message: success
      ? `Reinforced ${gearId} to +${levelAfter}.`
      : wasProtected
        ? `Reinforcement failed, protection ticket preserved +${levelBefore}.`
        : `Reinforcement failed, level is +${levelAfter}.`
  };
}

export function amplify(state: GameState, gearId: string, rng: () => number): UpgradeResult {
  const ownedGear = findOwnedGear(state, gearId);
  const catalogGear = findCatalogGear(ownedGear);

  if (!catalogGear.amplification.echoSlot) {
    throw new Error(`Amplification requires Echo Slot: ${gearId}`);
  }

  const levelBefore = ownedGear.amplifyLevel;

  if (levelBefore >= 5) {
    throw new Error(`Amplification cap reached: +5 for ${gearId}`);
  }

  const goldCost = 220 + levelBefore * 100;
  const arcShardCost = 2 + levelBefore;

  assertEnough(state.player.currencies.gold, goldCost, "gold");
  assertEnough(state.player.currencies.arcShard, arcShardCost, "arcShard");

  const success = rng() < amplifySuccessRates[levelBefore];
  const levelAfter = success ? levelBefore + 1 : levelBefore;
  const amplifyStat = success && !ownedGear.amplifyStat ? chooseAmplifyStat(rng) : ownedGear.amplifyStat;
  const updatedGear: OwnedGearItem = {
    ...ownedGear,
    amplifyLevel: levelAfter,
    amplifyStat
  };
  const nextState = replaceOwnedGear(state, updatedGear, {
    gold: state.player.currencies.gold - goldCost,
    arcShard: state.player.currencies.arcShard - arcShardCost
  });

  return {
    state: nextState,
    gearId,
    type: "amplify",
    success,
    protected: false,
    levelBefore,
    levelAfter,
    message: success ? `Amplified ${gearId} to +${levelAfter}.` : `Amplification failed, level is +${levelAfter}.`,
    amplifyStat
  };
}

export function getAmplifiedEquippedStats(state: GameState): Partial<Record<AmplifyStat, number>> {
  const stats: Partial<Record<AmplifyStat, number>> = {};
  let counted = 0;

  for (const slot of equipmentSlotOrder) {
    const instanceId = state.player.equipment[slot];

    if (!instanceId) {
      continue;
    }

    const ownedGear = state.player.inventory.find((item) => item.instanceId === instanceId);

    if (!ownedGear?.amplifyStat || ownedGear.amplifyLevel <= 0) {
      continue;
    }

    stats[ownedGear.amplifyStat] = (stats[ownedGear.amplifyStat] ?? 0) + ownedGear.amplifyLevel;
    counted += 1;

    if (counted >= 2) {
      break;
    }
  }

  return stats;
}
