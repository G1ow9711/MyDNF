/// <reference types="vite/client" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import {
  applyHit,
  createCombatRun,
  finishRoom,
  performAction,
  stepCombat,
  type CombatEnemy,
  type CombatHitEvent,
  type CombatRun
} from "../game/combat";
import { createAudioState, setVolume } from "../systems/audio";
import { createInitialState, createOwnedGear } from "../game/state";
import type { GameState } from "../game/types";
import { advanceClass, selectBaseClass } from "../systems/classes";
import { renderAppHtml } from "../ui/app";
import {
  renderAuctionPanel,
  renderClassPanel,
  renderInventoryPanel,
  renderQuestPanel,
  renderSettingsPanel,
  renderShopPanel,
  renderSmithPanel
} from "../ui/panels";

const publicAssetModules = import.meta.glob("../../public/assets/*.png", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

const publicWeaponAssetModules = import.meta.glob("../../public/assets/weapons/*.svg", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

const stylesCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function withHeat(state: GameState, heat: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      heat
    }
  };
}

function skillHitEvents(run: CombatRun, skillId: string): CombatHitEvent[] {
  return run.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === skillId);
}

function scheduledSkillTimes(run: CombatRun, skillId: string): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.skillId === skillId)
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error(`Expected scheduled effects for ${skillId}`);
  }

  return [...new Set(times)];
}

function scheduledGroundLightTimes(run: CombatRun): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.action === "light" && !effect.skillId && effect.id.startsWith("ground-light-"))
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error("Expected scheduled ground-light effect");
  }

  return [...new Set(times)];
}

function scheduledGroundHeavyTimes(run: CombatRun): number[] {
  const times = run.scheduledEnemyHitEffects
    .filter((effect) => effect.action === "heavy" && !effect.skillId && !effect.hitPhase)
    .map((effect) => effect.applyAtMs)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    throw new Error("Expected scheduled ground-heavy effect");
  }

  return [...new Set(times)];
}

function stepToElapsed(run: CombatRun, elapsedMs: number): CombatRun {
  return stepCombat(run, {}, Math.max(0, elapsedMs - run.elapsedMs));
}

function resolveGroundLight(run: CombatRun): CombatRun {
  const [hitAtMs] = scheduledGroundLightTimes(run);

  return stepToElapsed(run, hitAtMs);
}

function withSingleReadyEnemy(run: CombatRun, enemyPatch: Partial<CombatEnemy>): CombatRun {
  return {
    ...run,
    enemies: [
      {
        ...run.enemies[0],
        position: {
          x: run.player.x + 72,
          y: run.player.y
        },
        nextAttackAtMs: 1,
        ...enemyPatch
      }
    ]
  };
}

function defeatAll(run: CombatRun): CombatRun {
  return run.enemies.reduce(
    (next, enemy) =>
      applyHit(next, {
        id: `ui-test-kill-${enemy.id}`,
        targetId: enemy.id,
        damage: 9999,
        hitstopMs: 1,
        knockback: 0,
        juggle: false
      }),
    run
  );
}

function reachCombatRoom(run: CombatRun, roomIndex: number): CombatRun {
  let next = run;
  let guard = 0;

  while (next.roomIndex < roomIndex) {
    if (next.completed || guard > 8) {
      throw new Error(`Unable to reach combat room ${roomIndex}`);
    }

    next = finishRoom(defeatAll(next));
    guard += 1;
  }

  return next;
}

function readyForAdvancement(state: ReturnType<typeof createInitialState>): ReturnType<typeof createInitialState> {
  return {
    ...state,
    player: {
      ...state.player,
      level: 15,
      quests: {
        ...state.player.quests,
        "prologue-ember-warden": "completed"
      }
    }
  };
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}

