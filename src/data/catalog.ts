import type {
  ClassDefinition,
  ClassSkillDefinition,
  DungeonDef,
  EpicSet,
  GearItem,
  GearSlot,
  QuestDef,
  Rarity,
  SkillDef,
  TownDef
} from "../game/types";

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

export const skills: SkillDef[] = [
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

export const classSkills: ClassSkillDefinition[] = [
  { id: "spark-combo", classId: "ember-warden", displayName: "星火连拳", key: "J", resourceCost: 0, resourceGain: 12, cooldownMs: 1200, tags: ["starter", "combo"] },
  { id: "cinder-uppercut", classId: "ember-warden", displayName: "烬焰升龙", key: "K", resourceCost: 0, resourceGain: 10, cooldownMs: 2600, tags: ["launcher"] },
  { id: "furnace-step", classId: "ember-warden", displayName: "炉步冲肩", key: "L", resourceCost: 15, resourceGain: 0, cooldownMs: 3600, tags: ["dash"] },
  { id: "anvil-crash", classId: "ember-warden", displayName: "铁砧坠击", key: "U", resourceCost: 25, resourceGain: 0, cooldownMs: 5200, tags: ["slam", "burst"] },
  { id: "heat-bloom", classId: "ember-warden", displayName: "热浪绽放", key: "I", resourceCost: 35, resourceGain: 0, cooldownMs: 8200, tags: ["pull", "burst"] },
  { id: "meteor-knuckle", classId: "ember-warden", displayName: "陨星重拳", key: "O", resourceCost: 70, resourceGain: 0, cooldownMs: 16000, tags: ["ultimate", "burst"] },
  { id: "furnace-heart-overdrive", classId: "ember-warden", displayName: "炉心过载", key: "Space", resourceCost: 80, resourceGain: 0, cooldownMs: 18000, tags: ["advancement", "burst"] },
  { id: "mountain-guard-break", classId: "ember-warden", displayName: "镇山破门", key: "Space", resourceCost: 55, resourceGain: 0, cooldownMs: 15000, tags: ["advancement", "guard-break"] },

  { id: "glass-cut", classId: "liuli-blademage", displayName: "璃刃斩", key: "J", resourceCost: 0, resourceGain: 10, cooldownMs: 1100, tags: ["starter", "slash"] },
  { id: "prism-step", classId: "liuli-blademage", displayName: "流光步", key: "K", resourceCost: 0, resourceGain: 8, cooldownMs: 2500, tags: ["dash", "combo"] },
  { id: "mirror-arc", classId: "liuli-blademage", displayName: "镜弧回斩", key: "L", resourceCost: 14, resourceGain: 0, cooldownMs: 3600, tags: ["reflect"] },
  { id: "liuli-rain", classId: "liuli-blademage", displayName: "琉璃雨", key: "U", resourceCost: 24, resourceGain: 0, cooldownMs: 5200, tags: ["range", "burst"] },
  { id: "glass-lotus", classId: "liuli-blademage", displayName: "晶莲绽", key: "I", resourceCost: 36, resourceGain: 0, cooldownMs: 7800, tags: ["area"] },
  { id: "sword-prism-field", classId: "liuli-blademage", displayName: "剑镜领域", key: "O", resourceCost: 70, resourceGain: 0, cooldownMs: 15000, tags: ["ultimate"] },
  { id: "flowing-light-chain", classId: "liuli-blademage", displayName: "流光连式", key: "Space", resourceCost: 55, resourceGain: 0, cooldownMs: 14000, tags: ["advancement", "cycler"] },
  { id: "mirrorflame-burst", classId: "liuli-blademage", displayName: "镜火爆鸣", key: "Space", resourceCost: 75, resourceGain: 0, cooldownMs: 17000, tags: ["advancement", "element"] },

  { id: "ink-shot", classId: "ink-shadow-ranger", displayName: "墨羽射", key: "J", resourceCost: 0, resourceGain: 10, cooldownMs: 1000, tags: ["starter", "range"] },
  { id: "shadow-roll", classId: "ink-shadow-ranger", displayName: "影翻", key: "K", resourceCost: 0, resourceGain: 8, cooldownMs: 2400, tags: ["dash"] },
  { id: "marking-bolt", classId: "ink-shadow-ranger", displayName: "契印弩", key: "L", resourceCost: 12, resourceGain: 0, cooldownMs: 3300, tags: ["mark"] },
  { id: "ink-snare", classId: "ink-shadow-ranger", displayName: "墨缚阵", key: "U", resourceCost: 22, resourceGain: 0, cooldownMs: 5200, tags: ["trap", "control"] },
  { id: "crow-feint", classId: "ink-shadow-ranger", displayName: "鸦影佯攻", key: "I", resourceCost: 34, resourceGain: 0, cooldownMs: 7600, tags: ["evade", "crit"] },
  { id: "black-rain-volley", classId: "ink-shadow-ranger", displayName: "玄雨齐射", key: "O", resourceCost: 68, resourceGain: 0, cooldownMs: 15000, tags: ["ultimate"] },
  { id: "night-mark-detonation", classId: "ink-shadow-ranger", displayName: "夜契引爆", key: "Space", resourceCost: 50, resourceGain: 0, cooldownMs: 13000, tags: ["advancement", "crit"] },
  { id: "mechanism-shadow-net", classId: "ink-shadow-ranger", displayName: "机影罗网", key: "Space", resourceCost: 48, resourceGain: 0, cooldownMs: 13500, tags: ["advancement", "trap"] },

  { id: "iron-palm", classId: "iron-forge-guardian", displayName: "玄铁掌", key: "J", resourceCost: 0, resourceGain: 12, cooldownMs: 1300, tags: ["starter", "heavy"] },
  { id: "anvil-guard", classId: "iron-forge-guardian", displayName: "砧守", key: "K", resourceCost: 0, resourceGain: 10, cooldownMs: 2800, tags: ["guard"] },
  { id: "furnace-taunt", classId: "iron-forge-guardian", displayName: "炉鸣挑衅", key: "L", resourceCost: 16, resourceGain: 0, cooldownMs: 4000, tags: ["control"] },
  { id: "shield-quake", classId: "iron-forge-guardian", displayName: "盾震", key: "U", resourceCost: 28, resourceGain: 0, cooldownMs: 5600, tags: ["slam"] },
  { id: "molten-wall", classId: "iron-forge-guardian", displayName: "熔壁", key: "I", resourceCost: 38, resourceGain: 0, cooldownMs: 9000, tags: ["shield"] },
  { id: "earth-furnace-breaker", classId: "iron-forge-guardian", displayName: "地炉裂击", key: "O", resourceCost: 72, resourceGain: 0, cooldownMs: 17000, tags: ["ultimate", "guard-break"] },
  { id: "black-furnace-aegis", classId: "iron-forge-guardian", displayName: "玄炉护阵", key: "Space", resourceCost: 45, resourceGain: 0, cooldownMs: 14000, tags: ["advancement", "shield"] },
  { id: "mountain-crack-hammer", classId: "iron-forge-guardian", displayName: "裂山锻锤", key: "Space", resourceCost: 60, resourceGain: 0, cooldownMs: 15000, tags: ["advancement", "stagger"] }
];

export const classes: ClassDefinition[] = [
  {
    id: "ember-warden",
    displayName: "烬拳卫",
    internalName: "Ember Warden",
    resource: { id: "heat", displayName: "热能", max: 100 },
    roleTags: ["近战", "爆发", "浮空"],
    difficulty: 2,
    preferredWeapon: "拳刃",
    armorStyle: "轻甲",
    statFocus: ["attack", "heatGain", "element"],
    baseSkillIds: ["spark-combo", "cinder-uppercut", "furnace-step", "anvil-crash", "heat-bloom", "meteor-knuckle"],
    advancements: [
      { id: "ember-furnace-master", classId: "ember-warden", displayName: "爆炉宗师", description: "强化热能爆发和终结技窗口。", unlockLevel: 15, roleTags: ["爆发", "终结"], passiveBonuses: { attack: 18, heatGain: 10 }, skillIds: ["furnace-heart-overdrive"], vfxPalette: { primary: "#ff6b2c", secondary: "#ffd166", accent: "#ffffff" } },
      { id: "mountain-breaker", classId: "ember-warden", displayName: "镇山破卫", description: "强化破防、生存和重击控制。", unlockLevel: 15, roleTags: ["破防", "生存"], passiveBonuses: { defense: 18, attack: 10 }, skillIds: ["mountain-guard-break"], vfxPalette: { primary: "#f59e0b", secondary: "#475569", accent: "#f8fafc" } }
    ]
  },
  {
    id: "liuli-blademage",
    displayName: "琉璃剑客",
    internalName: "Liuli Blademage",
    resource: { id: "prism", displayName: "璃息", max: 100 },
    roleTags: ["中距", "连携", "元素"],
    difficulty: 3,
    preferredWeapon: "璃刃",
    armorStyle: "布甲",
    statFocus: ["cooldown", "element", "moveSpeed"],
    baseSkillIds: ["glass-cut", "prism-step", "mirror-arc", "liuli-rain", "glass-lotus", "sword-prism-field"],
    advancements: [
      { id: "flowing-light-swordmaster", classId: "liuli-blademage", displayName: "流光剑使", description: "以低冷却和三段连携压制敌群。", unlockLevel: 15, roleTags: ["循环", "机动"], passiveBonuses: { cooldown: 12, moveSpeed: 8 }, skillIds: ["flowing-light-chain"], vfxPalette: { primary: "#67e8f9", secondary: "#a78bfa", accent: "#ffffff" } },
      { id: "mirrorflame-arcanist", classId: "liuli-blademage", displayName: "镜火术士", description: "用镜火折射制造高额元素爆发。", unlockLevel: 15, roleTags: ["元素", "爆发"], passiveBonuses: { element: 18, crit: 6 }, skillIds: ["mirrorflame-burst"], vfxPalette: { primary: "#38bdf8", secondary: "#fb7185", accent: "#fde68a" } }
    ]
  },
  {
    id: "ink-shadow-ranger",
    displayName: "墨影游侠",
    internalName: "Ink Shadow Ranger",
    resource: { id: "ink", displayName: "墨契", max: 100 },
    roleTags: ["远程", "标记", "陷阱"],
    difficulty: 4,
    preferredWeapon: "机关弩",
    armorStyle: "皮甲",
    statFocus: ["crit", "moveSpeed", "goldFind"],
    baseSkillIds: ["ink-shot", "shadow-roll", "marking-bolt", "ink-snare", "crow-feint", "black-rain-volley"],
    advancements: [
      { id: "night-contract-hunter", classId: "ink-shadow-ranger", displayName: "夜契猎手", description: "叠加契印后引爆，适合暴击游走。", unlockLevel: 15, roleTags: ["暴击", "标记"], passiveBonuses: { crit: 16, moveSpeed: 6 }, skillIds: ["night-mark-detonation"], vfxPalette: { primary: "#111827", secondary: "#8b5cf6", accent: "#e0e7ff" } },
      { id: "mechanism-shadow-weaver", classId: "ink-shadow-ranger", displayName: "机关影师", description: "布置机关影网控制场地并提高收益。", unlockLevel: 15, roleTags: ["陷阱", "刷图"], passiveBonuses: { goldFind: 14, cooldown: 6 }, skillIds: ["mechanism-shadow-net"], vfxPalette: { primary: "#0f172a", secondary: "#22c55e", accent: "#facc15" } }
    ]
  },
  {
    id: "iron-forge-guardian",
    displayName: "玄甲司炉",
    internalName: "Iron Forge Guardian",
    resource: { id: "guard", displayName: "炉甲", max: 100 },
    roleTags: ["重甲", "防御", "破甲"],
    difficulty: 2,
    preferredWeapon: "炉盾",
    armorStyle: "重甲",
    statFocus: ["defense", "attack", "element"],
    baseSkillIds: ["iron-palm", "anvil-guard", "furnace-taunt", "shield-quake", "molten-wall", "earth-furnace-breaker"],
    advancements: [
      { id: "black-furnace-vanguard", classId: "iron-forge-guardian", displayName: "玄炉守将", description: "以护盾和减伤稳定推进。", unlockLevel: 15, roleTags: ["护盾", "坦克"], passiveBonuses: { defense: 28 }, skillIds: ["black-furnace-aegis"], vfxPalette: { primary: "#334155", secondary: "#f97316", accent: "#f8fafc" } },
      { id: "mountain-cracking-smith", classId: "iron-forge-guardian", displayName: "裂山锻师", description: "牺牲机动换取重击硬直和首领破甲。", unlockLevel: 15, roleTags: ["重击", "首领"], passiveBonuses: { attack: 20, defense: 10 }, skillIds: ["mountain-crack-hammer"], vfxPalette: { primary: "#78716c", secondary: "#ef4444", accent: "#fde68a" } }
    ]
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

const nonSetRarityPlans: Array<{
  rarity: Rarity;
  identity: string;
  displayPrefix: string;
  levelBase: number;
}> = [
  { rarity: "common", identity: "ash", displayPrefix: "普通灰烬", levelBase: 1 },
  { rarity: "uncommon", identity: "kiln-flame", displayPrefix: "精制窑火", levelBase: 8 },
  { rarity: "rare", identity: "red-ore", displayPrefix: "稀有赤矿", levelBase: 16 }
];

const mythicSlots: readonly GearSlot[] = ["weapon", "core", "body", "ring", "charm"];

const nonSetGear: GearItem[] = nonSetRarityPlans.flatMap((plan) =>
  slots.map((slot, slotIndex) => ({
    id: `${plan.rarity}-${plan.identity}-${slot}`,
    displayName: `${plan.displayPrefix}${slotNames[slot]}`,
    rarity: plan.rarity,
    slot,
    level: plan.levelBase + Math.floor(slotIndex / 3),
    amplification: { echoSlot: false },
    stats: {
      attack: slot === "weapon" || slot === "core" ? 8 + plan.levelBase : 2 + Math.floor(plan.levelBase / 3),
      defense: slot === "weapon" ? 0 : 5 + plan.levelBase,
      crit: slot === "ring" || slot === "bracelet" ? 2 + Math.floor(plan.levelBase / 12) : undefined,
      cooldown: slot === "sigil" || slot === "charm" ? 2 + Math.floor(plan.levelBase / 18) : undefined
    },
    tags: [plan.rarity, slot]
  }))
);

const epicGear: GearItem[] = epicSets.flatMap((set) =>
  slots.map((slot, slotIndex) => {
    const level = 28 + Math.floor(slotIndex / 3);
    return {
      id: `epic-${set.id}-${slot}`,
      displayName: `史诗${set.displayName}${slotNames[slot]}`,
      rarity: "epic",
      slot,
      level,
      setId: set.id,
      amplification: { echoSlot: true },
      stats: {
        attack: slot === "weapon" || slot === "core" ? 8 + level : 2 + Math.floor(level / 3),
        defense: slot === "weapon" ? 0 : 5 + level,
        crit: slot === "ring" || slot === "bracelet" ? 2 + Math.floor(level / 12) : undefined,
        cooldown: slot === "sigil" || slot === "charm" ? 2 + Math.floor(level / 18) : undefined,
        element: slot === "weapon" || slot === "core" ? 4 + Math.floor(level / 10) : undefined
      },
      tags: [set.theme, "epic", slot]
    };
  })
);

const mythicGear: GearItem[] = epicSets.flatMap((set) =>
  mythicSlots.map((slot) => ({
    id: `mythic-${set.id}-${slot}`,
    displayName: `神话${set.displayName}${slotNames[slot]}`,
    rarity: "mythic",
    slot,
    level: 50,
    setId: set.id,
    amplification: { echoSlot: true },
    stats: {
      attack: slot === "weapon" || slot === "core" ? 58 : 18,
      defense: slot === "weapon" ? 0 : 55,
      crit: slot === "ring" ? 8 : undefined,
      cooldown: slot === "charm" ? 6 : undefined,
      element: slot === "weapon" || slot === "core" ? 10 : undefined
    },
    tags: [set.theme, "mythic", slot]
  }))
);

export const gear: GearItem[] = [...nonSetGear, ...epicGear, ...mythicGear];

export const dungeons: DungeonDef[] = [
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

export const towns: TownDef[] = [
  {
    id: "forge-market",
    displayName: "炉山市集",
    description: "依山炉火而建的铸造市集，是烬拳卫整备、交易、接取委托的主城。",
    services: ["smith", "auction", "shop", "quest-board", "storage"],
    connectedDungeonIds: ["cinder-kiln-alley", "liuli-furnace"]
  }
];

export const quests: QuestDef[] = [
  {
    id: "prologue-ember-warden",
    displayName: "炉火未熄",
    chapter: "序章",
    objective: "清理灰窑巷，查明异火来源。",
    objectiveTrigger: { type: "dungeonCleared", targetId: "cinder-kiln-alley" },
    rewards: { gold: 600, ironDust: 20 },
    unlocks: ["liuli-furnace"],
    nextQuestIds: ["smith-first-spark", "chapter-liuli-furnace"]
  },
  {
    id: "smith-first-spark",
    displayName: "第一缕砧火",
    chapter: "第一章",
    objective: "完成一次强化，熟悉炉山市集的锻造流程。",
    objectiveTrigger: { type: "reinforced" },
    rewards: { ironDust: 30, protectionTicket: 1 },
    unlocks: ["smith", "trade"],
    nextQuestIds: []
  },
  {
    id: "chapter-liuli-furnace",
    displayName: "琉璃熔声",
    chapter: "第一章",
    objective: "击败琉璃熔炉的监工并夺回炉心碎片。",
    objectiveTrigger: { type: "dungeonCleared", targetId: "liuli-furnace" },
    rewards: { gold: 1600, arcShard: 8, valorToken: 3 },
    unlocks: ["auction", "amplification", "costume-pavilion"],
    nextQuestIds: []
  }
];

export const catalog = {
  id: "ember-liuli-era",
  title: "烬璃纪元",
  hero: { id: "ember-warden", displayName: "烬拳卫" },
  classes,
  classSkills,
  skills,
  dungeons,
  towns,
  epicSets,
  gear,
  quests
} as const;
