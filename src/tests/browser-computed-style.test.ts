import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeEnemyVfxStylesInRealBrowser, type EnemyVfxFixture } from "./support/real-browser-computed-style";

const stylesCss = readFileSync("src/styles.css", "utf8");
const genericEnemyAnimations = ["enemy-cast-pulse", "enemy-core-flicker", "enemy-trail-flow"];

describe("real browser computed style regressions", () => {
  it("keeps legacy monster skill VFX cue-gated in the browser cascade", async () => {
    const fixtures: EnemyVfxFixture[] = [
      { key: "ash-spit-uncued", skillId: "ash-ember-spit" },
      { key: "ash-spit-active", skillId: "ash-ember-spit", cue: "ash-ember-spit-impact", vfxDurationMs: 360 },
      { key: "crawler-uncued", skillId: "ash-crawler-burst" },
      { key: "crawler-active", skillId: "ash-crawler-burst", cue: "ash-crawler-burst-explode", vfxDurationMs: 460 },
      { key: "shockwave-uncued", skillId: "zheng-shockwave" },
      { key: "shockwave-active", skillId: "zheng-shockwave", cue: "zheng-shockwave-impact", vfxDurationMs: 420 },
      { key: "horn-uncued", skillId: "zheng-horn-charge" },
      { key: "horn-active", skillId: "zheng-horn-charge", cue: "zheng-horn-charge-impact", vfxDurationMs: 480 },
      { key: "breath-uncued-hit-two", skillId: "taotie-flame-breath", hitIndex: 2 },
      { key: "breath-active-hit-one", skillId: "taotie-flame-breath", cue: "taotie-flame-breath-sustain", hitIndex: 1, vfxDurationMs: 520 },
      { key: "breath-active-hit-two", skillId: "taotie-flame-breath", cue: "taotie-flame-breath-sustain", hitIndex: 2, vfxDurationMs: 520 },
      { key: "breath-active-hit-three", skillId: "taotie-flame-breath", cue: "taotie-flame-breath-sustain", hitIndex: 3, vfxDurationMs: 520 }
    ];

    const computed = await computeEnemyVfxStylesInRealBrowser(stylesCss, fixtures);

    for (const key of ["ash-spit-uncued", "crawler-uncued", "shockwave-uncued", "horn-uncued", "breath-uncued-hit-two"]) {
      expect(computed[key].ring.animationName).toBe("none");
      expect(computed[key].core.animationName).toBe("none");
      expect(computed[key].trail.animationName).toBe("none");
    }

    expect(computed["ash-spit-active"].ring.animationName).toBe("ash-ember-spit-ring");
    expect(computed["ash-spit-active"].core.animationName).toBe("ash-ember-spit-core");
    expect(computed["ash-spit-active"].trail.animationName).toBe("ash-ember-spit-trail");
    expect(computed["crawler-active"].ring.animationName).toBe("ash-crawler-burst-ring");
    expect(computed["crawler-active"].core.animationName).toBe("ash-crawler-burst-core");
    expect(computed["crawler-active"].trail.animationName).toBe("ash-crawler-burst-trail");
    expect(computed["shockwave-active"].ring.animationName).toBe("zheng-shockwave-expand");
    expect(computed["shockwave-active"].core.animationName).toBe("zheng-shockwave-core");
    expect(computed["shockwave-active"].trail.animationName).toBe("zheng-shockwave-trail");
    expect(computed["horn-active"].ring.animationName).toBe("zheng-horn-charge-impact-ring");
    expect(computed["horn-active"].core.animationName).toBe("zheng-horn-charge-core");
    expect(computed["horn-active"].trail.animationName).toBe("zheng-horn-charge-trail");
    expect(computed["breath-active-hit-one"].ring.animationName).toBe("taotie-flame-breath-sustain-ring");
    expect(computed["breath-active-hit-one"].core.animationName).toBe("taotie-flame-breath-sustain-core");
    expect(computed["breath-active-hit-one"].trail.animationName).toBe("taotie-flame-breath-tick-one");
    expect(computed["breath-active-hit-two"].trail.animationName).toBe("taotie-flame-breath-tick-two");
    expect(computed["breath-active-hit-three"].trail.animationName).toBe("taotie-flame-breath-tick-three");

    for (const fixture of fixtures.filter((fixture) => fixture.cue)) {
      for (const part of Object.values(computed[fixture.key])) {
        expect(genericEnemyAnimations).not.toContain(part.animationName);
        expect(part.animationDuration).toBe(`${(fixture.vfxDurationMs ?? 460) / 1000}s`);
      }
    }
  }, 30000);
});