describe("town app shell", () => {
  it("uses generated bitmap assets for detailed character and realistic Chinese-style environments", () => {
    const initialState = createInitialState();
    const state = {
      ...initialState,
      player: {
        ...initialState.player,
        unlockedDungeons: [...initialState.player.unlockedDungeons, "liuli-furnace" as const]
      }
    };
    const townHtml = renderAppHtml({ state, mode: "town" });
    const combatHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: createCombatRun(state, "liuli-furnace")
    });
    const cinderCombatHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: createCombatRun(state, "cinder-kiln-alley")
    });

    expect(townHtml).toContain("/assets/forge-market-bg.png");
    expect(townHtml).toContain("/assets/hero-ember-warden.png");
    expect(townHtml).toContain('class="hero-art"');
    expect(cinderCombatHtml).toContain("/assets/cinder-kiln-bg.png");
    expect(combatHtml).toContain("/assets/liuli-furnace-bg.png");
    expect(combatHtml).toContain('class="combat-background-art"');
  });

  it("renders class-specific detailed hero art in town, combat, and class selection", () => {
    const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
    const inkState = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const townHtml = renderAppHtml({ state: liuliState, mode: "town" });
    const combatHtml = renderAppHtml({
      state: inkState,
      mode: "combat",
      combatRun: createCombatRun(inkState, "cinder-kiln-alley")
    });
    const classHtml = renderClassPanel(createInitialState());

    expect(townHtml).toContain("/assets/hero-liuli-blademage.png");
    expect(townHtml).toContain('data-hero-class-id="liuli-blademage"');
    expect(combatHtml).toContain("/assets/hero-ink-shadow-ranger.png");
    expect(combatHtml).toContain('data-hero-class-id="ink-shadow-ranger"');

    for (const classId of ["ember-warden", "liuli-blademage", "ink-shadow-ranger", "iron-forge-guardian"]) {
      expect(classHtml).toContain(`data-class-art-id="${classId}"`);
      expect(classHtml).toContain(`/assets/hero-${classId}.png`);
    }
  });

  it("keeps referenced bitmap assets present in the public directory", () => {
    expect(Object.keys(publicAssetModules).sort()).toEqual([
      "../../public/assets/cinder-kiln-bg.png",
      "../../public/assets/forge-market-bg.png",
      "../../public/assets/hero-ember-warden.png",
      "../../public/assets/hero-ink-shadow-ranger.png",
      "../../public/assets/hero-iron-forge-guardian.png",
      "../../public/assets/hero-liuli-blademage.png",
      "../../public/assets/liuli-furnace-bg.png",
      "../../public/assets/monster-ash-rat.png",
      "../../public/assets/monster-taotie-overseer.png",
      "../../public/assets/monster-zheng-guard.png"
    ]);

    for (const assetUrl of Object.values(publicAssetModules)) {
      expect(assetUrl).toMatch(/\.png$/);
    }
  });

  it("keeps every class weapon SVG asset present and referenced by the catalog", () => {
    const expectedKeys = catalog.weaponAppearances.map((appearance) => `../../public${appearance.asset.src}`).sort();

    expect(Object.keys(publicWeaponAssetModules).sort()).toEqual(expectedKeys);

    for (const appearance of catalog.weaponAppearances) {
      expect(appearance.asset.src).toBe(`/assets/weapons/${appearance.id}.svg`);
      expect(publicWeaponAssetModules[`../../public${appearance.asset.src}`]).toMatch(/^(data:image\/svg\+xml|.*\.svg$)/);
    }
  });

  it("renders visible combat actors and a prominent objective tracker", () => {
    const state = createInitialState();
    const combatRun = createCombatRun(state, "cinder-kiln-alley");
    const html = renderAppHtml({ state, mode: "combat", combatRun });

    expect(html).toContain('class="combat-actors"');
    expect(html).toContain('class="combat-actor combat-player"');
    expect(html).toContain("/assets/hero-ember-warden.png");
    expect(html).toContain('class="combat-actor combat-enemy combat-enemy-trash"');
    expect(html).toContain('data-enemy-state="alive"');
    expect(html).toContain('class="quest-tracker quest-tracker-prominent"');
    expect(html).toContain('data-combat-objective="active"');
  });

  it("renders Shan Hai Jing inspired bitmap monster models by enemy tier", () => {
    const state = createInitialState();
    const trashRun = createCombatRun(state, "cinder-kiln-alley");
    const eliteRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 1);
    const bossRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 2);

    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain("/assets/monster-ash-rat.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: eliteRun })).toContain("/assets/monster-zheng-guard.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain("/assets/monster-taotie-overseer.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain(
      'class="enemy-art actor-model actor-model-idle"'
    );
  });

  it("renders monster body and hurtbox dimensions so combat scale matches the model", () => {
    const state = createInitialState();
    const bossRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 2);
    const html = renderAppHtml({ state, mode: "combat", combatRun: bossRun });

    expect(html).toContain('data-enemy-body-width="260"');
    expect(html).toContain('data-enemy-body-height="216"');
    expect(html).toContain('data-enemy-hurtbox-width="190"');
    expect(html).toContain('data-enemy-hurtbox-height="128"');
    expect(html).toMatch(/style="[^"]*--enemy-body-width: 260px;[^"]*--enemy-body-height: 216px;[^"]*--enemy-hurtbox-width: 190px;[^"]*--enemy-hurtbox-height: 128px;/);
  });

  it("renders the real elite room with shockwave guard, horn-charge elite, and trash minion", () => {
    const state = createInitialState();
    const eliteRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 1);
    const html = renderAppHtml({ state, mode: "combat", combatRun: eliteRun });

    expect(countOccurrences(html, 'class="combat-actor combat-enemy combat-enemy-elite"')).toBe(2);
    expect(countOccurrences(html, 'class="combat-actor combat-enemy combat-enemy-trash"')).toBe(1);
    expect(html).toContain("窑巷卫士 HP 180/180");
    expect(html).toContain("雷角狰 HP 180/180");
    expect(html).toContain("灰烬小妖 HP 80/80");
  });

  it("renders monster skill effects for trash, elite, and boss attack events", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const quietHtml = renderAppHtml({ state, mode: "combat", combatRun: baseRun });
    const eliteBaseRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 1);
    const bossBaseRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 2);
    const trashRun = stepCombat(withSingleReadyEnemy(baseRun, {}), {}, 80);
    const crawlerRun = stepCombat(withSingleReadyEnemy(baseRun, { attackProfileId: "ash-crawler-burst" }), {}, 80);
    const eliteRun = stepCombat(withSingleReadyEnemy(eliteBaseRun, {}), {}, 80);
    const zhengChargePatch = { attackProfileId: "zheng-horn-charge" } as unknown as Partial<CombatEnemy>;
    const zhengChargeRun = stepCombat(withSingleReadyEnemy(eliteBaseRun, zhengChargePatch), {}, 80);
    const bossRun = stepCombat(withSingleReadyEnemy(bossBaseRun, {}), {}, 80);
    const taotieDevourPatch = { attackProfileId: "taotie-devour-pull", attackPatternIds: ["taotie-devour-pull"], nextAttackPatternIndex: 0 } as unknown as Partial<CombatEnemy>;
    const taotieDevourRun = stepCombat(withSingleReadyEnemy(bossBaseRun, taotieDevourPatch), {}, 80);
    const taotieSummonPatch = { attackProfileId: "taotie-ash-summon", attackPatternIds: ["taotie-ash-summon"], nextAttackPatternIndex: 0 } as unknown as Partial<CombatEnemy>;
    const taotieSummonRun = stepCombat(withSingleReadyEnemy(bossBaseRun, taotieSummonPatch), {}, 80);
    const taotieShacklePatch = { bossPhase: 2, attackProfileId: "taotie-forge-shackle", attackPatternIds: ["taotie-forge-shackle"], nextAttackPatternIndex: 0 } as unknown as Partial<CombatEnemy>;
    const taotieShackleRun = stepCombat(withSingleReadyEnemy(bossBaseRun, taotieShacklePatch), {}, 80);
    const activeTrashRun = stepCombat(trashRun, {}, 500);
    const activeCrawlerRun = stepCombat(crawlerRun, {}, 500);
    const activeEliteRun = stepCombat(eliteRun, {}, 500);
    const activeZhengChargeRun = stepCombat(zhengChargeRun, {}, 520);
    const activeBossRun = stepCombat(bossRun, {}, 500);
    const activeTaotieDevourRun = stepCombat(taotieDevourRun, {}, 520);
    const activeTaotieSummonRun = stepCombat(taotieSummonRun, {}, 620);
    const activeTaotieShackleBindRun = stepCombat(taotieShackleRun, {}, 520);
    const activeTaotieShackleSlamRun = stepCombat(activeTaotieShackleBindRun, {}, 240);
    const activeTrashHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTrashRun });
    const crawlerHtml = renderAppHtml({ state, mode: "combat", combatRun: crawlerRun });
    const activeCrawlerHtml = renderAppHtml({ state, mode: "combat", combatRun: activeCrawlerRun });
    const activeEliteHtml = renderAppHtml({ state, mode: "combat", combatRun: activeEliteRun });
    const zhengChargeHtml = renderAppHtml({ state, mode: "combat", combatRun: zhengChargeRun });
    const activeZhengChargeHtml = renderAppHtml({ state, mode: "combat", combatRun: activeZhengChargeRun });
    const activeBossHtml = renderAppHtml({ state, mode: "combat", combatRun: activeBossRun });
    const taotieDevourHtml = renderAppHtml({ state, mode: "combat", combatRun: taotieDevourRun });
    const activeTaotieDevourHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTaotieDevourRun });
    const taotieSummonHtml = renderAppHtml({ state, mode: "combat", combatRun: taotieSummonRun });
    const activeTaotieSummonHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTaotieSummonRun });
    const taotieShackleHtml = renderAppHtml({ state, mode: "combat", combatRun: taotieShackleRun });
    const activeTaotieShackleBindHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTaotieShackleBindRun });
    const activeTaotieShackleSlamHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTaotieShackleSlamRun });

    expect(quietHtml).not.toContain("data-enemy-skill-vfx");

    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain(
      'data-enemy-telegraph="ash-ember-spit"'
    );
    expect(crawlerHtml).toContain('data-enemy-telegraph="ash-crawler-burst"');
    expect(crawlerHtml).toContain('data-telegraph-shape="circle"');
    expect(crawlerHtml).toContain('actor-enemy-skill-ash-crawler-burst');
    expect(renderAppHtml({ state, mode: "combat", combatRun: eliteRun })).toContain(
      'data-enemy-telegraph="zheng-shockwave"'
    );
    expect(zhengChargeHtml).toContain('data-enemy-telegraph="zheng-horn-charge"');
    expect(zhengChargeHtml).toContain('data-telegraph-shape="line"');
    expect(zhengChargeHtml).toContain('actor-enemy-skill-zheng-horn-charge');
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain(
      'data-enemy-telegraph="taotie-flame-breath"'
    );
    expect(taotieDevourHtml).toContain('data-enemy-telegraph="taotie-devour-pull"');
    expect(taotieDevourHtml).toContain('data-telegraph-shape="circle"');
    expect(taotieDevourHtml).toContain('actor-enemy-skill-taotie-devour-pull');
    expect(taotieSummonHtml).toContain('data-enemy-telegraph="taotie-ash-summon"');
    expect(taotieSummonHtml).toContain('data-telegraph-shape="circle"');
    expect(taotieSummonHtml).toContain('actor-enemy-skill-taotie-ash-summon');
    expect(taotieShackleHtml).toContain('data-enemy-telegraph="taotie-forge-shackle"');
    expect(taotieShackleHtml).toContain('data-telegraph-shape="circle"');
    expect(taotieShackleHtml).toContain('actor-enemy-skill-taotie-forge-shackle');
    expect(activeTrashHtml).toContain('data-enemy-skill-vfx="ash-ember-spit"');
    expect(activeTrashHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-ash-ember-spit"');
    expect(activeCrawlerHtml).toContain('data-enemy-skill-vfx="ash-crawler-burst"');
    expect(activeCrawlerHtml).toContain('data-enemy-vfx-cue="ash-crawler-burst-explode"');
    expect(activeCrawlerHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-ash-crawler-burst"');
    expect(activeEliteHtml).toContain('data-enemy-skill-vfx="zheng-shockwave"');
    expect(activeEliteHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-zheng-shockwave"');
    expect(activeZhengChargeHtml).toContain('data-enemy-skill-vfx="zheng-horn-charge"');
    expect(activeZhengChargeHtml).toContain('data-enemy-vfx-cue="zheng-horn-charge-impact"');
    expect(activeZhengChargeHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-zheng-horn-charge"');
    expect(activeBossHtml).toContain('data-enemy-skill-vfx="taotie-flame-breath"');
    expect(activeBossHtml).toContain('data-enemy-attack-hit-index="1"');
    expect(activeBossHtml).toContain('data-enemy-attack-total-hits="3"');
    expect(activeBossHtml).toContain('data-enemy-vfx-cue="taotie-flame-breath-sustain"');
    expect(activeBossHtml).toContain('actor-enemy-skill-taotie-flame-breath');
    expect(activeBossHtml).toContain(
      'class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-flame-breath"'
    );
    expect(activeTaotieDevourHtml).toContain('data-enemy-skill-vfx="taotie-devour-pull"');
    expect(activeTaotieDevourHtml).toContain('data-enemy-vfx-cue="taotie-devour-bite"');
    expect(activeTaotieDevourHtml).toContain('actor-enemy-skill-taotie-devour-pull');
    expect(activeTaotieDevourHtml).toContain(
      'class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-devour-pull"'
    );
    expect(activeTaotieSummonHtml).toContain('data-enemy-skill-vfx="taotie-ash-summon"');
    expect(activeTaotieSummonHtml).toContain('data-enemy-vfx-cue="taotie-ash-summon-rift"');
    expect(activeTaotieSummonHtml).toContain('data-enemy-summon-vfx="taotie-ash-summon"');
    expect(countOccurrences(activeTaotieSummonHtml, 'data-summoned-enemy-id=')).toBe(2);
    expect(countOccurrences(activeTaotieSummonHtml, 'class="combat-actor combat-enemy combat-enemy-trash"')).toBe(2);
    expect(activeTaotieSummonHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
    expect(activeTaotieShackleBindHtml).toContain('data-enemy-skill-vfx="taotie-forge-shackle"');
    expect(activeTaotieShackleBindHtml).toContain('data-enemy-vfx-cue="taotie-forge-shackle-bind"');
    expect(activeTaotieShackleBindHtml).toContain('data-player-bound-active="true"');
    expect(activeTaotieShackleBindHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-forge-shackle"');
    expect(activeTaotieShackleSlamHtml).toContain('data-enemy-skill-vfx="taotie-forge-shackle"');
    expect(activeTaotieShackleSlamHtml).toContain('data-enemy-vfx-cue="taotie-forge-shackle-slam"');
    expect(activeTaotieShackleSlamHtml).toContain('data-player-feedback-cue="player-hurt-forge-slam"');
    expect(activeTaotieShackleSlamHtml).not.toContain('data-enemy-skill-vfx="taotie-flame-breath"');
    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain(
      'data-telegraph-phase="windup"'
    );
    expect(stylesCss).toContain(".enemy-skill-ash-ember-spit .enemy-cast-trail");
    expect(stylesCss).toContain(".enemy-skill-ash-crawler-burst .enemy-cast-ring");
    expect(stylesCss).toContain('.enemy-skill-zheng-shockwave[data-enemy-vfx-cue="zheng-shockwave-impact"]');
    expect(stylesCss).toContain(".enemy-telegraph-zheng-horn-charge");
    expect(stylesCss).toContain(".enemy-skill-zheng-horn-charge .enemy-cast-trail");
    expect(stylesCss).toContain(".enemy-telegraph-taotie-devour-pull");
    expect(stylesCss).toContain(".enemy-skill-taotie-devour-pull .enemy-cast-core");
    expect(stylesCss).toContain(".enemy-telegraph-taotie-flame-breath .enemy-telegraph-zone");
    expect(stylesCss).toContain(".enemy-telegraph-taotie-flame-breath .enemy-telegraph-edge");
    expect(stylesCss).toContain(".enemy-telegraph-taotie-ash-summon");
    expect(stylesCss).toContain(".enemy-skill-taotie-ash-summon .enemy-cast-core");
    expect(stylesCss).toContain(".enemy-telegraph-taotie-forge-shackle");
    expect(stylesCss).toContain(".enemy-skill-taotie-forge-shackle .enemy-cast-core");
    expect(stylesCss).toContain('.enemy-skill-taotie-flame-breath[data-enemy-vfx-cue="taotie-flame-breath-sustain"] .enemy-cast-core');
    expect(stylesCss).toContain('.enemy-skill-taotie-flame-breath[data-enemy-vfx-cue="taotie-flame-breath-sustain"] .enemy-cast-ring');
    expect(stylesCss).toContain('.enemy-skill-taotie-flame-breath[data-enemy-attack-hit-index="1"] .enemy-cast-trail');
    expect(stylesCss).toContain('.enemy-skill-taotie-flame-breath[data-enemy-attack-hit-index="2"] .enemy-cast-trail');
    expect(stylesCss).toContain('.enemy-skill-taotie-flame-breath[data-enemy-attack-hit-index="3"] .enemy-cast-trail');
    expect(stylesCss).toContain(".enemy-summon-rift-taotie-ash-summon");
    expect(stylesCss).toContain(".combat-feedback-skill-ash-ember-spit");
    expect(stylesCss).toContain(".combat-feedback-skill-ash-crawler-burst");
    expect(stylesCss).toContain(".combat-feedback-skill-zheng-shockwave");
    expect(stylesCss).toContain(".combat-feedback-skill-zheng-horn-charge");
    expect(stylesCss).toContain(".combat-feedback-skill-taotie-flame-breath");
    expect(stylesCss).toContain(".combat-feedback-miss.combat-feedback-skill-taotie-flame-breath .combat-feedback-text");
    expect(stylesCss).toContain(".combat-feedback-skill-taotie-devour-pull");
    expect(stylesCss).toContain(".combat-feedback-skill-taotie-forge-shackle");
    expect(stylesCss).toContain("@keyframes monster-taotie-ash-summon");
    expect(stylesCss).toContain("@keyframes monster-taotie-forge-shackle");
    expect(stylesCss).toContain("@keyframes monster-ash-crawler-burst");
    expect(stylesCss).toContain("@keyframes monster-zheng-horn-charge");
    expect(stylesCss).toContain("@keyframes monster-taotie-devour-pull");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-telegraph");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-telegraph-edge");
    expect(stylesCss).toContain("@keyframes ash-crawler-burst-core");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-sustain-core");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-sustain-ring");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-tick-one");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-tick-two");
    expect(stylesCss).toContain("@keyframes taotie-flame-breath-tick-three");
    expect(stylesCss).toContain("@keyframes ash-crawler-burst-hit-feedback");
    expect(stylesCss).toContain("@keyframes zheng-horn-charge-trail");
    expect(stylesCss).toContain("@keyframes zheng-horn-charge-hit-feedback");
    expect(stylesCss).toContain("@keyframes ash-ember-spit-trail");
    expect(stylesCss).toContain("@keyframes ash-ember-hit-feedback");
    expect(stylesCss).toContain("@keyframes zheng-shockwave-expand");
    expect(stylesCss).toContain("@keyframes zheng-shock-hit-feedback");
    expect(stylesCss).toContain("@keyframes taotie-breath-hit-feedback");
    expect(stylesCss).toContain("@keyframes taotie-breath-miss-feedback");
    expect(stylesCss).toContain("@keyframes taotie-devour-vortex-core");
    expect(stylesCss).toContain("@keyframes taotie-devour-hit-feedback");
    expect(stylesCss).toContain("@keyframes taotie-ash-summon-rift-core");
    expect(stylesCss).toContain("@keyframes taotie-ash-summon-spawn-core");
    expect(stylesCss).toContain("@keyframes taotie-forge-shackle-bind-core");
    expect(stylesCss).toContain("@keyframes taotie-forge-shackle-slam-core");
    expect(stylesCss).toContain("@keyframes taotie-forge-shackle-hit-feedback");
  });

  it("limits taotie summon emerge animation to idle spawned monsters so attack motion can take over", () => {
    expect(stylesCss).toContain('.combat-enemy[data-enemy-spawn-source="taotie-ash-summon"][data-enemy-motion="idle"] .enemy-art');
    expect(stylesCss).not.toContain(
      '.combat-enemy[data-enemy-spawn-source="taotie-ash-summon"] .enemy-art,\n.combat-enemy[data-enemy-spawn-source="taotie-ash-summon"][data-enemy-motion="idle"] .enemy-art'
    );
    expect(stylesCss).toContain("@keyframes ash-minion-summon-emerge");
  });

  it("renders taotie boss phase and forge collapse arena hazard effects", () => {
    const state = createInitialState();
    const bossBaseRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 2);
    const lowHpRun: CombatRun = {
      ...bossBaseRun,
      player: {
        ...bossBaseRun.player,
        x: 240,
        y: 340,
        hp: 999,
        maxHp: 999
      },
      enemies: [
        {
          ...bossBaseRun.enemies[0],
          hp: Math.floor(bossBaseRun.enemies[0].maxHp / 2),
          armor: 0,
          nextAttackAtMs: 9999
        } as CombatEnemy
      ]
    };
    const phaseRun = stepCombat(lowHpRun, {}, 1);
    const impactRun = stepCombat(phaseRun, {}, 620);
    const phaseHtml = renderAppHtml({ state, mode: "combat", combatRun: phaseRun });
    const impactHtml = renderAppHtml({ state, mode: "combat", combatRun: impactRun });

    expect(phaseHtml).toContain('data-boss-phase="2"');
    expect(phaseHtml).toContain('data-boss-enraged="true"');
    expect(phaseHtml).toContain('data-boss-phase-vfx="taotie-forge-collapse"');
    expect(phaseHtml).toContain('data-arena-danger="taotie-forge-collapse"');
    expect(phaseHtml).toContain('data-arena-hazard-layer="true"');
    expect(countOccurrences(phaseHtml, 'data-arena-hazard="taotie-forge-collapse"')).toBe(3);
    expect(phaseHtml).toContain('data-hazard-phase="telegraph"');
    expect(impactHtml).toContain('data-hazard-phase="active"');
    expect(impactHtml).toContain('data-hazard-vfx-cue="taotie-forge-collapse-impact"');
    expect(impactHtml).toContain('class="combat-feedback combat-feedback-hit combat-feedback-skill-taotie-forge-collapse"');
    expect(stylesCss).toContain('.combat-enemy-boss[data-boss-phase="2"]');
    expect(stylesCss).toContain(".boss-phase-vfx-taotie-forge-collapse");
    expect(stylesCss).toContain(".arena-hazard-taotie-forge-collapse");
    expect(stylesCss).toContain("@keyframes monster-taotie-forge-enrage");
    expect(stylesCss).toContain("@keyframes taotie-forge-collapse-ring");
    expect(stylesCss).toContain("@keyframes taotie-forge-hazard-drop");
    expect(stylesCss).toContain("@keyframes taotie-forge-collapse-hit-feedback");
  });

  it("does not render stale arena hazards after combat failure", () => {
    const state = createInitialState();
    const bossBaseRun = reachCombatRoom(createCombatRun(state, "cinder-kiln-alley"), 2);
    const failedRun: CombatRun = {
      ...bossBaseRun,
      failed: true,
      player: {
        ...bossBaseRun.player,
        defeated: true,
        hp: 0
      },
      events: [
        ...bossBaseRun.events,
        {
          kind: "arena-hazard",
          id: "stale-hazard-telegraph",
          hazardId: "stale-hazard",
          enemyId: bossBaseRun.enemies[0].id,
          skillId: "taotie-forge-collapse",
          phase: "telegraph",
          x: 240,
          y: 340,
          radiusX: 86,
          laneRange: 36,
          occurredAtMs: bossBaseRun.elapsedMs,
          impactAtMs: bossBaseRun.elapsedMs + 620,
          vfxCue: "taotie-forge-collapse-telegraph",
          vfxWindowMs: 620
        }
      ],
      scheduledArenaHazards: [
        {
          hazardId: "stale-hazard",
          enemyId: bossBaseRun.enemies[0].id,
          skillId: "taotie-forge-collapse",
          x: 240,
          y: 340,
          radiusX: 86,
          laneRange: 36,
          impactAtMs: bossBaseRun.elapsedMs + 620,
          damage: 62,
          hitstopMs: 72,
          knockback: 36,
          vfxWindowMs: 720
        }
      ]
    };
    const html = renderAppHtml({ state, mode: "combat", combatRun: failedRun });

    expect(html).toContain('data-combat-objective="failed"');
    expect(html).toContain('data-arena-danger="none"');
    expect(html).toContain('data-arena-hazard-count="0"');
    expect(html).not.toContain('data-arena-hazard="taotie-forge-collapse"');
  });

  it("renders target-bound skill impact bursts for multi-hit player skills", () => {
    const inkState = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const state = {
      ...inkState,
      player: {
        ...inkState.player,
        heat: 90
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          position: { x: player.x + 86 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "black-rain-volley" }
    );
    const [, , finalRainAtMs] = scheduledSkillTimes(castRun, "black-rain-volley");
    const finalRainRun = stepToElapsed(castRun, finalRainAtMs);
    const volleyHits = skillHitEvents(finalRainRun, "black-rain-volley");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: finalRainRun
    });

    expect(skillHitEvents(castRun, "black-rain-volley")).toHaveLength(0);
    expect(volleyHits).toHaveLength(6);
    expect(countOccurrences(html, 'data-skill-impact-vfx="black-rain-volley"')).toBe(6);
    expect(html).toContain('data-impact-vfx-shape="black-rain"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-black-rain"');
  });

  it("defines dedicated black rain volley player, weapon, cast, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-volley"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="rain-volley"]');
    expect(stylesCss).toContain(".skill-vfx-shape-black-rain");
    expect(stylesCss).toContain(".skill-impact-shape-black-rain");
    expect(stylesCss).toContain("@keyframes player-ink-volley-cast");
    expect(stylesCss).toContain("@keyframes weapon-rain-volley");
    expect(stylesCss).toContain("@keyframes black-rain-cast-core");
    expect(stylesCss).toContain("@keyframes black-rain-target-core");
    expect(stylesCss).toContain("@keyframes black-rain-target-ring");
    expect(stylesCss).toContain("@keyframes black-rain-target-burst");
  });

  it("defines dedicated heat-bloom player, weapon, cast, draw, and eruption animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-bloom"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="pull-bloom"]');
    expect(stylesCss).toContain(".skill-vfx-shape-heat-bloom");
    expect(stylesCss).toContain(".skill-impact-shape-heat-bloom");
    expect(stylesCss).toContain("@keyframes player-ember-bloom-cast");
    expect(stylesCss).toContain("@keyframes weapon-pull-bloom");
    expect(stylesCss).toContain("@keyframes heat-bloom-cast-core");
    expect(stylesCss).toContain("@keyframes heat-bloom-draw-core");
    expect(stylesCss).toContain("@keyframes heat-bloom-eruption-core");
  });

  it("defines dedicated spark-combo player, weapon, sparks, and jab-chain animations", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 64 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "spark-combo" }
    );
    const [jabAtMs] = scheduledSkillTimes(castRun, "spark-combo");
    const beforeJabHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, jabAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, jabAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "spark-combo")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "spark-combo")).toHaveLength(1);
    expect(beforeJabHtml).toContain('data-player-skill-move="spark-combo"');
    expect(beforeJabHtml).not.toContain('data-skill-impact-vfx="spark-combo"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="spark-combo"')).toBe(1);
    expect(html).toContain('data-impact-vfx-shape="ember-sparks"');
    expect(html).toContain('data-vfx-cue="ember-jab-chain"');
    expect(html).toContain('data-hit-phase="jab-chain"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-ember-sparks"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="spark-combo"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-combo"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="jab-chain"]');
    expect(stylesCss).toContain(".skill-vfx-shape-ember-sparks");
    expect(stylesCss).toContain(".skill-impact-shape-ember-sparks");
    expect(stylesCss).toContain("@keyframes player-ember-spark-combo");
    expect(stylesCss).toContain("@keyframes weapon-jab-chain");
    expect(stylesCss).toContain("@keyframes ember-sparks-cast-core");
    expect(stylesCss).toContain("@keyframes ember-jab-chain-impact-core");
  });

  it("defines dedicated iron-palm player, weapon, sparks, and shield-jab animations", () => {
    const state = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 190,
          maxHp: 190,
          position: { x: player.x + 78 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "iron-palm" }
    );
    const [jabAtMs] = scheduledSkillTimes(castRun, "iron-palm");
    const beforeJabHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, jabAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, jabAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "iron-palm")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "iron-palm")).toHaveLength(1);
    expect(beforeJabHtml).toContain('data-player-skill-move="iron-palm"');
    expect(beforeJabHtml).not.toContain('data-skill-impact-vfx="iron-palm"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="iron-palm"')).toBe(1);
    expect(html).toContain('data-impact-vfx-shape="iron-spark"');
    expect(html).toContain('data-vfx-cue="iron-shield-jab"');
    expect(html).toContain('data-hit-phase="shield-jab"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-iron-spark"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="iron-palm"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-palm"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="shield-jab"]');
    expect(stylesCss).toContain(".skill-vfx-shape-iron-spark");
    expect(stylesCss).toContain(".skill-impact-shape-iron-spark");
    expect(stylesCss).toContain("@keyframes player-iron-palm-jab");
    expect(stylesCss).toContain("@keyframes weapon-shield-jab");
    expect(stylesCss).toContain("var(--weapon-facing, 1) * var(--weapon-skill-lunge, 24px) * 1.34");
    expect(stylesCss).toContain("@keyframes iron-spark-cast-core");
    expect(stylesCss).toContain("@keyframes iron-shield-jab-impact-core");
  });

  it("defines dedicated furnace-taunt player, weapon, roar field, and control impact animations", () => {
    const baseState = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        heat: 90
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 210,
          maxHp: 210,
          armor: 0,
          position: { x: index === 0 ? 330 : 390, y: player.y + index * 12 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "furnace-taunt" }
    );
    const [roarAtMs] = scheduledSkillTimes(castRun, "furnace-taunt");
    const beforeRoarHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, roarAtMs - 1)
    });
    const roarRun = stepToElapsed(castRun, roarAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: roarRun
    });

    expect(skillHitEvents(castRun, "furnace-taunt")).toHaveLength(0);
    expect(skillHitEvents(roarRun, "furnace-taunt")).toHaveLength(2);
    expect(beforeRoarHtml).toContain('data-player-skill-move="furnace-taunt"');
    expect(beforeRoarHtml).not.toContain('data-skill-impact-vfx="furnace-taunt"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="furnace-taunt"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="furnace-roar"');
    expect(html).toContain('data-vfx-cue="furnace-roar-impact"');
    expect(html).toContain('data-hit-phase="furnace-roar"');
    expect(html).toContain('data-control-state="controlled"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-furnace-roar"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="furnace-taunt"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-taunt"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="taunt-ring"]');
    expect(stylesCss).toContain(".skill-vfx-shape-furnace-roar");
    expect(stylesCss).toContain(".skill-impact-shape-furnace-roar");
    expect(stylesCss).toContain("@keyframes player-iron-furnace-taunt");
    expect(stylesCss).toContain("@keyframes weapon-taunt-ring");
    expect(stylesCss).toContain("@keyframes furnace-roar-cast-core");
    expect(stylesCss).toContain("@keyframes furnace-roar-impact-core");
  });

  it("defines dedicated shield-quake player, shield-slam, cast quake, and impact animations", () => {
    const state = {
      ...selectBaseClass(createInitialState(), "iron-forge-guardian"),
      player: {
        ...selectBaseClass(createInitialState(), "iron-forge-guardian").player,
        heat: 90
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          armor: 0,
          position: { x: index === 0 ? 320 : 390, y: player.y + index * 12 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "shield-quake" }
    );
    const [quakeAtMs] = scheduledSkillTimes(castRun, "shield-quake");
    const beforeQuakeHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, quakeAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, quakeAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "shield-quake")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "shield-quake")).toHaveLength(2);
    expect(beforeQuakeHtml).toContain('data-player-skill-move="shield-quake"');
    expect(beforeQuakeHtml).not.toContain('data-skill-impact-vfx="shield-quake"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="shield-quake"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="shield-quake"');
    expect(html).toContain('data-vfx-cue="shield-quake-impact"');
    expect(html).toContain('data-hit-phase="shield-quake"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-shield-quake"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="shield-quake"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-quake"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="shield-slam"]');
    expect(stylesCss).toContain(".skill-vfx-shape-shield-quake");
    expect(stylesCss).toContain(".skill-impact-shape-shield-quake");
    expect(stylesCss).toContain("@keyframes player-iron-shield-quake");
    expect(stylesCss).toContain("@keyframes weapon-shield-slam");
    expect(stylesCss).toContain("@keyframes shield-quake-cast-core");
    expect(stylesCss).toContain("@keyframes shield-quake-impact-core");
  });

  it("defines dedicated anvil-guard shield raise, guard weapon, and guard-rune animations", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 40);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          armor: 0,
          position: { x: 320, y: 340 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "anvil-guard" }
    );
    const [guardAtMs] = scheduledSkillTimes(castRun, "anvil-guard");
    const castHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const beforeGuardHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, guardAtMs - 1)
    });
    const guardHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, guardAtMs)
    });

    expect(guardAtMs).toBe(180);
    expect(castHtml).toContain('data-player-skill-move="anvil-guard"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-guard"');
    expect(castHtml).toContain('data-skill-weapon-arc="guard-raise"');
    expect(castHtml).toContain('data-skill-vfx-shape="guard-rune"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-anvil-guard skill-vfx-shape-guard-rune"');
    expect(beforeGuardHtml).toContain('data-shield-active="false"');
    expect(guardHtml).toContain('data-shield-active="true"');
    expect(guardHtml).toContain('data-player-motion="shield"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="anvil-guard"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-guard"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="guard-raise"]');
    expect(stylesCss).toContain(".skill-vfx-shape-guard-rune");
    expect(stylesCss).toContain("@keyframes player-iron-anvil-guard");
    expect(stylesCss).toContain("@keyframes weapon-guard-raise");
    expect(stylesCss).toContain("@keyframes guard-rune-cast-core");
  });

  it("defines dedicated molten-wall shield brace, wall weapon, and molten-wall animations", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 90);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          armor: 0,
          position: { x: 320, y: 340 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "molten-wall" }
    );
    const [wallAtMs] = scheduledSkillTimes(castRun, "molten-wall");
    const castHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const beforeWallHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, wallAtMs - 1)
    });
    const wallHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, wallAtMs)
    });

    expect(wallAtMs).toBe(260);
    expect(castHtml).toContain('data-player-skill-move="molten-wall"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-wall"');
    expect(castHtml).toContain('data-skill-weapon-arc="wall-guard"');
    expect(castHtml).toContain('data-skill-vfx-shape="molten-wall"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-molten-wall skill-vfx-shape-molten-wall"');
    expect(beforeWallHtml).toContain('data-shield-active="false"');
    expect(wallHtml).toContain('data-shield-active="true"');
    expect(wallHtml).toContain('data-player-motion="shield"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="molten-wall"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-wall"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="wall-guard"]');
    expect(stylesCss).toContain(".skill-vfx-shape-molten-wall");
    expect(stylesCss).toContain("@keyframes player-iron-molten-wall");
    expect(stylesCss).toContain("@keyframes weapon-wall-guard");
    expect(stylesCss).toContain("@keyframes molten-wall-cast-core");
  });

  it("defines dedicated black-furnace-aegis shield brace, aegis weapon, and black-aegis animations", () => {
    const state = advanceClass(
      readyForAdvancement(withHeat(selectBaseClass(createInitialState(), "iron-forge-guardian"), 100)),
      "black-furnace-vanguard"
    );
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          armor: 0,
          position: { x: 320, y: 340 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "black-furnace-aegis" }
    );
    const [aegisAtMs] = scheduledSkillTimes(castRun, "black-furnace-aegis");
    const castHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const beforeAegisHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, aegisAtMs - 1)
    });
    const aegisHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, aegisAtMs)
    });

    expect(aegisAtMs).toBe(280);
    expect(castHtml).toContain('data-player-skill-move="black-furnace-aegis"');
    expect(castHtml).toContain('data-skill-animation-preset="iron-aegis"');
    expect(castHtml).toContain('data-skill-weapon-arc="aegis-raise"');
    expect(castHtml).toContain('data-skill-vfx-shape="black-aegis"');
    expect(castHtml).toContain('class="player-skill-vfx skill-vfx-black-furnace-aegis skill-vfx-shape-black-aegis"');
    expect(beforeAegisHtml).toContain('data-shield-active="false"');
    expect(aegisHtml).toContain('data-shield-active="true"');
    expect(aegisHtml).toContain('data-player-motion="shield"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="black-furnace-aegis"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-aegis"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="aegis-raise"]');
    expect(stylesCss).toContain(".skill-vfx-shape-black-aegis");
    expect(stylesCss).toContain("@keyframes player-iron-black-aegis");
    expect(stylesCss).toContain("@keyframes weapon-aegis-raise");
    expect(stylesCss).toContain("@keyframes black-aegis-cast-core");
    expect(stylesCss).toContain("@keyframes black-aegis-cast-ring");
    expect(stylesCss).toContain("@keyframes black-aegis-cast-sparks");
  });

  it("renders anvil-crash as a delayed hammer-drop slam with target sparks", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 80
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: player.x + 92 + index * 62, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "anvil-crash" }
    );
    const [slamAtMs] = scheduledSkillTimes(castRun, "anvil-crash");
    const beforeSlamHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, slamAtMs - 1)
    });
    const slamRun = stepToElapsed(castRun, slamAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: slamRun
    });

    expect(skillHitEvents(castRun, "anvil-crash")).toHaveLength(0);
    expect(skillHitEvents(slamRun, "anvil-crash")).toHaveLength(2);
    expect(beforeSlamHtml).toContain('data-player-skill-move="anvil-crash"');
    expect(beforeSlamHtml).not.toContain('data-skill-impact-vfx="anvil-crash"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="anvil-crash"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="anvil-sparks"');
    expect(html).toContain('data-vfx-cue="anvil-crash-impact"');
    expect(html).toContain('data-hit-phase="anvil-slam"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-anvil-sparks"');
    expect(html).toContain('data-enemy-knockdown="true"');
    expect(html).toContain('data-control-state="downed"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="skill"][data-player-skill-move="anvil-crash"]');
    expect(stylesCss).toContain(
      '.combat-player[data-player-motion="skill"][data-skill-animation-preset="ember-anvil"] .combat-player-art {\n  animation: player-ember-anvil-jump'
    );
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-anvil"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="hammer-drop"]');
    expect(stylesCss).toContain(".skill-vfx-shape-anvil-sparks");
    expect(stylesCss).toContain(".skill-impact-shape-anvil-sparks");
    expect(stylesCss).toContain("@keyframes player-ember-anvil-crash");
    expect(stylesCss).toContain("@keyframes player-ember-anvil-jump");
    expect(stylesCss).toContain("@keyframes weapon-hammer-drop");
    expect(stylesCss).toContain("@keyframes anvil-sparks-cast-core");
    expect(stylesCss).toContain("@keyframes anvil-crash-impact-core");
  });

  it("renders cinder-uppercut with delayed flame-column launcher impact metadata", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 80
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 64 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "cinder-uppercut" }
    );
    const [uppercutAtMs] = scheduledSkillTimes(castRun, "cinder-uppercut");
    const beforeHitHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, uppercutAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, uppercutAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "cinder-uppercut")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "cinder-uppercut")).toHaveLength(1);
    expect(beforeHitHtml).toContain('data-player-skill-move="cinder-uppercut"');
    expect(beforeHitHtml).not.toContain('data-skill-impact-vfx="cinder-uppercut"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="cinder-uppercut"')).toBe(1);
    expect(html).toContain('data-impact-vfx-shape="flame-column"');
    expect(html).toContain('data-vfx-cue="cinder-uppercut-rise"');
    expect(html).toContain('data-hit-phase="uppercut"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-flame-column"');
    expect(html).toContain('data-enemy-airborne="true"');
  });

  it("defines dedicated cinder-uppercut player, weapon, cast, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-uppercut"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="uppercut"]');
    expect(stylesCss).toContain(".skill-vfx-shape-flame-column");
    expect(stylesCss).toContain(".skill-impact-shape-flame-column");
    expect(stylesCss).toContain("@keyframes player-ember-uppercut");
    expect(stylesCss).toContain("@keyframes weapon-uppercut-arc");
    expect(stylesCss).toContain("@keyframes flame-column-cast-core");
    expect(stylesCss).toContain("@keyframes cinder-uppercut-rise-core");
  });

  it("renders ink-shot with a delayed bolt cast and dedicated crossbow impact styling", () => {
    const state = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 280 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "ink-shot" }
    );
    const [boltAtMs] = scheduledSkillTimes(castRun, "ink-shot");
    const beforeBoltHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, boltAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, boltAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "ink-shot")).toHaveLength(0);
    expect(beforeBoltHtml).toContain('data-player-skill-move="ink-shot"');
    expect(beforeBoltHtml).not.toContain('data-skill-impact-vfx="ink-shot"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="ink-shot"')).toBe(1);
    expect(html).toContain('data-impact-vfx-shape="ink-bolt"');
    expect(html).toContain('data-vfx-cue="ink-shot-pierce"');
    expect(html).toContain('data-hit-phase="ink-bolt"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-ink-bolt"');
  });

  it("defines dedicated ink-shot player, crossbow, bolt, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-shot"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="crossbow-shot"]');
    expect(stylesCss).toContain(".skill-vfx-shape-ink-bolt");
    expect(stylesCss).toContain(".skill-impact-shape-ink-bolt");
    expect(stylesCss).toContain("@keyframes player-ink-shot");
    expect(stylesCss).toContain("@keyframes weapon-crossbow-shot");
    expect(stylesCss).toContain("@keyframes ink-bolt-cast-core");
    expect(stylesCss).toContain("@keyframes ink-shot-pierce-core");
  });

  it("renders marking-bolt with delayed contract seal impact styling", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          marks: 0,
          position: { x: player.x + 132 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "marking-bolt" }
    );
    const [markAtMs] = scheduledSkillTimes(castRun, "marking-bolt");
    const beforeMarkHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, markAtMs - 1)
    });
    const markRun = stepToElapsed(castRun, markAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: markRun
    });

    expect(skillHitEvents(castRun, "marking-bolt")).toHaveLength(0);
    expect(castRun.enemies[0].marks).toBe(0);
    expect(beforeMarkHtml).toContain('data-player-skill-move="marking-bolt"');
    expect(beforeMarkHtml).not.toContain('data-skill-impact-vfx="marking-bolt"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="marking-bolt"')).toBe(1);
    expect(html).toContain('data-impact-vfx-shape="contract-mark"');
    expect(html).toContain('data-vfx-cue="contract-mark-impact"');
    expect(html).toContain('data-hit-phase="contract-mark"');
    expect(html).toContain('data-ink-marks="2"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-contract-mark"');
  });

  it("defines dedicated marking-bolt player, weapon, contract cast, and seal impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-mark"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="mark-bolt"]');
    expect(stylesCss).toContain(".skill-vfx-shape-contract-mark");
    expect(stylesCss).toContain(".skill-impact-shape-contract-mark");
    expect(stylesCss).toContain("@keyframes player-ink-mark");
    expect(stylesCss).toContain("@keyframes weapon-mark-bolt");
    expect(stylesCss).toContain("@keyframes contract-mark-cast-core");
    expect(stylesCss).toContain("@keyframes contract-mark-impact-core");
  });

  it("defines dedicated ink-snare player, weapon, cast, bind, and snap animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-snare"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="trap-cast"]');
    expect(stylesCss).toContain(".skill-vfx-shape-ink-snare");
    expect(stylesCss).toContain(".skill-impact-shape-ink-snare");
    expect(stylesCss).toContain('[data-vfx-cue="ink-snare-bind"]');
    expect(stylesCss).toContain('[data-vfx-cue="ink-snare-snap"]');
    expect(stylesCss).toContain("@keyframes player-ink-snare-cast");
    expect(stylesCss).toContain("@keyframes weapon-trap-cast");
    expect(stylesCss).toContain("@keyframes ink-snare-cast-core");
    expect(stylesCss).toContain("@keyframes ink-snare-bind-core");
    expect(stylesCss).toContain("@keyframes ink-snare-snap-core");
  });

  it("defines dedicated glass-cut player, weapon, slash, and impact animations", () => {
    const state = selectBaseClass(createInitialState(), "liuli-blademage");
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 66 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "glass-cut" }
    );
    const [slashAtMs] = scheduledSkillTimes(castRun, "glass-cut");
    const beforeSlashHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, slashAtMs - 1)
    });
    const hitRun = stepToElapsed(castRun, slashAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "glass-cut")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "glass-cut")).toHaveLength(1);
    expect(beforeSlashHtml).toContain('data-player-skill-move="glass-cut"');
    expect(beforeSlashHtml).not.toContain('data-skill-impact-vfx="glass-cut"');
    expect(html).toContain('data-hit-phase="glass-cut"');
    expect(html).toContain('data-vfx-cue="glass-slash-cut"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-glass-slash"');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-cut"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="glass-slash"]');
    expect(stylesCss).toContain(".skill-vfx-shape-glass-slash");
    expect(stylesCss).toContain(".skill-impact-shape-glass-slash");
    expect(stylesCss).toContain("@keyframes player-liuli-glass-cut");
    expect(stylesCss).toContain("@keyframes weapon-glass-slash");
    expect(stylesCss).toContain("@keyframes glass-slash-cast-core");
    expect(stylesCss).toContain("@keyframes glass-slash-impact-core");
  });

  it("defines dedicated mirror-arc parry, slash, counter, and impact animations", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: player.x + 86 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "mirror-arc" }
    );
    const [slashAtMs] = scheduledSkillTimes(castRun, "mirror-arc");
    const startupHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const activeHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, 90)
    });
    const hitRun = stepToElapsed(castRun, slashAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: hitRun
    });

    expect(skillHitEvents(castRun, "mirror-arc")).toHaveLength(0);
    expect(skillHitEvents(hitRun, "mirror-arc")).toHaveLength(1);
    expect(startupHtml).toContain('data-reflect-active="false"');
    expect(startupHtml).toContain('data-player-skill-move="mirror-arc"');
    expect(activeHtml).toContain('data-reflect-active="true"');
    expect(activeHtml).toContain('data-player-motion="counter"');
    expect(html).toContain('data-hit-phase="mirror-arc"');
    expect(html).toContain('data-vfx-cue="mirror-arc-slash"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-mirror-arc"');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-mirror"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="mirror-parry"]');
    expect(stylesCss).toContain(".skill-vfx-shape-mirror-arc");
    expect(stylesCss).toContain(".skill-impact-shape-mirror-arc");
    expect(stylesCss).toContain('[data-vfx-cue="mirror-arc-slash"]');
    expect(stylesCss).toContain('[data-vfx-cue="mirror-counter-burst"]');
    expect(stylesCss).toContain("@keyframes player-liuli-mirror-parry");
    expect(stylesCss).toContain("@keyframes weapon-mirror-parry");
    expect(stylesCss).toContain("@keyframes mirror-arc-cast-core");
    expect(stylesCss).toContain("@keyframes mirror-arc-impact-core");
    expect(stylesCss).toContain("@keyframes mirror-counter-burst-core");
  });

  it("defines dedicated glass-lotus bind, bloom, cast, weapon, and impact animations", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 90);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          position: { x: player.x + 76 + index * 80, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "glass-lotus" }
    );
    const [bindAtMs, bloomAtMs] = scheduledSkillTimes(castRun, "glass-lotus");
    const startupHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const beforeBindHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, bindAtMs - 1)
    });
    const bindHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, bindAtMs)
    });
    const bloomHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, bloomAtMs)
    });

    expect(skillHitEvents(castRun, "glass-lotus")).toHaveLength(0);
    expect(startupHtml).toContain('data-player-skill-move="glass-lotus"');
    expect(beforeBindHtml).not.toContain('data-skill-impact-vfx="glass-lotus"');
    expect(bindHtml).toContain('data-hit-phase="lotus-bind"');
    expect(bindHtml).toContain('data-vfx-cue="glass-lotus-bind"');
    expect(bindHtml).toContain('class="skill-impact-burst skill-impact-shape-glass-lotus"');
    expect(bloomHtml).toContain('data-hit-phase="lotus-bloom"');
    expect(bloomHtml).toContain('data-vfx-cue="glass-lotus-bloom"');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-lotus"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="lotus-bloom"]');
    expect(stylesCss).toContain(".skill-vfx-shape-glass-lotus");
    expect(stylesCss).toContain(".skill-impact-shape-glass-lotus");
    expect(stylesCss).toContain('[data-vfx-cue="glass-lotus-bind"]');
    expect(stylesCss).toContain('[data-vfx-cue="glass-lotus-bloom"]');
    expect(stylesCss).toContain("@keyframes player-liuli-lotus-cast");
    expect(stylesCss).toContain("@keyframes weapon-lotus-bloom");
    expect(stylesCss).toContain("@keyframes glass-lotus-cast-core");
    expect(stylesCss).toContain("@keyframes glass-lotus-bind-core");
    expect(stylesCss).toContain("@keyframes glass-lotus-bloom-core");
  });

  it("defines dedicated mirrorflame-burst player, weapon, lock, and burst animations", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "liuli-blademage"), 100);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: [
          {
            ...baseRun.enemies[0],
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 330, y: 340 },
            nextAttackAtMs: 9999
          },
          {
            ...baseRun.enemies[1],
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 410, y: 352 },
            nextAttackAtMs: 9999
          },
          {
            ...baseRun.enemies[0],
            id: "test-mirrorflame-third",
            hp: 260,
            maxHp: 260,
            armor: 20,
            position: { x: 492, y: 332 },
            nextAttackAtMs: 9999
          }
        ]
      },
      { type: "skill", skillId: "mirrorflame-burst" }
    );
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(castRun, "mirrorflame-burst");
    const startupHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const beforeLockHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, lockAtMs - 1)
    });
    const lockHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, lockAtMs)
    });
    const burstRun = stepToElapsed(castRun, burstAtMs);
    const burstHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: burstRun
    });

    expect(skillHitEvents(castRun, "mirrorflame-burst")).toHaveLength(0);
    expect(startupHtml).toContain('data-player-skill-move="mirrorflame-burst"');
    expect(beforeLockHtml).not.toContain('data-skill-impact-vfx="mirrorflame-burst"');
    expect(lockHtml).toContain('data-hit-phase="mirrorflame-lock"');
    expect(lockHtml).toContain('data-vfx-cue="mirrorflame-lock"');
    expect(lockHtml).toContain('class="skill-impact-burst skill-impact-shape-mirrorflame-burst"');
    expect(burstHtml).toContain('data-hit-phase="mirrorflame-burst"');
    expect(burstHtml).toContain('data-vfx-cue="mirrorflame-burst"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="mirrorflame-burst"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-mirrorflame"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="mirrorflame-fan"]');
    expect(stylesCss).toContain(".skill-vfx-shape-mirrorflame-burst");
    expect(stylesCss).toContain(".skill-impact-shape-mirrorflame-burst");
    expect(stylesCss).toContain('[data-vfx-cue="mirrorflame-lock"]');
    expect(stylesCss).toContain('[data-vfx-cue="mirrorflame-burst"]');
    expect(stylesCss).toContain("@keyframes player-liuli-mirrorflame-cast");
    expect(stylesCss).toContain("@keyframes weapon-mirrorflame-fan");
    expect(stylesCss).toContain("@keyframes mirrorflame-cast-core");
    expect(stylesCss).toContain("@keyframes mirrorflame-lock-core");
    expect(stylesCss).toContain("@keyframes mirrorflame-burst-core");
  });

  it("renders liuli-rain as staggered glass-rain impact waves", () => {
    const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
    const state = {
      ...liuliState,
      player: {
        ...liuliState.player,
        heat: 90
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          position: { x: player.x + 90 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "liuli-rain" }
    );
    const [, , finalRainAtMs] = scheduledSkillTimes(castRun, "liuli-rain");
    const finalRainRun = stepToElapsed(castRun, finalRainAtMs);
    const rainHits = skillHitEvents(finalRainRun, "liuli-rain");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: finalRainRun
    });

    expect(rainHits).toHaveLength(6);
    expect(countOccurrences(html, 'data-skill-impact-vfx="liuli-rain"')).toBe(6);
    expect(html).toContain('data-impact-vfx-shape="glass-rain"');
    expect(html).toContain('data-vfx-cue="glass-rain-fall"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-glass-rain"');
  });

  it("renders night-mark-detonation target impact metadata for marked enemies", () => {
    const baseState = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const state = advanceClass(
      readyForAdvancement({
        ...baseState,
        player: {
          ...baseState.player,
          heat: 100
        }
      }),
      "night-contract-hunter"
    );
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 260,
          maxHp: 260,
          marks: index === 0 ? 3 : 2,
          position: { x: player.x + 86 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "night-mark-detonation" }
    );
    const [lockAtMs, finalAtMs] = scheduledSkillTimes(castRun, "night-mark-detonation");
    const immediateDetonationHits = skillHitEvents(castRun, "night-mark-detonation");
    const lockRun = stepToElapsed(castRun, lockAtMs);
    const burstRun = stepToElapsed(lockRun, finalAtMs);
    const detonationHits = skillHitEvents(burstRun, "night-mark-detonation");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: burstRun
    });

    expect(immediateDetonationHits).toHaveLength(0);
    expect(detonationHits).toHaveLength(4);
    expect(castRun.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(lockRun.enemies.map((enemy) => enemy.marks)).toEqual([3, 2]);
    expect(burstRun.enemies.map((enemy) => enemy.marks)).toEqual([0, 0]);
    expect(countOccurrences(html, 'data-skill-impact-vfx="night-mark-detonation"')).toBe(4);
    expect(html).toContain('data-impact-vfx-shape="night-detonation"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-night-detonation"');
    expect(html).toContain('data-hit-phase="detonate"');
    expect(html).toContain('data-vfx-cue="night-mark-burst"');
  });

  it("defines dedicated night mark detonation player, weapon, cast, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-detonation"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="detonate-mark"]');
    expect(stylesCss).toContain(".skill-vfx-shape-night-detonation");
    expect(stylesCss).toContain(".skill-impact-shape-night-detonation");
    expect(stylesCss).toContain("@keyframes player-ink-detonation-cast");
    expect(stylesCss).toContain("@keyframes weapon-detonate-mark");
    expect(stylesCss).toContain("@keyframes night-mark-burst-core");
  });

  it("renders mechanism-shadow-net with staged target-bound mechanism net impacts", () => {
    const inkState = advanceClass(
      readyForAdvancement({
        ...selectBaseClass(createInitialState(), "ink-shadow-ranger"),
        player: {
          ...selectBaseClass(createInitialState(), "ink-shadow-ranger").player,
          heat: 100
        }
      }),
      "mechanism-shadow-weaver"
    );
    const baseRun = createCombatRun(inkState, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 260,
          maxHp: 260,
          position: { x: player.x + 86 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "mechanism-shadow-net" }
    );
    const [bindAtMs, snapAtMs] = scheduledSkillTimes(castRun, "mechanism-shadow-net");
    const immediateNetHits = skillHitEvents(castRun, "mechanism-shadow-net");
    const resolvedRun = stepToElapsed(stepToElapsed(castRun, bindAtMs), snapAtMs);
    const netHits = skillHitEvents(resolvedRun, "mechanism-shadow-net");
    const html = renderAppHtml({
      state: inkState,
      mode: "combat",
      combatRun: resolvedRun
    });

    expect(immediateNetHits).toHaveLength(0);
    expect(netHits).toHaveLength(4);
    expect(countOccurrences(html, 'data-skill-impact-vfx="mechanism-shadow-net"')).toBe(4);
    expect(html).toContain('data-impact-vfx-shape="mechanism-net"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-mechanism-net"');
    expect(html).toContain('data-hit-phase="trap-snap"');
    expect(html).toContain('data-vfx-cue="mechanism-net-snap"');
    expect(html).toContain('data-enemy-motion="controlled"');
  });

  it("defines dedicated mechanism net player, weapon, cast, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-shadow-net"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="net-cast"]');
    expect(stylesCss).toContain(".skill-vfx-shape-mechanism-net");
    expect(stylesCss).toContain(".skill-impact-shape-mechanism-net");
    expect(stylesCss).toContain("@keyframes player-ink-shadow-net-cast");
    expect(stylesCss).toContain("@keyframes weapon-net-cast");
    expect(stylesCss).toContain("@keyframes mechanism-net-snap-core");
  });

  it("renders mountain-crack-hammer with staged mountain-crack impact metadata", () => {
    const ironState = advanceClass(
      readyForAdvancement({
        ...selectBaseClass(createInitialState(), "iron-forge-guardian"),
        player: {
          ...selectBaseClass(createInitialState(), "iron-forge-guardian").player,
          heat: 100
        }
      }),
      "mountain-cracking-smith"
    );
    const baseRun = createCombatRun(ironState, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 280,
          maxHp: 280,
          armor: 32,
          position: { x: player.x + 92 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "mountain-crack-hammer" }
    );
    const [staggerAtMs, impactAtMs] = scheduledSkillTimes(castRun, "mountain-crack-hammer");
    const immediateHammerHits = skillHitEvents(castRun, "mountain-crack-hammer");
    const resolvedRun = stepToElapsed(stepToElapsed(castRun, staggerAtMs), impactAtMs);
    const hammerHits = skillHitEvents(resolvedRun, "mountain-crack-hammer");
    const html = renderAppHtml({
      state: ironState,
      mode: "combat",
      combatRun: resolvedRun
    });

    expect(immediateHammerHits).toHaveLength(0);
    expect(hammerHits).toHaveLength(4);
    expect(countOccurrences(html, 'data-skill-impact-vfx="mountain-crack-hammer"')).toBe(4);
    expect(html).toContain('data-impact-vfx-shape="mountain-crack"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-mountain-crack"');
    expect(html).toContain('data-hit-phase="hammer-impact"');
    expect(html).toContain('data-vfx-cue="mountain-crack-impact"');
    expect(html).toContain('data-enemy-motion="knockdown"');
  });

  it("defines dedicated mountain crack player, weapon, cast, and impact animations", () => {
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-mountain-crack"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="mountain-hammer"]');
    expect(stylesCss).toContain(".skill-vfx-shape-mountain-crack");
    expect(stylesCss).toContain(".skill-impact-shape-mountain-crack");
    expect(stylesCss).toContain("@keyframes player-iron-mountain-crack-cast");
    expect(stylesCss).toContain("@keyframes weapon-mountain-hammer");
    expect(stylesCss).toContain("@keyframes mountain-crack-impact-core");
  });

  it("renders mountain-guard-break with delayed Ember guard-break metadata", () => {
    const emberState = advanceClass(
      readyForAdvancement({
        ...selectBaseClass(createInitialState(), "ember-warden"),
        player: {
          ...selectBaseClass(createInitialState(), "ember-warden").player,
          heat: 100
        }
      }),
      "mountain-breaker"
    );
    const baseRun = createCombatRun(emberState, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.slice(0, 2).map((enemy, index) => ({
          ...enemy,
          hp: 260,
          maxHp: 260,
          armor: 40,
          position: { x: player.x + 92 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "mountain-guard-break" }
    );
    const [breakAtMs] = scheduledSkillTimes(castRun, "mountain-guard-break");
    const beforeBreakHtml = renderAppHtml({
      state: emberState,
      mode: "combat",
      combatRun: stepToElapsed(castRun, breakAtMs - 1)
    });
    const breakRun = stepToElapsed(castRun, breakAtMs);
    const breakHits = skillHitEvents(breakRun, "mountain-guard-break");
    const html = renderAppHtml({
      state: emberState,
      mode: "combat",
      combatRun: breakRun
    });

    expect(skillHitEvents(castRun, "mountain-guard-break")).toHaveLength(0);
    expect(breakHits).toHaveLength(2);
    expect(beforeBreakHtml).toContain('data-player-skill-move="mountain-guard-break"');
    expect(beforeBreakHtml).not.toContain('data-skill-impact-vfx="mountain-guard-break"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="mountain-guard-break"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="mountain-crack"');
    expect(html).toContain('data-hit-phase="mountain-guard-break"');
    expect(html).toContain('data-vfx-cue="mountain-guard-break-impact"');
    expect(html).toContain('data-enemy-motion="guard-break"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-mountain-crack"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="mountain-guard-break"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-mountain-break"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="guard-break"]');
    expect(stylesCss).toContain('[data-player-skill-vfx="mountain-guard-break"]');
    expect(stylesCss).toContain('[data-vfx-cue="mountain-guard-break-impact"]');
    expect(stylesCss).toContain("@keyframes player-ember-mountain-break");
    expect(stylesCss).toContain("@keyframes weapon-guard-break");
    expect(stylesCss).toContain("@keyframes mountain-guard-break-cast-core");
    expect(stylesCss).toContain("@keyframes mountain-guard-break-impact-core");
  });

  it("renders earth-furnace-breaker with staged forge-quake ultimate metadata", () => {
    const ironState = selectBaseClass(createInitialState(), "iron-forge-guardian");
    const state = {
      ...ironState,
      player: {
        ...ironState.player,
        heat: 100
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 320,
          maxHp: 320,
          armor: 42,
          position: { x: player.x + 94 + index * 70, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "earth-furnace-breaker" }
    );
    const [crackAtMs, eruptionAtMs] = scheduledSkillTimes(castRun, "earth-furnace-breaker");
    const beforeCrackHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, crackAtMs - 1)
    });
    const eruptionRun = stepToElapsed(stepToElapsed(castRun, crackAtMs), eruptionAtMs);
    const earthHits = skillHitEvents(eruptionRun, "earth-furnace-breaker");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: eruptionRun
    });

    expect(skillHitEvents(castRun, "earth-furnace-breaker")).toHaveLength(0);
    expect(earthHits).toHaveLength(4);
    expect(beforeCrackHtml).toContain('data-player-skill-move="earth-furnace-breaker"');
    expect(beforeCrackHtml).not.toContain('data-skill-impact-vfx="earth-furnace-breaker"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="earth-furnace-breaker"')).toBe(4);
    expect(html).toContain('data-impact-vfx-shape="forge-quake"');
    expect(html).toContain('data-vfx-cue="earth-furnace-eruption"');
    expect(html).toContain('data-screen-shake="ultimate"');
    expect(html).toContain('data-screen-flash="forge-quake"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-forge-quake"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="earth-furnace-breaker"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="iron-breaker"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="furnace-breaker"]');
    expect(stylesCss).toContain(".skill-vfx-shape-forge-quake");
    expect(stylesCss).toContain(".skill-impact-shape-forge-quake");
    expect(stylesCss).toContain('@keyframes player-iron-earth-breaker-charge');
    expect(stylesCss).toContain('@keyframes weapon-furnace-breaker');
    expect(stylesCss).toContain('var(--weapon-facing, 1) * var(--weapon-skill-lunge, 32px)');
    expect(stylesCss).toContain('var(--weapon-facing, 1) * 94deg');
    expect(stylesCss).toContain('@keyframes forge-quake-cast-core');
    expect(stylesCss).toContain('@keyframes earth-furnace-eruption-core');
    expect(stylesCss).toContain('@keyframes forge-quake-screen-flash');
  });

  it("renders prism-step as a prism-afterimage path pierce impact", () => {
    const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
    const state = {
      ...liuliState,
      player: {
        ...liuliState.player,
        heat: 40
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          position: { x: player.x + 52 + index * 40, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "prism-step" }
    );
    const [, finalImpactAtMs] = scheduledSkillTimes(castRun, "prism-step");
    const immediateStepHits = skillHitEvents(castRun, "prism-step");
    const beforeImpactRun = stepCombat(castRun, {}, 82);
    const beforeImpactHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: beforeImpactRun
    });
    const impactRun = stepToElapsed(castRun, finalImpactAtMs);
    const stepHits = skillHitEvents(impactRun, "prism-step");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: impactRun
    });

    expect(immediateStepHits).toHaveLength(0);
    expect(stepHits).toHaveLength(2);
    expect(beforeImpactHtml).toContain('data-player-skill-move="prism-step"');
    expect(beforeImpactHtml).not.toContain('data-skill-impact-vfx="prism-step"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="prism-step"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="prism-afterimage"');
    expect(html).toContain('data-vfx-cue="prism-pierce"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-prism-afterimage"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="prism-step"]');
  });

  it("defines dedicated furnace-step player, weapon, trail, and impact animations", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 80
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 70 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "furnace-step" }
    );
    const [impactAtMs] = scheduledSkillTimes(castRun, "furnace-step");
    const impactRun = stepToElapsed(castRun, impactAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: impactRun
    });

    expect(skillHitEvents(impactRun, "furnace-step")).toHaveLength(1);
    expect(html).toContain('data-impact-vfx-shape="furnace-trail"');
    expect(html).toContain('data-vfx-cue="furnace-shoulder-impact"');
    expect(html).toContain('data-hit-phase="shoulder-impact"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-furnace-trail"');
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-shoulder"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="dash-burst"]');
    expect(stylesCss).toContain(".skill-vfx-shape-furnace-trail");
    expect(stylesCss).toContain(".skill-impact-shape-furnace-trail");
    expect(stylesCss).toContain("@keyframes player-ember-shoulder-rush");
    expect(stylesCss).toContain("@keyframes weapon-dash-burst");
    expect(stylesCss).toContain("@keyframes furnace-trail-cast-core");
    expect(stylesCss).toContain("@keyframes furnace-shoulder-impact-core");
  });

  it("defines dedicated shadow-roll player, weapon, smoke, and roll-shot animations", () => {
    const state = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 360, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x - 20 + index * 140, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "shadow-roll" }
    );
    const [shotAtMs] = scheduledSkillTimes(castRun, "shadow-roll");
    const beforeShotHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, shotAtMs - 1)
    });
    const shotRun = stepToElapsed(castRun, shotAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: shotRun
    });

    expect(skillHitEvents(shotRun, "shadow-roll")).toHaveLength(1);
    expect(beforeShotHtml).toContain('data-player-skill-move="shadow-roll"');
    expect(beforeShotHtml).not.toContain('data-skill-impact-vfx="shadow-roll"');
    expect(html).toContain('data-impact-vfx-shape="shadow-smoke"');
    expect(html).toContain('data-vfx-cue="shadow-roll-shot"');
    expect(html).toContain('data-hit-phase="roll-shot"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-shadow-smoke"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="shadow-roll"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-roll"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="roll-shot"]');
    expect(stylesCss).toContain(".skill-vfx-shape-shadow-smoke");
    expect(stylesCss).toContain(".skill-impact-shape-shadow-smoke");
    expect(stylesCss).toContain("@keyframes player-ink-roll");
    expect(stylesCss).toContain("@keyframes weapon-roll-shot");
    expect(stylesCss).toContain("@keyframes shadow-smoke-cast-core");
    expect(stylesCss).toContain("@keyframes shadow-roll-shot-core");
  });

  it("renders crow-feint with delayed dodge hooks and feint-shot styling", () => {
    const state = withHeat(selectBaseClass(createInitialState(), "ink-shadow-ranger"), 90);
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 360, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 160 + index * 120, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "crow-feint" }
    );
    const [shotAtMs] = scheduledSkillTimes(castRun, "crow-feint");
    const castHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: castRun
    });
    const activeHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, 90)
    });
    const shotRun = stepToElapsed(castRun, shotAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: shotRun
    });

    expect(skillHitEvents(castRun, "crow-feint")).toHaveLength(0);
    expect(castHtml).toContain('data-player-skill-move="crow-feint"');
    expect(castHtml).toContain('data-skill-animation-preset="ink-feint"');
    expect(castHtml).toContain('data-skill-weapon-arc="feint-shot"');
    expect(castHtml).toContain('data-skill-vfx-shape="crow-feint"');
    expect(castHtml).toContain('data-evade-active="false"');
    expect(activeHtml).toContain('data-evade-active="true"');
    expect(activeHtml).toContain('data-player-motion="dodge"');
    expect(html).toContain('data-impact-vfx-shape="crow-feint"');
    expect(html).toContain('data-vfx-cue="crow-feint-shot"');
    expect(html).toContain('data-hit-phase="feint-shot"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-crow-feint"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="crow-feint"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="ink-feint"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="feint-shot"]');
    expect(stylesCss).toContain(".skill-vfx-shape-crow-feint");
    expect(stylesCss).toContain(".skill-impact-shape-crow-feint");
    expect(stylesCss).toContain("@keyframes player-ink-feint");
    expect(stylesCss).toContain("@keyframes weapon-feint-shot");
    expect(stylesCss).toContain("@keyframes crow-feint-cast-core");
    expect(stylesCss).toContain("@keyframes crow-feint-shot-core");
  });

  it("defines dedicated furnace-heart-overdrive player, weapon, core, and release animations", () => {
    const advancedState = advanceClass(
      readyForAdvancement({
        ...createInitialState(),
        player: {
          ...createInitialState().player,
          heat: 100
        }
      }),
      "ember-furnace-master"
    );
    const baseRun = createCombatRun(advancedState, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 320, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 240,
          maxHp: 240,
          armor: 18,
          position: { x: index === 0 ? player.x - 82 : player.x + 100, y: player.y + index * 10 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "furnace-heart-overdrive" }
    );
    const [, releaseAtMs] = scheduledSkillTimes(castRun, "furnace-heart-overdrive");
    const releaseRun = stepToElapsed(castRun, releaseAtMs);
    const html = renderAppHtml({
      state: advancedState,
      mode: "combat",
      combatRun: releaseRun
    });

    expect(skillHitEvents(releaseRun, "furnace-heart-overdrive")).toHaveLength(4);
    expect(html).toContain('data-impact-vfx-shape="overdrive-core"');
    expect(html).toContain('data-vfx-cue="overdrive-core-release"');
    expect(html).toContain('data-hit-phase="overdrive-release"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-overdrive-core"');
    expect(stylesCss).toContain('[data-skill-animation-preset="ember-overdrive"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="core-overdrive"]');
    expect(stylesCss).toContain(".skill-vfx-shape-overdrive-core");
    expect(stylesCss).toContain(".skill-impact-shape-overdrive-core");
    expect(stylesCss).toContain("@keyframes player-ember-overdrive-cast");
    expect(stylesCss).toContain("@keyframes weapon-core-overdrive");
    expect(stylesCss).toContain("@keyframes overdrive-core-cast-core");
    expect(stylesCss).toContain("@keyframes overdrive-core-release-core");
  });

  it("defines dedicated flowing-light-chain player, weapon, cast, and impact animations", () => {
    const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
    const advancedState = advanceClass(
      {
        ...liuliState,
        player: {
          ...liuliState.player,
          level: 15,
          heat: 100,
          quests: {
            ...liuliState.player.quests,
            "prologue-ember-warden": "completed"
          }
        }
      },
      "flowing-light-swordmaster"
    );
    const baseRun = createCombatRun(advancedState, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 180,
          maxHp: 180,
          position: { x: player.x + 54 + index * 68, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "flowing-light-chain" }
    );
    const [, , finishAtMs] = scheduledSkillTimes(castRun, "flowing-light-chain");
    const finishRun = stepToElapsed(castRun, finishAtMs);
    const html = renderAppHtml({
      state: advancedState,
      mode: "combat",
      combatRun: finishRun
    });

    expect(skillHitEvents(finishRun, "flowing-light-chain")).toHaveLength(6);
    expect(html).toContain('data-impact-vfx-shape="flowing-chain"');
    expect(html).toContain('data-vfx-cue="flowing-chain-finish"');
    expect(html).toContain('data-hit-phase="chain-finish"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-flowing-chain"');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-light-chain"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="chain-cut"]');
    expect(stylesCss).toContain(".skill-vfx-shape-flowing-chain");
    expect(stylesCss).toContain(".skill-impact-shape-flowing-chain");
    expect(stylesCss).toContain("@keyframes player-liuli-light-chain-cast");
    expect(stylesCss).toContain("@keyframes weapon-chain-cut");
    expect(stylesCss).toContain("@keyframes flowing-chain-cast-core");
    expect(stylesCss).toContain("@keyframes flowing-chain-impact-core");
  });

  it("defines dedicated sword-prism-field player, weapon, field, and ultimate burst animations", () => {
    const liuliState = selectBaseClass(createInitialState(), "liuli-blademage");
    const state = {
      ...liuliState,
      player: {
        ...liuliState.player,
        heat: 100
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: [
          {
            ...baseRun.enemies[0],
            hp: 240,
            maxHp: 240,
            position: { x: 330, y: 340 },
            nextAttackAtMs: 9999
          },
          {
            ...baseRun.enemies[1],
            hp: 240,
            maxHp: 240,
            position: { x: 390, y: 352 },
            nextAttackAtMs: 9999
          },
          {
            ...baseRun.enemies[0],
            id: "test-prism-field-third",
            hp: 240,
            maxHp: 240,
            position: { x: 450, y: 332 },
            nextAttackAtMs: 9999
          }
        ]
      },
      { type: "skill", skillId: "sword-prism-field" }
    );
    const [lockAtMs, burstAtMs] = scheduledSkillTimes(castRun, "sword-prism-field");
    const beforeLockHtml = renderAppHtml({
      state,
      mode: "combat",
      combatRun: stepToElapsed(castRun, lockAtMs - 1)
    });
    const burstRun = stepToElapsed(castRun, burstAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: burstRun
    });

    expect(skillHitEvents(castRun, "sword-prism-field")).toHaveLength(0);
    expect(beforeLockHtml).toContain('data-player-skill-move="sword-prism-field"');
    expect(beforeLockHtml).not.toContain('data-skill-impact-vfx="sword-prism-field"');
    expect(countOccurrences(html, 'data-skill-impact-vfx="sword-prism-field"')).toBe(6);
    expect(html).toContain('data-impact-vfx-shape="sword-prism-field"');
    expect(html).toContain('data-vfx-cue="sword-prism-field-burst"');
    expect(html).toContain('data-hit-phase="prism-field-burst"');
    expect(html).toContain('data-screen-shake="ultimate"');
    expect(html).toContain('data-screen-flash="prism-field"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-sword-prism-field"');
    expect(stylesCss).toContain('.combat-player[data-player-skill-move="sword-prism-field"]');
    expect(stylesCss).toContain('[data-skill-animation-preset="liuli-prism-field"]');
    expect(stylesCss).toContain('[data-skill-weapon-arc="prism-field"]');
    expect(stylesCss).toContain(".skill-vfx-shape-sword-prism-field");
    expect(stylesCss).toContain(".skill-impact-shape-sword-prism-field");
    expect(stylesCss).toContain('@keyframes player-liuli-prism-field-cast');
    expect(stylesCss).toContain('@keyframes weapon-prism-field');
    expect(stylesCss).toContain('@keyframes sword-prism-field-cast-core');
    expect(stylesCss).toContain('@keyframes sword-prism-field-burst-core');
    expect(stylesCss).toContain('@keyframes prism-field-screen-flash');
    expect(stylesCss).toContain("scaleX(var(--weapon-facing, 1))");
    expect(stylesCss).toContain("var(--weapon-facing, 1) * var(--weapon-skill-lunge");
  });

  it("renders meteor-knuckle with ultimate impact VFX instead of generic skill feedback", () => {
    const state = {
      ...createInitialState(),
      player: {
        ...createInitialState().player,
        heat: 100
      }
    };
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const player = { ...baseRun.player, x: 240, y: 340, facing: 1 as const, actionLockUntilMs: 0, hurtLockUntilMs: 0 };
    const castRun = performAction(
      {
        ...baseRun,
        player,
        enemies: baseRun.enemies.map((enemy, index) => ({
          ...enemy,
          hp: 220,
          maxHp: 220,
          armor: 32,
          position: { x: player.x + 90 + index * 58, y: player.y + index * 8 },
          nextAttackAtMs: 9999
        }))
      },
      { type: "skill", skillId: "meteor-knuckle" }
    );
    const [, impactAtMs] = scheduledSkillTimes(castRun, "meteor-knuckle");
    const impactRun = stepToElapsed(castRun, impactAtMs);
    const meteorHits = skillHitEvents(impactRun, "meteor-knuckle");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: impactRun
    });

    expect(skillHitEvents(castRun, "meteor-knuckle")).toHaveLength(0);
    expect(meteorHits).toHaveLength(4);
    expect(html).toContain('class="player-skill-vfx skill-vfx-meteor-knuckle skill-vfx-shape-meteor-impact"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-meteor-impact"');
    expect(html).toContain('data-weapon-arc="meteor-smash"');
    expect(html).toContain('data-screen-shake="ultimate"');
    expect(html).toContain('data-screen-flash="meteor"');
    expect(html).not.toContain('data-screen-shake="skill"');
  });

  it("makes cleared combat rooms obvious before settlement", () => {
    const state = createInitialState();
    const combatRun = createCombatRun(state, "cinder-kiln-alley");
    const clearedRun = {
      ...combatRun,
      enemies: combatRun.enemies.map((enemy) => ({
        ...enemy,
        hp: 0,
        downed: true
      }))
    };
    const html = renderAppHtml({ state, mode: "combat", combatRun: clearedRun });

    expect(html).toContain('data-combat-objective="cleared"');
    expect(html).toContain('data-room-gate-state="open"');
    expect(html).toContain('data-room-gate-target-room="1"');
    expect(html).toContain('class="room-clear-banner"');
    expect(html).toContain('data-enemy-state="defeated"');
    expect(html).not.toContain("settle-button");
  });

  it("renders DNF-style skill-slot hotkeys with visible hotkey badge styling", () => {
    const state = createInitialState();
    const combatRun = createCombatRun({ ...state, player: { ...state.player, heat: 80 } }, "cinder-kiln-alley");
    const html = renderAppHtml({ state: { ...state, player: { ...state.player, heat: 80 } }, mode: "combat", combatRun });

    expect(html).toContain('data-dnf-skill-bar="true"');
    expect(html).toContain('data-dnf-hotkey="A"');
    expect(html).toContain('data-dnf-hotkey="H"');
    expect(html).toContain('data-dnf-slot-index="0"');
    expect(html).toContain('data-dnf-slot-index="5"');
    expect(html).toContain('data-legacy-hotkey="O"');
    expect(html).toContain('data-dnf-slot-state="ready"');
    expect(html).toContain("A/J · 0");
    expect(html).toContain("H/O · 70");
    expect(stylesCss).toContain(".dnf-skill-bar");
    expect(stylesCss).toContain(".dnf-skill-slot");
    expect(stylesCss).toContain(".dnf-keycap");
    expect(stylesCss).toContain(".dnf-cooldown-overlay");
    expect(stylesCss).toContain('[data-dnf-slot-state="cooling"]');
    expect(stylesCss).toContain('.dnf-skill-slot[data-dnf-hotkey]:not([data-dnf-hotkey=""])::before');
    expect(stylesCss).toContain("content: attr(data-dnf-hotkey)");
  });

  it("renders DNF-style jump state with dedicated player motion hooks", () => {
    const state = createInitialState();
    const combatRun = performAction(createCombatRun(state, "cinder-kiln-alley"), { type: "jump" });
    const html = renderAppHtml({ state, mode: "combat", combatRun });

    expect(html).toContain('data-combat-action="jump"');
    expect(html).toContain('data-hotkey="C"');
    expect(html).toContain('data-player-motion="jump"');
    expect(html).toContain('data-player-air-state="jumping"');
    expect(html).toContain('data-player-airborne-active="true"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-jump"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="jump"] .combat-player-art');
    expect(stylesCss).toContain("@keyframes player-jump-rise");
  });

  it("renders DNF-style quick recover with dedicated player motion hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const heavyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 260,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        attackProfileId: "ash-crawler-burst" as CombatEnemy["attackProfileId"],
        position: { x: 352, y: 340 },
        nextAttackAtMs: 1
      }
    );
    const telegraph = stepCombat(heavyRun, {}, 1);
    const impacted = stepToElapsed(telegraph, telegraph.enemies[0].attackImpactAtMs ?? 0);
    const recovered = performAction(impacted, { type: "jump" });
    const html = renderAppHtml({ state, mode: "combat", combatRun: recovered });

    expect(html).toContain('data-combat-action="jump"');
    expect(html).toContain('data-hotkey="C"');
    expect(html).toContain('data-player-motion="quick-recover"');
    expect(html).toContain('data-player-state="recovering"');
    expect(html).toContain('data-player-quick-recover-active="true"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-quick-recover"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="quick-recover"] .combat-player-art');
    expect(stylesCss).toContain("@keyframes player-quick-recover-rise");
  });

  it("renders DNF-style airborne light attack with player, weapon, and impact hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const readyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 260,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        position: { x: 334, y: 340 },
        nextAttackAtMs: 9999
      }
    );
    const jumped = performAction(readyRun, { type: "jump" });
    const midair = stepCombat(jumped, {}, 180);
    const airWindup = performAction(midair, { type: "light" });
    const airStrike = stepCombat(airWindup, {}, 65);
    const html = renderAppHtml({ state, mode: "combat", combatRun: airStrike });

    expect(html).toContain('data-player-motion="air-light"');
    expect(html).toContain('data-player-air-state="jumping"');
    expect(html).toContain('data-player-airborne-active="true"');
    expect(html).toContain('data-player-air-attack-used="true"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-air-light"');
    expect(html).toContain('data-vfx-cue="air-light-slash"');
    expect(html).toContain('hit-impact-air-light');
    expect(stylesCss).toContain('.combat-player[data-player-motion="air-light"] .combat-player-art');
    expect(stylesCss).toContain('.combat-player[data-player-motion="air-light"] .combat-weapon');
    expect(stylesCss).toContain("@keyframes player-air-light-slash");
    expect(stylesCss).toContain("@keyframes weapon-air-light-slash");
  });

  it("renders DNF-style airborne heavy slam with player, weapon, target, and impact hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const readyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 260,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        position: { x: 348, y: 340 },
        nextAttackAtMs: 9999
      }
    );
    const jumped = performAction(readyRun, { type: "jump" });
    const midair = stepCombat(jumped, {}, 180);
    const airWindup = performAction(midair, { type: "heavy" });
    const airSlam = stepCombat(airWindup, {}, 120);
    const html = renderAppHtml({ state, mode: "combat", combatRun: airSlam });

    expect(html).toContain('data-player-motion="air-heavy"');
    expect(html).toContain('data-player-air-state="jumping"');
    expect(html).toContain('data-player-airborne-active="true"');
    expect(html).toContain('data-player-air-attack-used="true"');
    expect(html).toContain('data-player-air-attack-type="heavy"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-air-heavy"');
    expect(html).toContain('data-weapon-air-action="heavy"');
    expect(html).toContain('data-vfx-cue="air-heavy-impact"');
    expect(html).toContain('data-impact-air-action="heavy"');
    expect(html).toContain('hit-impact-air-heavy');
    expect(html).toContain('data-enemy-hit-air-action="heavy"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="air-heavy"] .combat-player-art');
    expect(stylesCss).toContain('.combat-player[data-player-motion="air-heavy"] .combat-weapon');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-air-action="heavy"] .enemy-art');
    expect(stylesCss).toContain("@keyframes player-air-heavy-slam");
    expect(stylesCss).toContain("@keyframes weapon-air-heavy-slam");
    expect(stylesCss).toContain("@keyframes monster-air-heavy-hit-react");
    expect(stylesCss).toContain("@keyframes air-heavy-impact-slam");
  });

  it("renders DNF-style grounded heavy launcher windup and hit-frame impact hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const readyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 260,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        position: { x: 334, y: 340 },
        nextAttackAtMs: 9999
      }
    );
    const windup = performAction(readyRun, { type: "heavy" });
    const [hitAtMs] = scheduledGroundHeavyTimes(windup);
    const inputHtml = renderAppHtml({ state, mode: "combat", combatRun: windup });
    const launcher = stepToElapsed(windup, hitAtMs);
    const hitHtml = renderAppHtml({ state, mode: "combat", combatRun: launcher });

    expect(inputHtml).toContain('data-player-motion="heavy"');
    expect(inputHtml).toContain('class="combat-player-art actor-model actor-model-heavy"');
    expect(inputHtml).toContain('--actor-x: 27.08%;');
    expect(inputHtml).toContain('data-player-normal-attack-type="heavy"');
    expect(inputHtml).toContain('data-player-normal-attack-move="ground-heavy"');
    expect(inputHtml).toContain('data-player-normal-attack-move-progress="0"');
    expect(inputHtml).toContain('data-player-normal-attack-start-x="260"');
    expect(inputHtml).toContain('data-player-normal-attack-end-x="294"');
    expect(inputHtml).toContain('data-player-normal-attack-hit-x="294"');
    expect(inputHtml).not.toContain('data-player-skill-move="ground-heavy"');
    expect(inputHtml).not.toContain('data-airborne-state="airborne"');
    expect(inputHtml).not.toContain('hit-impact-heavy');

    expect(hitHtml).toContain('data-player-motion="heavy"');
    expect(hitHtml).toContain('--actor-x: 30.63%;');
    expect(hitHtml).toContain('data-hit-action="heavy"');
    expect(hitHtml).toContain('data-airborne-state="airborne"');
    expect(hitHtml).toContain('data-enemy-motion="airborne"');
    expect(hitHtml).toContain('hit-impact-heavy');
    expect(hitHtml).toContain('data-damage-number="true"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="heavy"] .combat-player-art');
    expect(stylesCss).toContain('.combat-player[data-player-motion="heavy"] .combat-weapon');
    expect(stylesCss).toContain("@keyframes player-heavy-strike");
    expect(stylesCss).toContain("@keyframes weapon-heavy-swing");
  });

  it("renders DNF-style grounded light with timed model-following slash hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const readyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 240,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        position: { x: 405, y: 340 },
        nextAttackAtMs: 9999
      }
    );
    const windup = performAction(readyRun, { type: "light" });
    const [hitAtMs] = scheduledGroundLightTimes(windup);
    const inputHtml = renderAppHtml({ state, mode: "combat", combatRun: windup });
    const hit = stepToElapsed(windup, hitAtMs);
    const hitHtml = renderAppHtml({ state, mode: "combat", combatRun: hit });

    expect(inputHtml).toContain('data-player-motion="light"');
    expect(inputHtml).toContain('class="combat-player-art actor-model actor-model-light actor-model-light-1"');
    expect(inputHtml).toContain('--actor-x: 25.00%;');
    expect(inputHtml).toContain('data-player-normal-attack-type="light"');
    expect(inputHtml).toContain('data-player-normal-attack-move="ground-light-1"');
    expect(inputHtml).toContain('data-player-normal-attack-move-progress="0"');
    expect(inputHtml).toContain('data-player-normal-attack-start-x="240"');
    expect(inputHtml).toContain('data-player-normal-attack-end-x="258"');
    expect(inputHtml).toContain('data-player-normal-attack-hit-x="258"');
    expect(inputHtml).not.toContain('data-player-skill-move="ground-light-1"');
    expect(inputHtml).not.toContain('data-enemy-motion="hit"');

    expect(hitHtml).toContain('data-player-motion="light"');
    expect(hitHtml).toContain('--actor-x: 26.88%;');
    expect(hitHtml).toContain('data-hitstop-active="true"');
    expect(hitHtml).toContain('data-hit-action="light"');
    expect(hitHtml).toContain('data-impact-origin-x="405"');
    expect(hitHtml).toContain('data-impact-origin-y="340"');
    expect(hitHtml).toContain('data-damage-origin-x="405"');
    expect(hitHtml).toContain('data-damage-origin-y="340"');
    expect(hitHtml).toContain('style="--actor-x: 42.19%; --actor-y: 65.29%;"');
    expect(hitHtml).toContain('data-enemy-hit-slide-active="true"');
    expect(hitHtml).toContain('data-enemy-hit-slide-start-x="405"');
    expect(hitHtml).toContain('data-enemy-hit-slide-end-x="427"');
    expect(hitHtml).toContain('data-enemy-hit-slide-progress="0.00"');
    expect(hitHtml).toContain('style="--actor-x: 42.19%; --actor-y: 65.29%; --enemy-body-width:');
    expect(hitHtml).toContain('data-hit-phase="ground-light-1"');
    expect(hitHtml).toContain('data-hit-vfx-cue="ground-light-slash-1"');
    expect(hitHtml).toContain('data-enemy-hit-ground-light-step="1"');
    expect(hitHtml).toContain('data-enemy-motion="hit"');
    expect(hitHtml).toContain('hit-impact-ground-light-1');
    expect(hitHtml).toContain('data-impact-ground-light-step="1"');
    expect(hitHtml).toContain('data-damage-number="true"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="light"] .combat-player-art');
    expect(stylesCss).toContain('.combat-player[data-player-motion="light"] .combat-weapon');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-ground-light-step="1"] .enemy-art');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-ground-light-step="2"] .enemy-art');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-ground-light-step="3"] .enemy-art');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-slide-active="true"]');
    expect(stylesCss).toContain('.combat-scene[data-hitstop-active="true"] .combat-player-art');
    expect(stylesCss).toContain('.combat-scene[data-hitstop-active="true"] .enemy-art');
    expect(stylesCss).toContain('.combat-scene[data-hitstop-active="true"] .combat-weapon');
    expect(stylesCss).toContain('animation-play-state: paused');
    expect(stylesCss).toContain('.hit-impact-ground-light-1 .hit-slash');
    expect(stylesCss).toContain('.hit-impact-ground-light-2 .hit-slash');
    expect(stylesCss).toContain('.hit-impact-ground-light-3 .hit-slash');
    expect(stylesCss).toContain("@keyframes player-light-strike");
    expect(stylesCss).toContain("@keyframes weapon-light-swing");
    expect(stylesCss).toContain("@keyframes monster-ground-light-jab-react");
    expect(stylesCss).toContain("@keyframes monster-ground-light-cross-react");
    expect(stylesCss).toContain("@keyframes monster-ground-light-launch-react");
    expect(stylesCss).toContain("@keyframes ground-light-jab-impact-slash");
    expect(stylesCss).toContain("@keyframes ground-light-cross-impact-slash");
    expect(stylesCss).toContain("@keyframes ground-light-launch-impact-slash");
  });

  it("renders DNF-style dash-light with player, weapon, target, and impact hooks", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const readyRun = withSingleReadyEnemy(
      {
        ...baseRun,
        player: {
          ...baseRun.player,
          x: 240,
          y: 340,
          facing: 1,
          actionLockUntilMs: 0,
          hurtLockUntilMs: 0
        }
      },
      {
        position: { x: 382, y: 340 },
        nextAttackAtMs: 9999
      }
    );
    const dashed = stepCombat(readyRun, { moveX: 1, moveY: 0, dash: true }, 80);
    const dashWindup = performAction(dashed, { type: "light" });
    const [effect] = dashWindup.scheduledEnemyHitEffects.filter((item) => item.hitPhase === "dash-light");
    expect(effect).toBeDefined();
    if (!effect) {
      return;
    }
    const dashStrike = stepCombat(dashWindup, {}, effect.applyAtMs - dashWindup.elapsedMs);
    const html = renderAppHtml({ state, mode: "combat", combatRun: dashStrike });

    expect(html).toContain('data-player-motion="dash-light"');
    expect(html).toContain('data-player-state="dash-attacking"');
    expect(html).toContain('data-player-dash-attack-active="true"');
    expect(html).toContain('class="combat-player-art actor-model actor-model-dash-light"');
    expect(html).toContain('data-weapon-dash-action="light"');
    expect(html).toContain('data-vfx-cue="dash-light-slash"');
    expect(html).toContain('data-impact-dash-action="light"');
    expect(html).toContain('hit-impact-dash-light');
    expect(html).toContain('data-enemy-hit-dash-action="light"');
    expect(stylesCss).toContain('.combat-player[data-player-motion="dash-light"] .combat-player-art');
    expect(stylesCss).toContain('.combat-player[data-player-motion="dash-light"] .combat-weapon');
    expect(stylesCss).toContain('.combat-enemy[data-enemy-hit-dash-action="light"] .enemy-art');
    expect(stylesCss).toContain("@keyframes player-dash-light-strike");
    expect(stylesCss).toContain("@keyframes weapon-dash-light-slash");
    expect(stylesCss).toContain("@keyframes monster-dash-light-hit-react");
    expect(stylesCss).toContain("@keyframes dash-light-impact-slash");
  });

  it("renders DNF-style command inputs and manual-cast reduction hooks on skill slots", () => {
    const state = createInitialState();
    const combatRun = createCombatRun({ ...state, player: { ...state.player, heat: 24 } }, "cinder-kiln-alley");
    const html = renderAppHtml({ state: { ...state, player: { ...state.player, heat: 24 } }, mode: "combat", combatRun });

    expect(html).toContain('data-command-input="down,right,z"');
    expect(html).toContain('data-command-display="↓→Z"');
    expect(html).toContain('data-command-terminal-key="Z"');
    expect(html).toContain('data-command-base-cost="25"');
    expect(html).toContain('data-command-manual-cost="22"');
    expect(html).toContain('data-command-discount-percent="12"');
    expect(html).toContain('data-command-slot-state="available-by-command"');
    expect(html).toContain('class="skill-slot-command"');
    expect(html).toContain('class="command-key"');
    expect(html).toContain('class="skill-slot-discount"');
    expect(html).toContain("消耗-12%");
    expect(stylesCss).toContain(".skill-slot-command");
    expect(stylesCss).toContain(".command-key");
    expect(stylesCss).toContain(".skill-slot-discount");
    expect(stylesCss).toContain(".command-input-toast");
    expect(stylesCss).toContain("@media (max-width: 860px)");
    expect(stylesCss).toContain("grid-template-columns: repeat(3, minmax(92px, 1fr))");
  });

  it("renders DNF-style combo-cancel window and cancel release presentation", () => {
    const baseState = createInitialState();
    const state = { ...baseState, player: { ...baseState.player, heat: 80 } };
    const run = withSingleReadyEnemy(createCombatRun(state, "cinder-kiln-alley"), {
      hp: 180,
      maxHp: 180,
      nextAttackAtMs: 9999
    });
    const light = resolveGroundLight(performAction(run, { type: "light" }));
    const lightHtml = renderAppHtml({ state, mode: "combat", combatRun: light });
    const canceled = performAction(light, { type: "skill", skillId: "spark-combo" });
    const cancelHtml = renderAppHtml({ state, mode: "combat", combatRun: canceled });

    expect(lightHtml).toContain('data-combo-cancel-window-active="true"');
    expect(lightHtml).toContain('data-combo-cancel-state="available"');
    expect(cancelHtml).toContain('data-skill-release-source="cancel"');
    expect(cancelHtml).toContain('data-player-motion="skill"');
    expect(cancelHtml).toContain('data-combo-cancel-active="true"');
    expect(cancelHtml).toContain('data-combo-cancel-skill-id="spark-combo"');
    expect(cancelHtml).toContain('data-skill-cancel-toast="true"');
    expect(stylesCss).toContain(".skill-cancel-toast");
    expect(stylesCss).toContain('[data-combo-cancel-available="true"]');
    expect(stylesCss).toContain('[data-skill-release-source="cancel"]');
    expect(stylesCss).toContain("@keyframes skill-cancel-flash");
  });

  it("renders the playable town as the first screen instead of a landing page", () => {
    const html = renderAppHtml({ state: createInitialState(), mode: "town" });

    expect(html).toContain("烬璃纪元");
    expect(html).toContain("炉山市集");
    expect(html).toContain("烬拳卫");
    expect(html).toContain("灰窑巷");
    expect(html).toContain("琉璃熔炉");
    expect(html).toContain("背包");
    expect(html).toContain("强化");
    expect(html).toContain("增幅");
    expect(html).toContain("拍卖");
    expect(html).toContain("商城");
    expect(html).toContain("任务");
    expect(html).toContain("职业");
    expect(html).not.toContain("正在加载");
  });

  it("renders expected system panel text for repeated town workflows", () => {
    const state = createInitialState();

    expect(renderInventoryPanel(state)).toContain("套装");
    expect(renderInventoryPanel(state)).toContain("负重");
    expect(renderInventoryPanel(state)).toContain("对比");
    expect(renderInventoryPanel(state)).toContain("装备");
    expect(renderInventoryPanel(state)).toContain("出售");
    expect(renderInventoryPanel(state)).toContain("分解");
    expect(renderInventoryPanel(state)).toContain("锁定");
    expect(renderSmithPanel(state)).toContain("保护券");
    expect(renderSmithPanel(state)).toContain("增幅");
    expect(renderAuctionPanel(state)).toContain("建议价");
    expect(renderAuctionPanel(state)).toContain("热度");
    expect(renderAuctionPanel(state)).toContain('data-market-metric="recent-prices"');
    expect(renderAuctionPanel(state)).toContain('data-market-metric="listing-fee"');
    expect(renderAuctionPanel(state)).toContain('data-market-metric="auction-demand"');
    expect(renderAuctionPanel(state)).toContain('data-auction-price="300"');
    expect(renderShopPanel(state)).toContain("礼包");
    expect(renderShopPanel(state)).toContain("时装");
    expect(renderShopPanel(state)).toContain("概率");
    expect(renderShopPanel(state)).toContain('data-shop-sku="liuli-gift-pack"');
    expect(renderShopPanel(state)).toContain('data-shop-sku="reinforcement-pack"');
    expect(renderShopPanel(state)).toContain('data-shop-sku="forge-costume-pack"');
    expect(renderQuestPanel(state)).toContain("炉火未熄");
    const audio = setVolume(createAudioState(), "music", 0.42);

    expect(renderSettingsPanel(audio)).toContain("音乐");
    expect(renderSettingsPanel(audio)).toContain("音效");
    expect(renderSettingsPanel(audio)).toContain('data-volume-kind="music"');
    expect(renderSettingsPanel(audio)).toContain("本地自动保存");
    expect(renderSettingsPanel(audio)).toContain('value="42"');
    expect(renderSettingsPanel(audio)).toContain("重置存档");
  });

  it("renders a core system flow checklist from the quest board", () => {
    const html = renderQuestPanel(createInitialState());

    expect(html).toContain('data-flow-checklist="true"');

    for (const step of ["combat", "quest", "inventory", "reinforce", "amplify", "shop", "trade", "save"]) {
      expect(html).toContain(`data-flow-step="${step}"`);
      expect(html).toContain(`data-flow-action="${step}"`);
    }

    expect(html).toContain('data-mode="shop"');
    expect(html).toContain('data-mode="smith"');
    expect(html).toContain('data-mode="auction"');
    expect(html).toContain('data-mode="settings"');
    expect(html).toContain('data-flow-step="trade" data-flow-state="locked"');
  });

  it("renders per-gear smith actions so later echo-slot drops can be upgraded", () => {
    const baseState = createInitialState();
    const echoGear = createOwnedGear("epic-liuli-flow-ring", "echo-slot");
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        inventory: [...baseState.player.inventory, echoGear]
      }
    };
    const html = renderSmithPanel(state);

    expect(html).toContain('data-smith-gear-list="true"');
    expect(html).toContain(`data-smith-gear-id="${baseState.player.inventory[0].instanceId}"`);
    expect(html).toContain(`data-smith-gear-id="${echoGear.instanceId}"`);
    expect(html).toContain(`data-app-action="reinforce" data-gear-id="${echoGear.instanceId}"`);
    expect(html).toContain(`data-app-action="amplify" data-gear-id="${echoGear.instanceId}"`);
    expect(html).toContain('data-echo-slot="true"');
  });

  it("renders current-class weapon appearances by weapon level in inventory rows", () => {
    const rareWeapon = catalog.gear.find((item) => item.slot === "weapon" && item.rarity === "rare");

    if (!rareWeapon) {
      throw new Error("Expected rare weapon gear");
    }

    const baseState = selectBaseClass(createInitialState(), "ink-shadow-ranger");
    const rareOwned = createOwnedGear(rareWeapon.id, "rare-weapon");
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        inventory: [rareOwned],
        equipment: {
          weapon: rareOwned.instanceId
        }
      }
    };
    const html = renderInventoryPanel(state);

    expect(html).toContain('data-weapon-class-id="ink-shadow-ranger"');
    expect(html).toContain('data-weapon-tier="rare"');
    expect(html).toContain('data-weapon-appearance-id="weapon-ink-shadow-ranger-rare"');
    expect(html).toContain('class="weapon-art weapon-art-icon"');
    expect(html).toContain('/assets/weapons/weapon-ink-shadow-ranger-rare.svg');
    expect(html).toContain("玄墨机关弩");
    expect(html).toContain("赤矿机括");
  });

  it("mounts the equipped weapon layer on town and combat player models", () => {
    const mythicWeapon = catalog.gear.find((item) => item.id === "mythic-liuli-flow-weapon");

    if (!mythicWeapon) {
      throw new Error("Expected mythic weapon gear");
    }

    const baseState = selectBaseClass(createInitialState(), "liuli-blademage");
    const owned = createOwnedGear(mythicWeapon.id, "mythic-weapon");
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        inventory: [owned],
        equipment: {
          weapon: owned.instanceId
        }
      }
    };
    const townHtml = renderAppHtml({ state, mode: "town" });
    const combatHtml = renderAppHtml({ state, mode: "combat", combatRun: createCombatRun(state, "cinder-kiln-alley") });

    expect(townHtml).toContain('class="town-weapon weapon-layer weapon-layer-mythic"');
    expect(townHtml).toContain('data-weapon-appearance-id="weapon-liuli-blademage-mythic"');
    expect(townHtml).toContain('data-weapon-type="liuli-blade"');
    expect(townHtml).toContain('data-equipped-weapon-id="owned-mythic-liuli-flow-weapon-mythic-weapon"');
    expect(townHtml).toContain('class="weapon-art weapon-art-equipped"');
    expect(townHtml).toContain('/assets/weapons/weapon-liuli-blademage-mythic.svg');
    expect(combatHtml).toContain('class="combat-weapon weapon-layer weapon-layer-mythic"');
    expect(combatHtml).toContain('data-combat-weapon-appearance-id="weapon-liuli-blademage-mythic"');
    expect(combatHtml).toContain('data-weapon-type="liuli-blade"');
    expect(combatHtml).toContain('class="weapon-art weapon-art-equipped"');
    expect(combatHtml).toContain('weapon-shape-heaven-mirror-sword');
  });

  it("renders four base classes and advancement choices in the class panel", () => {
    const html = renderClassPanel(createInitialState());

    expect(html).toContain("职业");
    expect(html).toContain("烬拳卫");
    expect(html).toContain("琉璃剑客");
    expect(html).toContain("墨影游侠");
    expect(html).toContain("玄甲司炉");
    expect(html).toContain("转职");
    expect(html).toContain("爆炉宗师");
    expect(html).toContain("镇山破卫");
  });

  it("renders each class weapon progression from novice to mythic in the class panel", () => {
    const html = renderClassPanel(createInitialState());

    for (const appearance of catalog.weaponAppearances) {
      expect(html).toContain(`data-class-weapon-tier="${appearance.classId}-${appearance.tier}"`);
      expect(html).toContain(appearance.asset.src);
      expect(html).toContain(appearance.displayName);
    }
  });
});
