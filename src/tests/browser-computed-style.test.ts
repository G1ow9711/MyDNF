import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeEnemyModelMotionStylesInRealBrowser,
  computeEnemyVfxStylesInRealBrowser,
  computePlayerHurtMotionStylesInRealBrowser,
  computePlayerSkillPhaseStylesInRealBrowser,
  computeRoomGateStylesInRealBrowser,
  computeSkillImpactVfxStylesInRealBrowser,
  computeWeaponLayerStylesInRealBrowser,
  type EnemyModelMotionFixture,
  type EnemyVfxFixture,
  type PlayerHurtMotionFixture,
  type PlayerSkillPhaseFixture,
  type RoomGateFixture,
  type SkillImpactVfxFixture,
  type WeaponLayerFixture
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

  it("uses a real boss model animation for Taotie forge-collapse phase burst", async () => {
    const fixtures: EnemyModelMotionFixture[] = [
      {
        key: "taotie-forge-collapse",
        motion: "attack",
        bossPhaseSkillId: "taotie-forge-collapse",
        durationMs: 1180
      }
    ];
    const computed = await computeEnemyModelMotionStylesInRealBrowser(stylesCss, fixtures);

    expect(computed["taotie-forge-collapse"].art.animationName).toBe("monster-taotie-forge-collapse");
    expect(computed["taotie-forge-collapse"].art.animationDuration).toBe("1.18s");
  }, 30000);

  it("uses taotie-chain-cleave drag and smash boss model animations in the browser cascade", async () => {
    const fixtures: EnemyModelMotionFixture[] = [
      {
        key: "drag",
        motion: "attack",
        skillId: "taotie-chain-cleave",
        cue: "taotie-chain-cleave-drag",
        durationMs: 970
      },
      {
        key: "smash",
        motion: "attack",
        skillId: "taotie-chain-cleave",
        cue: "taotie-chain-cleave-smash",
        durationMs: 970
      }
    ];
    const computed = await computeEnemyModelMotionStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.drag.art.animationName).toBe("monster-taotie-chain-cleave-drag");
    expect(computed.smash.art.animationName).toBe("monster-taotie-chain-cleave-smash");
    expect(computed.drag.art.animationName).not.toBe("monster-taotie-chain-cleave");
    expect(computed.smash.art.animationName).not.toBe("monster-taotie-chain-cleave");
    expect(computed.drag.art.animationDuration).toBe("0.97s");
    expect(computed.smash.art.animationDuration).toBe("0.97s");
  }, 30000);

  it("uses taotie-forge-shackle bind and slam boss model animations in the browser cascade", async () => {
    const fixtures: EnemyModelMotionFixture[] = [
      {
        key: "bind",
        motion: "attack",
        skillId: "taotie-forge-shackle",
        cue: "taotie-forge-shackle-bind",
        durationMs: 1040
      },
      {
        key: "slam",
        motion: "attack",
        skillId: "taotie-forge-shackle",
        cue: "taotie-forge-shackle-slam",
        durationMs: 1040
      }
    ];
    const computed = await computeEnemyModelMotionStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.bind.art.animationName).toBe("monster-taotie-forge-shackle-bind");
    expect(computed.slam.art.animationName).toBe("monster-taotie-forge-shackle-slam");
    expect(computed.bind.art.animationName).not.toBe("monster-taotie-forge-shackle");
    expect(computed.slam.art.animationName).not.toBe("monster-taotie-forge-shackle");
    expect(computed.bind.art.animationDuration).toBe("1.04s");
    expect(computed.slam.art.animationDuration).toBe("1.04s");
  }, 30000);

  it("uses cue-specific player hurt animations for every monster feedback cue", async () => {
    const fixtures: PlayerHurtMotionFixture[] = [
      { key: "light", feedbackCue: "player-hurt-light" },
      { key: "heavy", feedbackCue: "player-hurt-heavy" },
      { key: "boss-breath", feedbackCue: "player-hurt-boss-breath" },
      { key: "devoured", feedbackCue: "player-hurt-devoured" },
      { key: "forge-collapse", feedbackCue: "player-hurt-forge-collapse" },
      { key: "forge-bind", feedbackCue: "player-hurt-forge-shackle" },
      { key: "forge-slam", feedbackCue: "player-hurt-forge-slam" },
      { key: "chain-drag", feedbackCue: "player-hurt-chain-drag" },
      { key: "chain-smash", feedbackCue: "player-hurt-chain-smash" }
    ];
    const computed = await computePlayerHurtMotionStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.light.art.animationName).toBe("player-hurt-light");
    expect(computed.heavy.art.animationName).toBe("player-hurt-heavy");
    expect(computed["boss-breath"].art.animationName).toBe("player-hurt-boss-breath");
    expect(computed.devoured.art.animationName).toBe("player-hurt-devoured");
    expect(computed["forge-collapse"].art.animationName).toBe("player-hurt-forge-collapse");
    expect(computed["forge-bind"].art.animationName).toBe("player-hurt-forge-shackle");
    expect(computed["forge-slam"].art.animationName).toBe("player-hurt-forge-slam");
    expect(computed["chain-drag"].art.animationName).toBe("player-hurt-chain-drag");
    expect(computed["chain-smash"].art.animationName).toBe("player-hurt-chain-smash");
    for (const cue of Object.values(computed)) {
      expect(cue.art.animationName).not.toBe("player-hurt-react");
    }
    expect(computed.light.art.animationDuration).toBe("0.38s");
    expect(computed.heavy.art.animationDuration).toBe("0.48s");
    expect(computed["boss-breath"].art.animationDuration).toBe("0.58s");
    expect(computed.devoured.art.animationDuration).toBe("0.62s");
    expect(computed["forge-collapse"].art.animationDuration).toBe("0.6s");
    expect(computed["forge-bind"].art.animationDuration).toBe("0.46s");
    expect(computed["forge-slam"].art.animationDuration).toBe("0.52s");
    expect(computed["chain-drag"].art.animationDuration).toBe("0.5s");
    expect(computed["chain-smash"].art.animationDuration).toBe("0.56s");
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

  it("uses staged flowing-light-chain target impact animations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "open", shape: "flowing-chain", phase: "chain-open", cue: "flowing-chain-open", durationMs: 300 },
      { key: "cross", shape: "flowing-chain", phase: "chain-cross", cue: "flowing-chain-cross", durationMs: 340 },
      { key: "finish", shape: "flowing-chain", phase: "chain-finish", cue: "flowing-chain-finish", durationMs: 420 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.open.core.animationName).toBe("flowing-chain-open-impact-core");
    expect(computed.open.ring.animationName).toBe("flowing-chain-open-impact-ring");
    expect(computed.open.shards.animationName).toBe("flowing-chain-open-impact-shards");
    expect(computed.cross.core.animationName).toBe("flowing-chain-cross-impact-core");
    expect(computed.cross.ring.animationName).toBe("flowing-chain-cross-impact-ring");
    expect(computed.cross.shards.animationName).toBe("flowing-chain-cross-impact-shards");
    expect(computed.finish.core.animationName).toBe("flowing-chain-finish-impact-core");
    expect(computed.finish.ring.animationName).toBe("flowing-chain-finish-impact-ring");
    expect(computed.finish.shards.animationName).toBe("flowing-chain-finish-impact-shards");
    expect(computed.open.core.animationName).not.toBe("flowing-chain-impact-core");
    expect(computed.cross.core.animationName).not.toBe("flowing-chain-impact-core");
    expect(computed.finish.core.animationName).not.toBe("flowing-chain-impact-core");
    expect(computed.open.core.animationDuration).toBe("0.3s");
    expect(computed.cross.core.animationDuration).toBe("0.34s");
    expect(computed.finish.core.animationDuration).toBe("0.42s");
  }, 30000);

  it("uses staged spark-combo player, weapon, root VFX, and impact VFX animations in the browser cascade", async () => {
    const phaseFixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "jab",
        skillId: "spark-combo",
        preset: "ember-spark-combo",
        weaponArc: "jab-chain",
        vfxShape: "ember-sparks",
        phase: "spark-jab",
        cue: "ember-spark-jab",
        durationMs: 260
      },
      {
        key: "cross",
        skillId: "spark-combo",
        preset: "ember-spark-combo",
        weaponArc: "jab-chain",
        vfxShape: "ember-sparks",
        phase: "spark-cross",
        cue: "ember-spark-cross",
        durationMs: 260
      },
      {
        key: "finish",
        skillId: "spark-combo",
        preset: "ember-spark-combo",
        weaponArc: "jab-chain",
        vfxShape: "ember-sparks",
        phase: "spark-finish",
        cue: "ember-spark-finish",
        durationMs: 320
      }
    ];
    const impactFixtures: SkillImpactVfxFixture[] = [
      { key: "jab", shape: "ember-sparks", phase: "spark-jab", cue: "ember-spark-jab", durationMs: 260 },
      { key: "cross", shape: "ember-sparks", phase: "spark-cross", cue: "ember-spark-cross", durationMs: 260 },
      { key: "finish", shape: "ember-sparks", phase: "spark-finish", cue: "ember-spark-finish", durationMs: 320 }
    ];
    const phaseComputed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, phaseFixtures);
    const impactComputed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, impactFixtures);

    expect(phaseComputed.jab.player.animationName).toBe("player-ember-spark-jab");
    expect(phaseComputed.jab.weapon.animationName).toBe("weapon-spark-jab");
    expect(phaseComputed.jab.skillVfx.core.animationName).toBe("ember-spark-jab-vfx-core");
    expect(phaseComputed.jab.skillVfx.wave.animationName).toBe("ember-spark-jab-vfx-ring");
    expect(phaseComputed.jab.skillVfx.sparks.animationName).toBe("ember-spark-jab-vfx-sparks");
    expect(phaseComputed.cross.player.animationName).toBe("player-ember-spark-cross");
    expect(phaseComputed.cross.weapon.animationName).toBe("weapon-spark-cross");
    expect(phaseComputed.cross.skillVfx.core.animationName).toBe("ember-spark-cross-vfx-core");
    expect(phaseComputed.finish.player.animationName).toBe("player-ember-spark-finish");
    expect(phaseComputed.finish.weapon.animationName).toBe("weapon-spark-finish");
    expect(phaseComputed.finish.skillVfx.core.animationName).toBe("ember-spark-finish-vfx-core");

    expect(impactComputed.jab.core.animationName).toBe("ember-spark-jab-impact-core");
    expect(impactComputed.jab.ring.animationName).toBe("ember-spark-jab-impact-ring");
    expect(impactComputed.jab.shards.animationName).toBe("ember-spark-jab-impact-shards");
    expect(impactComputed.cross.core.animationName).toBe("ember-spark-cross-impact-core");
    expect(impactComputed.finish.core.animationName).toBe("ember-spark-finish-impact-core");
    expect(phaseComputed.jab.player.animationDuration).toBe("0.26s");
    expect(phaseComputed.finish.weapon.animationDuration).toBe("0.32s");
    expect(impactComputed.finish.core.animationDuration).toBe("0.32s");
  }, 30000);

  it("uses iron-palm target impact VFX durations from the hit event window", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "shield-jab", shape: "iron-spark", phase: "shield-jab", cue: "iron-shield-jab", durationMs: 260 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed["shield-jab"].core.animationName).toBe("iron-shield-jab-impact-core");
    expect(computed["shield-jab"].ring.animationName).toBe("iron-shield-jab-impact-ring");
    expect(computed["shield-jab"].shards.animationName).toBe("iron-shield-jab-impact-shards");
    expect(computed["shield-jab"].core.animationDuration).toBe("0.26s");
    expect(computed["shield-jab"].ring.animationDuration).toBe("0.26s");
    expect(computed["shield-jab"].shards.animationDuration).toBe("0.26s");
  }, 30000);

  it("uses defensive shield-open status VFX durations from the open-frame event window", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "anvil", shape: "guard-rune", cue: "anvil-guard-open", durationMs: 520, status: true },
      { key: "wall", shape: "molten-wall", cue: "molten-wall-open", durationMs: 520, status: true },
      { key: "aegis", shape: "black-aegis", cue: "black-aegis-open", durationMs: 520, status: true }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.anvil.core.animationName).toBe("guard-rune-open-core");
    expect(computed.anvil.ring.animationName).toBe("guard-rune-open-ring");
    expect(computed.anvil.shards.animationName).toBe("guard-rune-open-shards");
    expect(computed.wall.core.animationName).toBe("molten-wall-open-core");
    expect(computed.wall.ring.animationName).toBe("molten-wall-open-ring");
    expect(computed.wall.shards.animationName).toBe("molten-wall-open-shards");
    expect(computed.aegis.core.animationName).toBe("black-aegis-open-core");
    expect(computed.aegis.ring.animationName).toBe("black-aegis-open-ring");
    expect(computed.aegis.shards.animationName).toBe("black-aegis-open-shards");

    for (const style of Object.values(computed).flatMap((parts) => Object.values(parts))) {
      expect(style.animationDuration).toBe("0.52s");
    }
  }, 30000);

  it("uses Iron roar and quake target impact VFX durations from their hit event windows", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "roar", shape: "furnace-roar", phase: "furnace-roar", cue: "furnace-roar-impact", durationMs: 380 },
      { key: "quake", shape: "shield-quake", phase: "shield-quake", cue: "shield-quake-impact", durationMs: 360 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.roar.core.animationName).toBe("furnace-roar-impact-core");
    expect(computed.roar.ring.animationName).toBe("furnace-roar-impact-ring");
    expect(computed.roar.shards.animationName).toBe("furnace-roar-impact-shards");
    expect(computed.roar.core.animationDuration).toBe("0.38s");
    expect(computed.roar.ring.animationDuration).toBe("0.38s");
    expect(computed.roar.shards.animationDuration).toBe("0.38s");
    expect(computed.quake.core.animationName).toBe("shield-quake-impact-core");
    expect(computed.quake.ring.animationName).toBe("shield-quake-impact-ring");
    expect(computed.quake.shards.animationName).toBe("shield-quake-impact-shards");
    expect(computed.quake.core.animationDuration).toBe("0.36s");
    expect(computed.quake.ring.animationDuration).toBe("0.36s");
    expect(computed.quake.shards.animationDuration).toBe("0.36s");
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

  it("uses furnace-heart-overdrive pulse and release root VFX animations in the browser cascade", async () => {
    const fixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "pulse",
        skillId: "furnace-heart-overdrive",
        preset: "ember-overdrive",
        weaponArc: "core-overdrive",
        vfxShape: "overdrive-core",
        phase: "overdrive-pulse",
        cue: "overdrive-core-pulse",
        durationMs: 820
      },
      {
        key: "release",
        skillId: "furnace-heart-overdrive",
        preset: "ember-overdrive",
        weaponArc: "core-overdrive",
        vfxShape: "overdrive-core",
        phase: "overdrive-release",
        cue: "overdrive-core-release",
        durationMs: 820
      }
    ];
    const computed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.pulse.skillVfx.core.animationName).toBe("overdrive-core-pulse-core");
    expect(computed.pulse.skillVfx.wave.animationName).toBe("overdrive-core-pulse-ring");
    expect(computed.pulse.skillVfx.sparks.animationName).toBe("overdrive-core-pulse-shards");
    expect(computed.release.skillVfx.core.animationName).toBe("overdrive-core-release-core");
    expect(computed.release.skillVfx.wave.animationName).toBe("overdrive-core-release-ring");
    expect(computed.release.skillVfx.sparks.animationName).toBe("overdrive-core-release-shards");
    expect(computed.pulse.skillVfx.core.animationName).not.toBe("overdrive-core-cast-core");
    expect(computed.release.skillVfx.core.animationName).not.toBe("overdrive-core-cast-core");
  }, 30000);

  it("uses sword-prism-field lock and burst root plus target VFX animations in the browser cascade", async () => {
    const phaseFixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "lock",
        skillId: "sword-prism-field",
        preset: "liuli-prism-field",
        weaponArc: "prism-field",
        vfxShape: "sword-prism-field",
        phase: "prism-field-lock",
        cue: "sword-prism-field-lock",
        durationMs: 860
      },
      {
        key: "burst",
        skillId: "sword-prism-field",
        preset: "liuli-prism-field",
        weaponArc: "prism-field",
        vfxShape: "sword-prism-field",
        phase: "prism-field-burst",
        cue: "sword-prism-field-burst",
        durationMs: 860
      }
    ];
    const impactFixtures: SkillImpactVfxFixture[] = [
      { key: "lock", shape: "sword-prism-field", phase: "prism-field-lock", cue: "sword-prism-field-lock", durationMs: 520 },
      { key: "burst", shape: "sword-prism-field", phase: "prism-field-burst", cue: "sword-prism-field-burst", durationMs: 640 }
    ];

    const phaseComputed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, phaseFixtures);
    const impactComputed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, impactFixtures);

    expect(phaseComputed.lock.player.animationName).toBe("player-liuli-prism-field-lock");
    expect(phaseComputed.lock.weapon.animationName).toBe("weapon-prism-field-lock");
    expect(phaseComputed.burst.player.animationName).toBe("player-liuli-prism-field-burst");
    expect(phaseComputed.burst.weapon.animationName).toBe("weapon-prism-field-burst");
    expect(phaseComputed.lock.player.animationName).not.toBe("player-liuli-prism-field-cast");
    expect(phaseComputed.burst.player.animationName).not.toBe("player-liuli-prism-field-cast");
    expect(phaseComputed.lock.weapon.animationName).not.toBe("weapon-prism-field");
    expect(phaseComputed.burst.weapon.animationName).not.toBe("weapon-prism-field");
    expect(phaseComputed.lock.player.animationName).not.toBe(phaseComputed.burst.player.animationName);
    expect(phaseComputed.lock.weapon.animationName).not.toBe(phaseComputed.burst.weapon.animationName);

    expect(phaseComputed.lock.skillVfx.core.animationName).toBe("sword-prism-field-root-lock-core");
    expect(phaseComputed.lock.skillVfx.wave.animationName).toBe("sword-prism-field-root-lock-ring");
    expect(phaseComputed.lock.skillVfx.sparks.animationName).toBe("sword-prism-field-root-lock-sparks");
    expect(phaseComputed.burst.skillVfx.core.animationName).toBe("sword-prism-field-root-burst-core");
    expect(phaseComputed.burst.skillVfx.wave.animationName).toBe("sword-prism-field-root-burst-ring");
    expect(phaseComputed.burst.skillVfx.sparks.animationName).toBe("sword-prism-field-root-burst-sparks");
    expect(phaseComputed.lock.skillVfx.core.animationName).not.toBe("sword-prism-field-cast-core");
    expect(phaseComputed.burst.skillVfx.core.animationName).not.toBe("sword-prism-field-cast-core");

    expect(impactComputed.lock.core.animationName).toBe("sword-prism-field-lock-core");
    expect(impactComputed.lock.ring.animationName).toBe("sword-prism-field-lock-ring");
    expect(impactComputed.lock.shards.animationName).toBe("sword-prism-field-lock-shards");
    expect(impactComputed.burst.core.animationName).toBe("sword-prism-field-burst-core");
    expect(impactComputed.burst.ring.animationName).toBe("sword-prism-field-burst-ring");
    expect(impactComputed.burst.shards.animationName).toBe("sword-prism-field-burst-shards");
    expect(impactComputed.lock.core.animationName).not.toBe("sword-prism-field-burst-core");
    expect(impactComputed.lock.core.animationDuration).toBe("0.52s");
    expect(impactComputed.burst.core.animationDuration).toBe("0.64s");
  }, 30000);

  it("uses mirrorflame-burst lock and burst root VFX animations in the browser cascade", async () => {
    const fixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "lock",
        skillId: "mirrorflame-burst",
        preset: "liuli-mirrorflame",
        weaponArc: "mirrorflame-fan",
        vfxShape: "mirrorflame-burst",
        phase: "mirrorflame-lock",
        cue: "mirrorflame-lock",
        durationMs: 820
      },
      {
        key: "burst",
        skillId: "mirrorflame-burst",
        preset: "liuli-mirrorflame",
        weaponArc: "mirrorflame-fan",
        vfxShape: "mirrorflame-burst",
        phase: "mirrorflame-burst",
        cue: "mirrorflame-burst",
        durationMs: 820
      }
    ];
    const computed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.lock.skillVfx.core.animationName).toBe("mirrorflame-root-lock-core");
    expect(computed.lock.skillVfx.wave.animationName).toBe("mirrorflame-root-lock-ring");
    expect(computed.lock.skillVfx.sparks.animationName).toBe("mirrorflame-root-lock-sparks");
    expect(computed.burst.skillVfx.core.animationName).toBe("mirrorflame-root-burst-core");
    expect(computed.burst.skillVfx.wave.animationName).toBe("mirrorflame-root-burst-ring");
    expect(computed.burst.skillVfx.sparks.animationName).toBe("mirrorflame-root-burst-sparks");
    expect(computed.lock.skillVfx.core.animationName).not.toBe("mirrorflame-cast-core");
    expect(computed.burst.skillVfx.core.animationName).not.toBe("mirrorflame-cast-core");
  }, 30000);

  it("uses mirrorflame-burst lock and burst target impact VFX durations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "lock", shape: "mirrorflame-burst", phase: "mirrorflame-lock", cue: "mirrorflame-lock", durationMs: 420 },
      { key: "burst", shape: "mirrorflame-burst", phase: "mirrorflame-burst", cue: "mirrorflame-burst", durationMs: 560 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.lock.core.animationName).toBe("mirrorflame-lock-core");
    expect(computed.lock.ring.animationName).toBe("mirrorflame-lock-ring");
    expect(computed.lock.shards.animationName).toBe("mirrorflame-lock-shards");
    expect(computed.burst.core.animationName).toBe("mirrorflame-burst-core");
    expect(computed.burst.ring.animationName).toBe("mirrorflame-burst-ring");
    expect(computed.burst.shards.animationName).toBe("mirrorflame-burst-shards");
    expect(computed.lock.core.animationDuration).toBe("0.42s");
    expect(computed.lock.ring.animationDuration).toBe("0.42s");
    expect(computed.lock.shards.animationDuration).toBe("0.42s");
    expect(computed.burst.core.animationDuration).toBe("0.56s");
    expect(computed.burst.ring.animationDuration).toBe("0.56s");
    expect(computed.burst.shards.animationDuration).toBe("0.56s");
  }, 30000);

  it("uses glass-lotus bind and bloom target impact VFX durations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "bind", shape: "glass-lotus", phase: "lotus-bind", cue: "glass-lotus-bind", durationMs: 360 },
      { key: "bloom", shape: "glass-lotus", phase: "lotus-bloom", cue: "glass-lotus-bloom", durationMs: 460 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.bind.core.animationName).toBe("glass-lotus-bind-core");
    expect(computed.bind.ring.animationName).toBe("glass-lotus-bind-ring");
    expect(computed.bind.shards.animationName).toBe("glass-lotus-bind-shards");
    expect(computed.bloom.core.animationName).toBe("glass-lotus-bloom-core");
    expect(computed.bloom.ring.animationName).toBe("glass-lotus-bloom-ring");
    expect(computed.bloom.shards.animationName).toBe("glass-lotus-bloom-shards");
    expect(computed.bind.core.animationDuration).toBe("0.36s");
    expect(computed.bind.ring.animationDuration).toBe("0.36s");
    expect(computed.bind.shards.animationDuration).toBe("0.36s");
    expect(computed.bloom.core.animationDuration).toBe("0.46s");
    expect(computed.bloom.ring.animationDuration).toBe("0.46s");
    expect(computed.bloom.shards.animationDuration).toBe("0.46s");
  }, 30000);

  it("uses night-mark-detonation lock and burst target impact VFX durations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "lock", shape: "night-detonation", phase: "mark-lock", cue: "night-mark-lock", durationMs: 360 },
      { key: "burst", shape: "night-detonation", phase: "mark-burst", cue: "night-mark-burst", durationMs: 520 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.lock.core.animationName).toBe("night-mark-lock-core");
    expect(computed.lock.ring.animationName).toBe("night-mark-lock-ring");
    expect(computed.lock.shards.animationName).toBe("night-mark-lock-shards");
    expect(computed.burst.core.animationName).toBe("night-mark-burst-core");
    expect(computed.burst.ring.animationName).toBe("night-mark-burst-ring");
    expect(computed.burst.shards.animationName).toBe("night-mark-burst-shards");
    expect(computed.lock.core.animationDuration).toBe("0.36s");
    expect(computed.lock.ring.animationDuration).toBe("0.36s");
    expect(computed.lock.shards.animationDuration).toBe("0.36s");
    expect(computed.burst.core.animationDuration).toBe("0.52s");
    expect(computed.burst.ring.animationDuration).toBe("0.52s");
    expect(computed.burst.shards.animationDuration).toBe("0.52s");
  }, 30000);

  it("uses staged Ink snare and mechanism net root VFX animations in the browser cascade", async () => {
    const fixtures: PlayerSkillPhaseFixture[] = [
      {
        key: "ink-bind",
        skillId: "ink-snare",
        preset: "ink-snare",
        weaponArc: "snare-cast",
        vfxShape: "ink-snare",
        phase: "trap-bind",
        cue: "ink-snare-bind",
        durationMs: 360
      },
      {
        key: "ink-snap",
        skillId: "ink-snare",
        preset: "ink-snare",
        weaponArc: "snare-cast",
        vfxShape: "ink-snare",
        phase: "trap-snap",
        cue: "ink-snare-snap",
        durationMs: 520
      },
      {
        key: "mechanism-bind",
        skillId: "mechanism-shadow-net",
        preset: "mechanism-net",
        weaponArc: "mechanism-net",
        vfxShape: "mechanism-net",
        phase: "trap-bind",
        cue: "mechanism-net-bind",
        durationMs: 420
      },
      {
        key: "mechanism-snap",
        skillId: "mechanism-shadow-net",
        preset: "mechanism-net",
        weaponArc: "mechanism-net",
        vfxShape: "mechanism-net",
        phase: "trap-snap",
        cue: "mechanism-net-snap",
        durationMs: 560
      }
    ];
    const computed = await computePlayerSkillPhaseStylesInRealBrowser(stylesCss, fixtures);

    expect(computed["ink-bind"].skillVfx.core.animationName).toBe("ink-snare-root-bind-core");
    expect(computed["ink-bind"].skillVfx.wave.animationName).toBe("ink-snare-root-bind-ring");
    expect(computed["ink-bind"].skillVfx.sparks.animationName).toBe("ink-snare-root-bind-sparks");
    expect(computed["ink-snap"].skillVfx.core.animationName).toBe("ink-snare-root-snap-core");
    expect(computed["ink-snap"].skillVfx.wave.animationName).toBe("ink-snare-root-snap-ring");
    expect(computed["ink-snap"].skillVfx.sparks.animationName).toBe("ink-snare-root-snap-sparks");
    expect(computed["mechanism-bind"].skillVfx.core.animationName).toBe("mechanism-net-root-bind-core");
    expect(computed["mechanism-bind"].skillVfx.wave.animationName).toBe("mechanism-net-root-bind-ring");
    expect(computed["mechanism-bind"].skillVfx.sparks.animationName).toBe("mechanism-net-root-bind-sparks");
    expect(computed["mechanism-snap"].skillVfx.core.animationName).toBe("mechanism-net-root-snap-core");
    expect(computed["mechanism-snap"].skillVfx.wave.animationName).toBe("mechanism-net-root-snap-ring");
    expect(computed["mechanism-snap"].skillVfx.sparks.animationName).toBe("mechanism-net-root-snap-sparks");
    expect(computed["ink-bind"].skillVfx.core.animationDuration).toBe("0.36s");
    expect(computed["ink-snap"].skillVfx.core.animationDuration).toBe("0.52s");
    expect(computed["mechanism-bind"].skillVfx.core.animationDuration).toBe("0.42s");
    expect(computed["mechanism-snap"].skillVfx.core.animationDuration).toBe("0.56s");
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

  it("uses distinct black-rain-volley impact animations for each rain wave", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "open", shape: "black-rain", phase: "black-rain-open", cue: "black-rain-open", durationMs: 300 },
      { key: "fall", shape: "black-rain", phase: "black-rain-fall", cue: "black-rain-fall", durationMs: 360 },
      { key: "burst", shape: "black-rain", phase: "black-rain-burst", cue: "black-rain-burst", durationMs: 440 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.open.core.animationName).toBe("black-rain-open-core");
    expect(computed.open.ring.animationName).toBe("black-rain-open-ring");
    expect(computed.open.shards.animationName).toBe("black-rain-open-shards");
    expect(computed.fall.core.animationName).toBe("black-rain-fall-core");
    expect(computed.fall.ring.animationName).toBe("black-rain-fall-ring");
    expect(computed.fall.shards.animationName).toBe("black-rain-fall-shards");
    expect(computed.burst.core.animationName).toBe("black-rain-burst-core");
    expect(computed.burst.ring.animationName).toBe("black-rain-burst-ring");
    expect(computed.burst.shards.animationName).toBe("black-rain-burst-shards");
    expect(computed.open.core.animationDuration).toBe("0.3s");
    expect(computed.fall.core.animationDuration).toBe("0.36s");
    expect(computed.burst.core.animationDuration).toBe("0.44s");
  }, 30000);

  it("uses distinct heat-bloom draw and eruption impact animations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "draw", shape: "heat-bloom", phase: "heat-draw", cue: "heat-bloom-draw", durationMs: 340 },
      { key: "eruption", shape: "heat-bloom", phase: "heat-eruption", cue: "heat-bloom-eruption", durationMs: 520 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.draw.core.animationName).toBe("heat-bloom-draw-core");
    expect(computed.draw.ring.animationName).toBe("heat-bloom-draw-ring");
    expect(computed.draw.shards.animationName).toBe("heat-bloom-draw-shards");
    expect(computed.eruption.core.animationName).toBe("heat-bloom-eruption-core");
    expect(computed.eruption.ring.animationName).toBe("heat-bloom-eruption-ring");
    expect(computed.eruption.shards.animationName).toBe("heat-bloom-eruption-shards");
    expect(computed.draw.core.animationName).not.toBe("heat-bloom-eruption-core");
    expect(computed.draw.core.animationDuration).toBe("0.34s");
    expect(computed.draw.ring.animationDuration).toBe("0.34s");
    expect(computed.draw.shards.animationDuration).toBe("0.34s");
    expect(computed.eruption.core.animationDuration).toBe("0.52s");
    expect(computed.eruption.ring.animationDuration).toBe("0.52s");
    expect(computed.eruption.shards.animationDuration).toBe("0.52s");
  }, 30000);

  it("uses staged meteor-knuckle target impact animations in the browser cascade", async () => {
    const fixtures: SkillImpactVfxFixture[] = [
      { key: "fall", shape: "meteor-impact", phase: "fall", cue: "meteor-fall", durationMs: 420 },
      { key: "impact", shape: "meteor-impact", phase: "impact", cue: "meteor-impact", durationMs: 640 }
    ];
    const computed = await computeSkillImpactVfxStylesInRealBrowser(stylesCss, fixtures);

    expect(computed.fall.core.animationName).toBe("meteor-fall-core");
    expect(computed.fall.ring.animationName).toBe("meteor-fall-ring");
    expect(computed.fall.shards.animationName).toBe("meteor-fall-shards");
    expect(computed.impact.core.animationName).toBe("meteor-impact-core");
    expect(computed.impact.ring.animationName).toBe("meteor-impact-ring");
    expect(computed.impact.shards.animationName).toBe("meteor-impact-shards");
    expect(computed.fall.core.animationDuration).toBe("0.42s");
    expect(computed.fall.ring.animationDuration).toBe("0.42s");
    expect(computed.fall.shards.animationDuration).toBe("0.42s");
    expect(computed.impact.core.animationDuration).toBe("0.64s");
    expect(computed.impact.ring.animationDuration).toBe("0.64s");
    expect(computed.impact.shards.animationDuration).toBe("0.64s");
  }, 30000);

  it("uses class and tier specific weapon silhouettes in the browser cascade", async () => {
    const fixtures: WeaponLayerFixture[] = [
      {
        key: "ember-novice",
        classId: "ember-warden",
        type: "furnace-gauntlet",
        tier: "novice",
        rarity: "common",
        silhouette: "gauntlet-claw",
        primary: "#7c2d12",
        secondary: "#1f2937",
        glow: "#fb923c"
      },
      {
        key: "ember-mythic",
        classId: "ember-warden",
        type: "furnace-gauntlet",
        tier: "mythic",
        rarity: "mythic",
        silhouette: "gauntlet-meteor",
        primary: "#7f1d1d",
        secondary: "#fbbf24",
        glow: "#fff7ed"
      },
      {
        key: "liuli-novice",
        classId: "liuli-blademage",
        type: "liuli-blade",
        tier: "novice",
        rarity: "common",
        silhouette: "glass-saber",
        primary: "#0891b2",
        secondary: "#334155",
        glow: "#67e8f9"
      },
      {
        key: "liuli-mythic",
        classId: "liuli-blademage",
        type: "liuli-blade",
        tier: "mythic",
        rarity: "mythic",
        silhouette: "heaven-mirror-sword",
        primary: "#22d3ee",
        secondary: "#f0abfc",
        glow: "#ffffff"
      },
      {
        key: "ink-novice",
        classId: "ink-shadow-ranger",
        type: "mechanism-crossbow",
        tier: "novice",
        rarity: "common",
        silhouette: "compact-crossbow",
        primary: "#111827",
        secondary: "#4c1d95",
        glow: "#a78bfa"
      },
      {
        key: "ink-mythic",
        classId: "ink-shadow-ranger",
        type: "mechanism-crossbow",
        tier: "mythic",
        rarity: "mythic",
        silhouette: "void-rain-crossbow",
        primary: "#030712",
        secondary: "#a855f7",
        glow: "#faf5ff"
      },
      {
        key: "iron-novice",
        classId: "iron-forge-guardian",
        type: "forge-shield",
        tier: "novice",
        rarity: "common",
        silhouette: "round-shield",
        primary: "#44403c",
        secondary: "#1c1917",
        glow: "#fb923c"
      },
      {
        key: "iron-mythic",
        classId: "iron-forge-guardian",
        type: "forge-shield",
        tier: "mythic",
        rarity: "mythic",
        silhouette: "mountain-forge-shield",
        primary: "#1c1917",
        secondary: "#f97316",
        glow: "#fff7ed"
      }
    ];
    const computed = await computeWeaponLayerStylesInRealBrowser(stylesCss, fixtures);

    expect(computed["ember-novice"].layer.width).toBe("82px");
    expect(computed["liuli-novice"].layer.width).toBe("70px");
    expect(computed["ink-novice"].layer.width).toBe("78px");
    expect(computed["iron-novice"].layer.width).toBe("82px");

    expect(computed["ember-mythic"].after.width).not.toBe(computed["ember-novice"].after.width);
    expect(computed["ember-mythic"].after.boxShadow).not.toBe(computed["ember-novice"].after.boxShadow);
    expect(computed["liuli-mythic"].before.clipPath).not.toBe(computed["liuli-novice"].before.clipPath);
    expect(computed["ink-mythic"].after.borderTopWidth).not.toBe(computed["ink-novice"].after.borderTopWidth);
    expect(computed["iron-mythic"].before.borderRadius).not.toBe(computed["iron-novice"].before.borderRadius);
    expect(computed["liuli-mythic"].shape.backgroundImage).not.toBe("none");
    expect(computed["ember-mythic"].layer.filter).toContain("drop-shadow");
  }, 30000);
});
