/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { createCombatRun, stepCombat, type CombatEnemy, type CombatRun } from "../game/combat";
import { createAudioState, setVolume } from "../systems/audio";
import { createInitialState, createOwnedGear } from "../game/state";
import { selectBaseClass } from "../systems/classes";
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
    const eliteRun = {
      ...trashRun,
      enemies: [
        {
          ...trashRun.enemies[0],
          kind: "elite" as const,
          displayName: "窑狰卫",
          hp: 180,
          maxHp: 180,
          armor: 30
        }
      ]
    };
    const bossRun = {
      ...trashRun,
      enemies: [
        {
          ...trashRun.enemies[0],
          kind: "boss" as const,
          displayName: "饕餮监工",
          hp: 520,
          maxHp: 520,
          armor: 80
        }
      ]
    };

    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain("/assets/monster-ash-rat.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: eliteRun })).toContain("/assets/monster-zheng-guard.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain("/assets/monster-taotie-overseer.png");
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain(
      'class="enemy-art actor-model actor-model-idle"'
    );
  });

  it("renders monster skill effects for trash, elite, and boss attack events", () => {
    const state = createInitialState();
    const baseRun = createCombatRun(state, "cinder-kiln-alley");
    const quietHtml = renderAppHtml({ state, mode: "combat", combatRun: baseRun });
    const trashRun = stepCombat(withSingleReadyEnemy(baseRun, { kind: "trash" }), {}, 80);
    const eliteRun = stepCombat(withSingleReadyEnemy(baseRun, { kind: "elite" }), {}, 80);
    const bossRun = stepCombat(withSingleReadyEnemy(baseRun, { kind: "boss" }), {}, 80);

    expect(quietHtml).not.toContain("data-enemy-skill-vfx");

    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain(
      'data-enemy-skill-vfx="ash-ember-spit"'
    );
    expect(renderAppHtml({ state, mode: "combat", combatRun: eliteRun })).toContain(
      'data-enemy-skill-vfx="zheng-shockwave"'
    );
    expect(renderAppHtml({ state, mode: "combat", combatRun: bossRun })).toContain(
      'data-enemy-skill-vfx="taotie-flame-breath"'
    );
    expect(renderAppHtml({ state, mode: "combat", combatRun: trashRun })).toContain(
      'data-enemy-attack-phase="windup"'
    );
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
    expect(html).toContain('class="room-clear-banner"');
    expect(html).toContain('data-enemy-state="defeated"');
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
    expect(renderQuestPanel(state)).toContain("炉火未熄");
    const audio = setVolume(createAudioState(), "music", 0.42);

    expect(renderSettingsPanel(audio)).toContain("音乐");
    expect(renderSettingsPanel(audio)).toContain("音效");
    expect(renderSettingsPanel(audio)).toContain('data-volume-kind="music"');
    expect(renderSettingsPanel(audio)).toContain("本地自动保存");
    expect(renderSettingsPanel(audio)).toContain('value="42"');
    expect(renderSettingsPanel(audio)).toContain("重置存档");
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
    expect(html).toContain("玄墨机关弩");
    expect(html).toContain("赤矿机括");
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
      expect(html).toContain(appearance.displayName);
    }
  });
});
