import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";

describe("catalog", () => {
  it("defines the required Chinese title, hero, dungeons, gear, and epic set bonuses", () => {
    expect(catalog.title).toBe("烬璃纪元");
    expect(catalog.hero.displayName).toBe("烬拳卫");
    expect(catalog.dungeons.map((dungeon) => dungeon.displayName)).toEqual(["灰窑巷", "琉璃熔炉"]);
    expect(catalog.gear.length).toBeGreaterThanOrEqual(60);
    expect(catalog.epicSets).toHaveLength(5);

    for (const epicSet of catalog.epicSets) {
      expect(epicSet.bonuses.map((bonus) => bonus.pieces)).toEqual([2, 3, 5]);
    }
  });
});
