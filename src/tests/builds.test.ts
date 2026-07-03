import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GearSlot, GameState } from "../game/types";
import { equipItem } from "../systems/inventory";
import { evaluateEquipmentBuild } from "../systems/builds";
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
});
