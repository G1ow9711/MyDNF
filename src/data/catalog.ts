import type { DungeonDefinition, EpicSet, GearItem, GearSlot, QuestDefinition, Rarity, SkillDefinition } from "../game/types";

const slots: readonly GearSlot[] = [
  "weapon",
  "core",
  "head",
  "body",
  "legs",
  "belt",
  "boots",
  "necklace",
  "bracelet",
  "ring",
  "sigil",
  "charm"
];

const slotNames: Record<GearSlot, string> = {
  weapon: "拳刃",
  core: "炉心",
  head: "战冠",
  body: "战衣",
  legs: "护腿",
  belt: "腰封",
  boots: "战靴",
  necklace: "颈链",
  bracelet: "腕轮",
  ring: "指环",
  sigil: "印记",
  charm: "护符"
};

export const skills: SkillDefinition[] = [
  {
    id: "spark-combo",
    displayName: "星火连拳",
    key: "J",
    heatCost: 0,
    heatGain: 12,
    cooldownMs: 1200,
    damageScale: 1.1,
    tags: ["starter", "combo"]
  },
  {
    id: "cinder-uppercut",
    displayName: "烬焰升龙",
    key: "K",
    heatCost: 0,
    heatGain: 10,
    cooldownMs: 2600,
    damageScale: 1.6,
    tags: ["launcher"]
  },
  {
    id: "furnace-step",
    displayName: "炉步冲肩",
    key: "L",
    heatCost: 15,
    heatGain: 0,
    cooldownMs: 3600,
    damageScale: 1.4,
    tags: ["dash"]
  },
  {
    id: "anvil-crash",
    displayName: "铁砧坠击",
    key: "U",
    heatCost: 25,
    heatGain: 0,
    cooldownMs: 5200,
    damageScale: 2.1,
    tags: ["slam", "burst"]
  },
  {
    id: "heat-bloom",
    displayName: "热浪绽放",
    key: "I",
    heatCost: 35,
    heatGain: 0,
    cooldownMs: 8200,
    damageScale: 2.6,
    tags: ["pull", "burst"]
  },
  {
    id: "meteor-knuckle",
    displayName: "陨星重拳",
    key: "O",
    heatCost: 70,
    heatGain: 0,
    cooldownMs: 16000,
    damageScale: 4.8,
    tags: ["ultimate", "burst"]
  }
];

export const epicSets: EpicSet[] = [
  {
    id: "ember-artisan",
    displayName: "烬火宗匠",
    theme: "heat-burst",
    bonuses: [
      { pieces: 2, displayName: "炉心回火", description: "普攻和连拳获得更多热能。", stats: { heatGain: 8 } },
      { pieces: 3, displayName: "宗匠焰纹", description: "消耗热能的技能附加火痕伤害。", stats: { element: 12 } },
      { pieces: 5, displayName: "烬火天工", description: "陨星重拳命中后触发二段爆燃。", stats: { attack: 34, element: 18 } }
    ]
  },
  {
    id: "liuli-flow",
    displayName: "流光琉璃",
    theme: "skill-cycler",
    bonuses: [
      { pieces: 2, displayName: "流彩折光", description: "技能冷却恢复速度提升。", stats: { cooldown: 6 } },
      { pieces: 3, displayName: "琉璃映焰", description: "高热能技能留下灼光轨迹。", stats: { crit: 8 } },
      { pieces: 5, displayName: "万色熔辉", description: "连续释放三种技能后强化下一次技能。", stats: { attack: 24, cooldown: 10 } }
    ]
  },
  {
    id: "kiln-shadow",
    displayName: "窑影行者",
    theme: "crit-juggle",
    bonuses: [
      { pieces: 2, displayName: "暗窑疾步", description: "冲刺后短时提升暴击。", stats: { crit: 10 } },
      { pieces: 3, displayName: "影中挑击", description: "对浮空和硬直目标伤害提升。", stats: { attack: 18 } },
      { pieces: 5, displayName: "窑影连环", description: "取消连段时获得攻速和移速。", stats: { crit: 14, moveSpeed: 10 } }
    ]
  },
  {
    id: "mountain-guard",
    displayName: "镇山玄甲",
    theme: "guard-breaker",
    bonuses: [
      { pieces: 2, displayName: "玄甲稳势", description: "重击后获得减伤。", stats: { defense: 24 } },
      { pieces: 3, displayName: "镇山破门", description: "破防伤害提升。", stats: { attack: 20, defense: 16 } },
      { pieces: 5, displayName: "不动如炉", description: "每个房间首次濒危时获得护盾。", stats: { defense: 48 } }
    ]
  },
  {
    id: "market-wind",
    displayName: "市风游商",
    theme: "farmer-trader",
    bonuses: [
      { pieces: 2, displayName: "市井脚程", description: "金币拾取和移速提升。", stats: { goldFind: 8, moveSpeed: 6 } },
      { pieces: 3, displayName: "游商眼力", description: "精英敌人掉落额外材料。", stats: { goldFind: 12 } },
      { pieces: 5, displayName: "风信契券", description: "首个首领奖励获得额外交易收益。", stats: { goldFind: 25, crit: 6 } }
    ]
  }
];

