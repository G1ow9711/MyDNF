import { catalog } from "../data/catalog";
import type { EpicSet, EpicSetBonus, GameState, GearItem, OwnedGearItem, StatBlock, StatKey } from "../game/types";
import { getAmplifiedEquippedStats } from "./upgrades";

export interface BuildSetSummary {
  setId: string;
  displayName: string;
  theme: string;
  pieces: number;
  activeBonuses: EpicSetBonus[];
  inactiveBonuses: EpicSetBonus[];
}

export interface EquipmentBuildSummary {
  sets: BuildSetSummary[];
  activeBonuses: Array<EpicSetBonus & { setId: string; setName: string }>;
  totalStats: StatBlock;
  buildTags: string[];
}

export interface CombatProfile {
  stats: StatBlock;
  maxHp: number;
  damageMultiplier: number;
  criticalChance: number;
  criticalDamageMultiplier: number;
  backAttackDamageMultiplier: number;
  counterHitDamageMultiplier: number;
  cooldownMultiplier: number;
  resourceGainMultiplier: number;
  damageTakenMultiplier: number;
}

function gearFor(owned: OwnedGearItem): GearItem | undefined {
  return catalog.gear.find((item) => item.id === owned.catalogGearId);
}

function addStats(total: StatBlock, stats: StatBlock): StatBlock {
  const next = { ...total };

  for (const [key, value] of Object.entries(stats) as Array<[StatKey, number | undefined]>) {
    if (typeof value === "number") {
      next[key] = (next[key] ?? 0) + value;
    }
  }

  return next;
}

function summarizeSet(set: EpicSet, pieces: number): BuildSetSummary {
  return {
    setId: set.id,
    displayName: set.displayName,
    theme: set.theme,
    pieces,
    activeBonuses: set.bonuses.filter((bonus) => pieces >= bonus.pieces),
    inactiveBonuses: set.bonuses.filter((bonus) => pieces < bonus.pieces)
  };
}

export function evaluateEquipmentBuild(state: GameState): EquipmentBuildSummary {
  const equippedIds = new Set(Object.values(state.player.equipment));
  const setCounts = new Map<string, number>();

  for (const owned of state.player.inventory) {
    if (!equippedIds.has(owned.instanceId)) {
      continue;
    }

    const gear = gearFor(owned);
    if (gear?.setId) {
      setCounts.set(gear.setId, (setCounts.get(gear.setId) ?? 0) + 1);
    }
  }

  const sets = catalog.epicSets
    .map((set) => summarizeSet(set, setCounts.get(set.id) ?? 0))
    .filter((summary) => summary.pieces > 0);
  const activeBonuses = sets.flatMap((set) =>
    set.activeBonuses.map((bonus) => ({
      ...bonus,
      setId: set.setId,
      setName: set.displayName
    }))
  );
  const totalStats = activeBonuses.reduce((total, bonus) => addStats(total, bonus.stats), {});

  return {
    sets,
    activeBonuses,
    totalStats,
    buildTags: sets.filter((set) => set.activeBonuses.length > 0).map((set) => set.theme)
  };
}

function equippedOwnedGear(state: GameState): OwnedGearItem[] {
  const equippedIds = new Set(Object.values(state.player.equipment));

  return state.player.inventory.filter((item) => equippedIds.has(item.instanceId));
}

function reinforceStats(owned: OwnedGearItem, gear: GearItem): StatBlock {
  if (owned.reinforceLevel <= 0) {
    return {};
  }

  if (gear.slot === "weapon" || gear.slot === "core") {
    return { attack: owned.reinforceLevel * 3 };
  }

  return { defense: owned.reinforceLevel * 2 };
}

function equippedGearStats(state: GameState): StatBlock {
  return equippedOwnedGear(state).reduce((total, owned) => {
    const gear = gearFor(owned);

    if (!gear) {
      return total;
    }

    return addStats(addStats(total, gear.stats), reinforceStats(owned, gear));
  }, {});
}

function amplifiedStats(state: GameState): StatBlock {
  return getAmplifiedEquippedStats(state);
}

function advancementStats(state: GameState): StatBlock {
  const classDef = catalog.classes.find((item) => item.id === state.player.classId);
  const advancement = classDef?.advancements.find((item) => item.id === state.player.advancementId);

  return advancement?.passiveBonuses ?? {};
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function evaluateCombatProfile(state: GameState): CombatProfile {
  const build = evaluateEquipmentBuild(state);
  const stats = [equippedGearStats(state), build.totalStats, amplifiedStats(state), advancementStats(state)].reduce(
    (total, block) => addStats(total, block),
    {}
  );
  const attack = stats.attack ?? 0;
  const defense = stats.defense ?? 0;
  const crit = stats.crit ?? 0;
  const cooldown = stats.cooldown ?? 0;
  const element = stats.element ?? 0;
  const heatGain = stats.heatGain ?? 0;
  const backAttackDamage = stats.backAttackDamage ?? 0;

  return {
    stats,
    maxHp: 1000 + Math.round(defense * 8),
    damageMultiplier: Math.max(1, 1 + attack / 100 + element / 200),
    criticalChance: clamp(crit, 0, 100),
    criticalDamageMultiplier: 1.5,
    backAttackDamageMultiplier: 1.1 + Math.max(0, backAttackDamage) / 100,
    counterHitDamageMultiplier: 1.25,
    cooldownMultiplier: clamp(1 - cooldown / 100, 0.55, 1),
    resourceGainMultiplier: Math.max(1, 1 + heatGain / 100),
    damageTakenMultiplier: clamp(100 / (100 + defense), 0.35, 1)
  };
}
