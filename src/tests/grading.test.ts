import { describe, expect, it } from "vitest";
import { createCombatRun, type CombatEvent, type CombatHitEvent, type CombatMissEvent, type CombatPlayerHitEvent } from "../game/combat";
import { createInitialState } from "../game/state";
import { dungeonClearRankForScore, evaluateDungeonClear } from "../game/grading";

function hit(index: number, comboCount: number, critical = false): CombatHitEvent {
  return {
    kind: "hit",
    id: `grade-hit-${index}`,
    action: "light",
    targetId: "ash-wisp-0-1",
    damage: 20,
    critical,
    criticalMultiplier: critical ? 1.5 : 1,
    occurredAtMs: index * 100,
    inputToHitMs: 55,
    hitstopMs: 42,
    canceledFromCombo: false,
    comboCount
  };
}

function miss(index: number): CombatMissEvent {
  return {
    kind: "miss",
    id: `grade-miss-${index}`,
    action: "light",
    occurredAtMs: 2000 + index * 100,
    inputToHitMs: 55,
    canceledFromCombo: false
  };
}

function playerHit(): CombatPlayerHitEvent {
  return {
    kind: "player-hit",
    id: "grade-player-hit",
    enemyId: "ash-wisp-0-1",
    skillId: "ash-ember-spit",
    damage: 30,
    occurredAtMs: 3000,
    hitstopMs: 50
  };
}

describe("DNF dungeon clear grading", () => {
  it("maps score boundaries to C through SSS", () => {
    expect(dungeonClearRankForScore(0)).toBe("C");
    expect(dungeonClearRankForScore(3499)).toBe("C");
    expect(dungeonClearRankForScore(3500)).toBe("B");
    expect(dungeonClearRankForScore(5000)).toBe("A");
    expect(dungeonClearRankForScore(6500)).toBe("S");
    expect(dungeonClearRankForScore(7800)).toBe("SS");
    expect(dungeonClearRankForScore(9000)).toBe("SSS");
  });

  it("scores combo, accuracy, survival, time, and critical events from the final run", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const events: CombatEvent[] = [
      ...Array.from({ length: 10 }, (_, index) => hit(index + 1, index + 1, index >= 8)),
      miss(1),
      miss(2),
      playerHit()
    ];
    const result = evaluateDungeonClear({ ...run, elapsedMs: 60000, events, completed: true });

    expect(result.rank).toBe("SS");
    expect(result.score).toBe(8286);
    expect(result.breakdown).toEqual({
      base: 1400,
      combo: 2400,
      accuracy: 1500,
      survival: 1620,
      time: 1126,
      critical: 240
    });
    expect(result.stats).toMatchObject({
      hitsLanded: 10,
      misses: 2,
      criticalHits: 2,
      maxCombo: 10,
      damageDealt: 200,
      damageTaken: 30,
      hitsTaken: 1,
      accuracyPercent: 83,
      clearTimeMs: 60000
    });
    expect(result.rankBonus).toEqual({ gold: 360, ironDust: 6 });
  });

  it("handles a zero-event result safely and assigns no C-rank bonus", () => {
    const run = createCombatRun(createInitialState(), "cinder-kiln-alley");
    const result = evaluateDungeonClear({ ...run, elapsedMs: 300000, events: [], completed: true });

    expect(result.rank).toBe("C");
    expect(result.score).toBe(3200);
    expect(result.stats.accuracyPercent).toBe(0);
    expect(result.rankBonus).toEqual({ gold: 0, ironDust: 0 });
  });
});
