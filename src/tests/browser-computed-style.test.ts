import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeEnemyVfxStylesInRealBrowser,
  computePlayerSkillPhaseStylesInRealBrowser,
  computeRoomGateStylesInRealBrowser,
  computeSkillImpactVfxStylesInRealBrowser,
  type EnemyVfxFixture,
  type PlayerSkillPhaseFixture,
  type RoomGateFixture,
  type SkillImpactVfxFixture
} from "./support/real-browser-computed-style";

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

  it("uses dedicated enter-rift animations for room gate transition", async () => {
    const fixtures: RoomGateFixture[] = [
      { key: "open-ready", vfx: "open-rift", transition: "ready", durationMs: 480 },
      { key: "entering", vfx: "enter-rift", transition: "entering", durationMs: 480 }
    ];
    const computed = await computeRoomGateStylesInRealBrowser(stylesCss, fixtures);

    expect(computed["open-ready"].core.animationName).toContain("room-gate-open-rift");
    expect(computed["open-ready"].rift.animationName).toBe("room-gate-rift-column");
    expect(computed["entering"].core.animationName).toContain("room-gate-enter-rift");
    expect(computed["entering"].rift.animationName).toBe("room-gate-enter-rift-column");
    expect(computed["entering"].threshold.animationName).toBe("room-gate-enter-threshold");
    expect(computed["entering"].rift.animationDuration).toBe("0.48s");
  }, 30000);

  it("uses flowing-light-chain phase animations for the player and weapon in the browser cascade", async () => {
    const fixtures: PlayerSkillPhaseFixture[] = [
      { key: "generic" },
      { key: "open", phase: "chain-open", cue: "flowing-chain-open" },
      { key: "cross", phase: "chain-cross", cue: "flowing-chain-cross" },
      { key: "finish", phase: "chain-finish", cue: "flowing-chain-finish" }
    ];
    const computed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.generic.player.animationName).toBe("player-liuli-light-chain-cast");
    expect(computed.generic.weapon.animationName).toBe("weapon-chain-cut");
    expect(computed.open.player.animationName).toBe("player-flowing-chain-open");
    expect(computed.open.weapon.animationName).toBe("weapon-flowing-chain-open");
    expect(computed.open.skillVfx.core.animationName).toBe("flowing-chain-open-core");
    expect(computed.open.skillVfx.wave.animationName).toBe("flowing-chain-open-wave");
    expect(computed.open.skillVfx.sparks.animationName).toBe("flowing-chain-open-sparks");
    expect(computed.cross.player.animationName).toBe("player-flowing-chain-cross");
    expect(computed.cross.weapon.animationName).toBe("weapon-flowing-chain-cross");
    expect(computed.cross.skillVfx.core.animationName).toBe("flowing-chain-cross-core");
    expect(computed.cross.skillVfx.wave.animationName).toBe("flowing-chain-cross-wave");
    expect(computed.cross.skillVfx.sparks.animationName).toBe("flowing-chain-cross-sparks");
    expect(computed.finish.player.animationName).toBe("player-flowing-chain-finish");
    expect(computed.finish.weapon.animationName).toBe("weapon-flowing-chain-finish");
    expect(computed.finish.skillVfx.core.animationName).toBe("flowing-chain-finish-core");
    expect(computed.finish.skillVfx.wave.animationName).toBe("flowing-chain-finish-wave");
    expect(computed.finish.skillVfx.sparks.animationName).toBe("flowing-chain-finish-sparks");
    expect(computed.finish.player.animationDuration).toBe("0.76s");
    expect(computed.finish.weapon.animationDuration).toBe("0.76s");
    expect(computed.finish.skillVfx.core.animationDuration).toBe("0.76s");
  }, 30000);

  it("uses earth-furnace-breaker crack and eruption root VFX animations in the browser cascade", async () => {
    const fixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "crack",
        skillId: "earth-furnace-breaker",
        preset: "iron-breaker",
        weaponArc: "furnace-breaker",
        vfxShape: "forge-quake",
        phase: "earth-crack",
        cue: "earth-furnace-crack",
        durationMs: 880
      },
      {
        key: "eruption",
        skillId: "earth-furnace-breaker",
        preset: "iron-breaker",
        weaponArc: "furnace-breaker",
        vfxShape: "forge-quake",
        phase: "furnace-eruption",
        cue: "earth-furnace-eruption",
        durationMs: 880
      }
    ];
    const computed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.crack.skillVfx.core.animationName).toBe("earth-furnace-crack-core");
    expect(computed.crack.skillVfx.wave.animationName).toBe("earth-furnace-crack-ring");
    expect(computed.crack.skillVfx.sparks.animationName).toBe("earth-furnace-crack-shards");
    expect(computed.eruption.skillVfx.core.animationName).toBe("earth-furnace-eruption-core");
    expect(computed.eruption.skillVfx.wave.animationName).toBe("earth-furnace-eruption-ring");
    expect(computed.eruption.skillVfx.sparks.animationName).toBe("earth-furnace-eruption-shards");
  }, 30000);

  it("uses distinct glass-rain impact animations for each Liuli rain wave", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "open", shape: "glass-rain", phase: "rain-open", cue: "glass-rain-open", durationMs: 300 },
      { key: "fall", shape: "glass-rain", phase: "rain-fall", cue: "glass-rain-fall", durationMs: 340 },
      { key: "shatter", shape: "glass-rain", phase: "rain-shatter", cue: "glass-rain-shatter", durationMs: 420 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.open.core.animationName).toBe("glass-rain-open-core");
    expect(computed.open.ring.animationName).toBe("glass-rain-open-ring");
    expect(computed.open.shards.animationName).toBe("glass-rain-open-shards");
    expect(computed.fall.core.animationName).toBe("glass-rain-fall-core");
    expect(computed.fall.ring.animationName).toBe("glass-rain-fall-ring");
    expect(computed.fall.shards.animationName).toBe("glass-rain-fall-shards");
    expect(computed.shatter.core.animationName).toBe("glass-rain-shatter-core");
    expect(computed.shatter.ring.animationName).toBe("glass-rain-shatter-ring");
    expect(computed.shatter.shards.animationName).toBe("glass-rain-shatter-shards");
    expect(computed.open.core.animationDuration).toBe("0.3s");
    expect(computed.fall.core.animationDuration).toBe("0.34s");
    expect(computed.shatter.core.animationDuration).toBe("0.42s");
  }, 30000);
});
