import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GearSlot, GameState } from "../game/types";
import { equipItem } from "../systems/inventory";
import { evaluateCombatProfile, evaluateEquipmentBuild } from "../systems/builds";
import { renderInventoryPanel } from "../ui/panels";

function gearId(setId: string, slot: GearSlot): string {
  const gear = catalog.gear.find((item) => item.setId === setId && item.slot === slot && item.rarity === "epic");

  if (!gear) {
    throw new Error(`Missing ${setId} ${slot}`);
  }

  return gear.id;
}

function equipSetPieces(state: GameState, setId: string, slots: GearSlot[]): GameState {
  return slots.reduce((next, slot, index) => {
    const owned = createOwnedGear(gearId(setId, slot), `${setId}-${slot}-${index}`);
    const withItem: GameState = {
      ...next,
      player: {
        ...next.player,
        inventory: [...next.player.inventory, owned]
      }
    };

    return equipItem(withItem, owned.instanceId);
  }, state);
}

describe("equipment build evaluation", () => {
  it("activates mixed 2+3 set bonuses and totals their stats", () => {
    let state = createInitialState();

    state = equipSetPieces(state, "ember-artisan", ["weapon", "core"]);
    state = equipSetPieces(state, "liuli-flow", ["head", "body", "legs"]);

    const build = evaluateEquipmentBuild(state);
    const ember = build.sets.find((set) => set.setId === "ember-artisan");
    const liuli = build.sets.find((set) => set.setId === "liuli-flow");

    expect(ember?.pieces).toBe(2);
    expect(ember?.activeBonuses.map((bonus) => bonus.pieces)).toEqual([2]);
    expect(ember?.inactiveBonuses.map((bonus) => bonus.pieces)).toEqual([3, 5]);
    expect(liuli?.pieces).toBe(3);
    expect(liuli?.activeBonuses.map((bonus) => bonus.pieces)).toEqual([2, 3]);
    expect(build.totalStats.heatGain).toBe(8);
    expect(build.totalStats.cooldown).toBe(6);
    expect(build.totalStats.crit).toBe(8);
    expect(build.buildTags).toEqual(expect.arrayContaining(["heat-burst", "skill-cycler"]));
  });

  it("renders active and inactive set bonuses in the inventory panel", () => {
    const state = equipSetPieces(createInitialState(), "ember-artisan", ["weapon", "core"]);
    const html = renderInventoryPanel(state);

    expect(html).toContain("构筑标签");
    expect(html).toContain("已激活");
    expect(html).toContain("未激活");
    expect(html).toContain("炉心回火");
    expect(html).toContain("宗匠焰纹");
  });

  it("folds equipped gear, upgrades, amplification, and set bonuses into combat stats", () => {
    let state = createInitialState();
    const weapon = {
      ...createOwnedGear(gearId("ember-artisan", "weapon"), "combat-weapon"),
      reinforceLevel: 4
    };
    const sigil = {
      ...createOwnedGear(gearId("liuli-flow", "sigil"), "combat-sigil"),
      amplifyLevel: 3,
      amplifyStat: "cooldown" as const
    };
    const charm = createOwnedGear(gearId("liuli-flow", "charm"), "combat-charm");

    for (const owned of [weapon, sigil, charm]) {
      state = {
        ...state,
        player: {
          ...state.player,
          inventory: [...state.player.inventory, owned]
        }
      };
      state = equipItem(state, owned.instanceId);
    }

    const profile = evaluateCombatProfile(state);

    expect(profile.stats.attack).toBeGreaterThan(40);
    expect(profile.stats.cooldown).toBeGreaterThanOrEqual(15);
    expect(profile.maxHp).toBeGreaterThan(1000);
    expect(profile.damageMultiplier).toBeGreaterThan(1);
    expect(profile.cooldownMultiplier).toBeLessThan(1);
  });

  it("exposes discrete critical chance without averaging crit into stable damage", () => {
    const initialProfile = evaluateCombatProfile(createInitialState());
    const critState = equipSetPieces(
      createInitialState(),
      "kiln-shadow",
      ["weapon", "core", "head", "body", "ring"]
    );
    const profile = evaluateCombatProfile(critState);
    const stableDamageMultiplier = Math.max(
      1,
      1 + (profile.stats.attack ?? 0) / 100 + (profile.stats.element ?? 0) / 200
    );

    expect(initialProfile.criticalChance).toBe(0);
    expect(profile.stats.crit).toBeGreaterThan(0);
    expect(profile.criticalChance).toBe(profile.stats.crit);
    expect(profile.criticalDamageMultiplier).toBe(1.5);
    expect(profile.damageMultiplier).toBeCloseTo(stableDamageMultiplier, 8);
  });

  it("turns the Kiln Shadow three-piece bonus into real back-attack scaling", () => {
    const initialProfile = evaluateCombatProfile(createInitialState());
    const shadowState = equipSetPieces(createInitialState(), "kiln-shadow", ["weapon", "core", "head"]);
    const profile = evaluateCombatProfile(shadowState);

    expect(initialProfile.backAttackDamageMultiplier).toBe(1.1);
    expect(initialProfile.counterHitDamageMultiplier).toBe(1.25);
    expect(profile.stats.backAttackDamage).toBe(18);
    expect(profile.backAttackDamageMultiplier).toBe(1.28);
    expect(profile.counterHitDamageMultiplier).toBe(1.25);
  });
});
