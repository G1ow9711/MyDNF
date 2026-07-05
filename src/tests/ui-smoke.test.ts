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
    const activeTrashRun = stepCombat(trashRun, {}, 500);
    const activeCrawlerRun = stepCombat(crawlerRun, {}, 500);
    const activeEliteRun = stepCombat(eliteRun, {}, 500);
    const activeZhengChargeRun = stepCombat(zhengChargeRun, {}, 520);
    const activeBossRun = stepCombat(bossRun, {}, 500);
    const activeTaotieDevourRun = stepCombat(taotieDevourRun, {}, 520);
    const activeTrashHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTrashRun });
    const crawlerHtml = renderAppHtml({ state, mode: "combat", combatRun: crawlerRun });
    const activeCrawlerHtml = renderAppHtml({ state, mode: "combat", combatRun: activeCrawlerRun });
    const activeEliteHtml = renderAppHtml({ state, mode: "combat", combatRun: activeEliteRun });
    const zhengChargeHtml = renderAppHtml({ state, mode: "combat", combatRun: zhengChargeRun });
    const activeZhengChargeHtml = renderAppHtml({ state, mode: "combat", combatRun: activeZhengChargeRun });
    const activeBossHtml = renderAppHtml({ state, mode: "combat", combatRun: activeBossRun });
    const taotieDevourHtml = renderAppHtml({ state, mode: "combat", combatRun: taotieDevourRun });
    const activeTaotieDevourHtml = renderAppHtml({ state, mode: "combat", combatRun: activeTaotieDevourRun });

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
    expect(stylesCss).toContain(".combat-feedback-skill-ash-ember-spit");
    expect(stylesCss).toContain(".combat-feedback-skill-ash-crawler-burst");
    expect(stylesCss).toContain(".combat-feedback-skill-zheng-shockwave");
    expect(stylesCss).toContain(".combat-feedback-skill-zheng-horn-charge");
    expect(stylesCss).toContain(".combat-feedback-skill-taotie-flame-breath");
    expect(stylesCss).toContain(".combat-feedback-skill-taotie-devour-pull");
    expect(stylesCss).toContain("@keyframes monster-ash-crawler-burst");
    expect(stylesCss).toContain("@keyframes monster-zheng-horn-charge");
    expect(stylesCss).toContain("@keyframes monster-taotie-devour-pull");
    expect(stylesCss).toContain("@keyframes ash-crawler-burst-core");
    expect(stylesCss).toContain("@keyframes ash-crawler-burst-hit-feedback");
    expect(stylesCss).toContain("@keyframes zheng-horn-charge-trail");
    expect(stylesCss).toContain("@keyframes zheng-horn-charge-hit-feedback");
    expect(stylesCss).toContain("@keyframes ash-ember-spit-trail");
    expect(stylesCss).toContain("@keyframes ash-ember-hit-feedback");
    expect(stylesCss).toContain("@keyframes zheng-shockwave-expand");
    expect(stylesCss).toContain("@keyframes zheng-shock-hit-feedback");
    expect(stylesCss).toContain("@keyframes taotie-breath-hit-feedback");
    expect(stylesCss).toContain("@keyframes taotie-devour-vortex-core");
    expect(stylesCss).toContain("@keyframes taotie-devour-hit-feedback");
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
    const volleyHits = castRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "black-rain-volley"
    );
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: {
        ...castRun,
        elapsedMs: Math.max(...volleyHits.map((event) => event.occurredAtMs))
      }
    });

    expect(countOccurrences(html, 'data-skill-impact-vfx="black-rain-volley"')).toBe(6);
    expect(html).toContain('data-impact-vfx-shape="black-rain"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-black-rain"');
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
    const rainHits = castRun.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "liuli-rain");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: {
        ...castRun,
        elapsedMs: Math.max(...rainHits.map((event) => event.occurredAtMs))
      }
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
    const detonationHits = castRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "night-mark-detonation"
    );
    const lockAtMs = Math.min(...detonationHits.map((event) => event.occurredAtMs));
    const finalAtMs = Math.max(...detonationHits.map((event) => event.occurredAtMs));
    const lockRun = stepCombat(castRun, {}, lockAtMs);
    const burstRun = stepCombat(lockRun, {}, finalAtMs - lockAtMs);
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: burstRun
    });

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
    const netHits = castRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "mechanism-shadow-net"
    );
    const bindAtMs = Math.min(...netHits.map((event) => event.occurredAtMs));
    const snapAtMs = Math.max(...netHits.map((event) => event.occurredAtMs));
    const html = renderAppHtml({
      state: inkState,
      mode: "combat",
      combatRun: stepCombat(stepCombat(castRun, {}, bindAtMs), {}, snapAtMs - bindAtMs)
    });

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
    const hammerHits = castRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "mountain-crack-hammer"
    );
    const staggerAtMs = Math.min(...hammerHits.map((event) => event.occurredAtMs));
    const impactAtMs = Math.max(...hammerHits.map((event) => event.occurredAtMs));
    const html = renderAppHtml({
      state: ironState,
      mode: "combat",
      combatRun: stepCombat(stepCombat(castRun, {}, staggerAtMs), {}, impactAtMs - staggerAtMs)
    });

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
    const stepHits = castRun.events.filter((event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "prism-step");
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: {
        ...castRun,
        elapsedMs: stepHits.length > 0 ? Math.max(...stepHits.map((event) => event.occurredAtMs)) : castRun.elapsedMs
      }
    });

    expect(stepHits).toHaveLength(2);
    expect(countOccurrences(html, 'data-skill-impact-vfx="prism-step"')).toBe(2);
    expect(html).toContain('data-impact-vfx-shape="prism-afterimage"');
    expect(html).toContain('data-vfx-cue="prism-pierce"');
    expect(html).toContain('class="skill-impact-burst skill-impact-shape-prism-afterimage"');
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
    const meteorHits = castRun.events.filter(
      (event): event is CombatHitEvent => event.kind === "hit" && event.skillId === "meteor-knuckle"
    );
    const html = renderAppHtml({
      state,
      mode: "combat",
      combatRun: {
        ...castRun,
        elapsedMs: Math.max(...meteorHits.map((event) => event.occurredAtMs))
      }
    });

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
