import { catalog } from "../data/catalog";
import type { CombatHitEvent, CombatMissEvent, CombatPlayerHitEvent, CombatRun } from "./combat";

export type DungeonClearRank = "C" | "B" | "A" | "S" | "SS" | "SSS";

export interface DungeonClearScoreBreakdown {
  base: number;
  combo: number;
  accuracy: number;
  survival: number;
  time: number;
  critical: number;
}

export interface DungeonClearStats {
  hitsLanded: number;
  misses: number;
  criticalHits: number;
  maxCombo: number;
  damageDealt: number;
  damageTaken: number;
  hitsTaken: number;
  accuracyPercent: number;
  clearTimeMs: number;
}

export interface DungeonClearRankBonus {
  gold: number;
  ironDust: number;
}

export interface DungeonClearEvaluation {
  rank: DungeonClearRank;
  score: number;
  breakdown: DungeonClearScoreBreakdown;
  stats: DungeonClearStats;
  rankBonus: DungeonClearRankBonus;
}

const rankBonuses: Readonly<Record<DungeonClearRank, Readonly<DungeonClearRankBonus>>> = Object.freeze({
  C: Object.freeze({ gold: 0, ironDust: 0 }),
  B: Object.freeze({ gold: 60, ironDust: 1 }),
  A: Object.freeze({ gold: 120, ironDust: 2 }),
  S: Object.freeze({ gold: 220, ironDust: 4 }),
  SS: Object.freeze({ gold: 360, ironDust: 6 }),
  SSS: Object.freeze({ gold: 520, ironDust: 10 })
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dungeonClearRankForScore(score: number): DungeonClearRank {
  if (score >= 9000) return "SSS";
  if (score >= 7800) return "SS";
  if (score >= 6500) return "S";
  if (score >= 5000) return "A";
  if (score >= 3500) return "B";
  return "C";
}

export function evaluateDungeonClear(run: CombatRun): DungeonClearEvaluation {
  if (!run.completed) {
    throw new Error("Cannot grade an incomplete dungeon run");
  }

  const dungeon = catalog.dungeons.find((item) => item.id === run.dungeonId);
  if (!dungeon) {
    throw new Error(`Unknown dungeon for grading: ${run.dungeonId}`);
  }

  const hits = run.events.filter((event): event is CombatHitEvent => event.kind === "hit");
  const misses = run.events.filter((event): event is CombatMissEvent => event.kind === "miss");
  const playerHits = run.events.filter((event): event is CombatPlayerHitEvent => event.kind === "player-hit");
  const accuracyRatio = hits.length === 0 ? 0 : hits.length / (hits.length + misses.length);
  const targetTimeMs = dungeon.rooms * 45000;
  const stats: DungeonClearStats = {
    hitsLanded: hits.length,
    misses: misses.length,
    criticalHits: hits.filter((event) => event.critical).length,
    maxCombo: hits.reduce((maximum, event) => Math.max(maximum, event.comboCount ?? 0), 0),
    damageDealt: hits.reduce((total, event) => total + event.damage, 0),
    damageTaken: playerHits.reduce((total, event) => total + event.damage, 0),
    hitsTaken: playerHits.length,
    accuracyPercent: Math.round(accuracyRatio * 100),
    clearTimeMs: Math.max(0, Math.round(run.elapsedMs))
  };
  const breakdown: DungeonClearScoreBreakdown = {
    base: 1400,
    combo: Math.min(2400, stats.maxCombo * 240),
    accuracy: Math.round(1800 * accuracyRatio),
    survival: Math.max(0, 1800 - stats.hitsTaken * 180),
    time: clamp(Math.round(1600 * (1 - stats.clearTimeMs / (targetTimeMs * 1.5))), 0, 1600),
    critical: Math.min(600, stats.criticalHits * 120)
  };
  const score = clamp(Object.values(breakdown).reduce((total, value) => total + value, 0), 0, 10000);
  const rank = dungeonClearRankForScore(score);

  return {
    rank,
    score,
    breakdown,
    stats,
    rankBonus: { ...rankBonuses[rank] }
  };
}