const rarityPlans: Array<{
  rarity: Rarity;
  idPrefix: string;
  displayPrefix: string;
  levelBase: number;
  setItems: boolean;
  repeats: number;
}> = [
  { rarity: "common", idPrefix: "ash", displayPrefix: "灰烬", levelBase: 1, setItems: false, repeats: 1 },
  { rarity: "uncommon", idPrefix: "kiln", displayPrefix: "窑火", levelBase: 8, setItems: false, repeats: 1 },
  { rarity: "rare", idPrefix: "red-ore", displayPrefix: "赤矿", levelBase: 16, setItems: false, repeats: 1 },
  { rarity: "epic", idPrefix: "epic", displayPrefix: "史诗", levelBase: 28, setItems: true, repeats: 2 },
  { rarity: "mythic", idPrefix: "mythic", displayPrefix: "神话", levelBase: 45, setItems: true, repeats: 1 }
];

export const gear: GearItem[] = rarityPlans.flatMap((plan) =>
  Array.from({ length: slots.length * plan.repeats }, (_, index) => {
    const slot = slots[index % slots.length];
    const set = epicSets[index % epicSets.length];
    const level = plan.levelBase + Math.floor(index / slots.length) * 5 + Math.floor((index % slots.length) / 3);
    const setId = plan.setItems ? set.id : undefined;
    const nameRoot = setId ? set.displayName : plan.displayPrefix;

    return {
      id: `${plan.idPrefix}-${index + 1}-${slot}`,
      displayName: `${nameRoot}${slotNames[slot]}`,
      rarity: plan.rarity,
      slot,
      level,
      setId,
      stats: {
        attack: slot === "weapon" || slot === "core" ? 8 + level : 2 + Math.floor(level / 3),
        defense: slot === "weapon" ? 0 : 5 + level,
        crit: slot === "ring" || slot === "bracelet" ? 2 + Math.floor(level / 12) : undefined,
        cooldown: slot === "sigil" || slot === "charm" ? 2 + Math.floor(level / 18) : undefined,
        element: setId && (slot === "weapon" || slot === "core") ? 4 + Math.floor(level / 10) : undefined
      },
      tags: setId ? [set.theme, slot] : [plan.rarity, slot]
    };
  })
);

export const dungeons: DungeonDefinition[] = [
  {
    id: "cinder-kiln-alley",
    displayName: "灰窑巷",
    minLevel: 1,
    rooms: 3,
    bossId: "kiln-warden",
    recommendedPower: 120,
    lootSetIds: ["ember-artisan", "kiln-shadow", "market-wind"]
  },
  {
    id: "liuli-furnace",
    displayName: "琉璃熔炉",
    minLevel: 20,
    rooms: 5,
    bossId: "liuli-overseer",
    recommendedPower: 420,
    lootSetIds: ["liuli-flow", "mountain-guard", "ember-artisan"]
  }
];

export const quests: QuestDefinition[] = [
  {
    id: "prologue-ember-warden",
    displayName: "炉火未熄",
    chapter: "序章",
    objective: "以烬拳卫身份调查灰窑巷的异火。",
    rewards: { gold: 600, ironDust: 20 },
    unlocks: ["cinder-kiln-alley"]
  },
  {
    id: "chapter-liuli-furnace",
    displayName: "琉璃熔声",
    chapter: "第一章",
    objective: "击败琉璃熔炉的监工并夺回炉心碎片。",
    rewards: { gold: 1600, arcShard: 8, valorToken: 3 },
    unlocks: ["liuli-furnace", "auction", "amplification"]
  }
];

export const catalog = {
  id: "ember-liuli-era",
  title: "烬璃纪元",
  hero: { id: "ember-warden", displayName: "烬拳卫" },
  skills,
  dungeons,
  epicSets,
  gear,
  quests
} as const;
