import { catalog } from "../data/catalog";
import type { EpicSet, EpicSetBonus, GameState, GearItem, OwnedGearItem, StatBlock, StatKey } from "../game/types";

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
