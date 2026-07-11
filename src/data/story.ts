export type StoryDialoguePhase = "briefing" | "turn-in";

export type StoryNpcId =
  | "guild-archivist"
  | "forge-smith"
  | "rescued-trader"
  | "liuli-appraiser"
  | "costume-keeper";

export interface StoryNpcDefinition {
  id: StoryNpcId;
  displayName: string;
  role: string;
  portraitIndex: 0 | 1 | 2 | 3 | 4;
}

export interface StoryDialogueLine {
  npcId: StoryNpcId;
  text: string;
}

export interface QuestStoryScript {
  questId: string;
  briefing: readonly StoryDialogueLine[];
  turnIn: readonly StoryDialogueLine[];
}

export const storyNpcs: Record<StoryNpcId, StoryNpcDefinition> = {
  "guild-archivist": { id: "guild-archivist", displayName: "沈砚", role: "公会司书", portraitIndex: 0 },
  "forge-smith": { id: "forge-smith", displayName: "韩铁娘", role: "炉山铁匠", portraitIndex: 1 },
  "rescued-trader": { id: "rescued-trader", displayName: "陆行舟", role: "获救商人", portraitIndex: 2 },
  "liuli-appraiser": { id: "liuli-appraiser", displayName: "白璃", role: "琉璃鉴定师", portraitIndex: 3 },
  "costume-keeper": { id: "costume-keeper", displayName: "苏锦屏", role: "天衣掌柜", portraitIndex: 4 }
};

export const questStoryScripts: readonly QuestStoryScript[] = [
  {
    questId: "prologue-ember-warden",
    briefing: [
      { npcId: "guild-archivist", text: "灰窑巷的炉火熄了三日，夜里却有人看见屋脊下透出红光。" },
      { npcId: "guild-archivist", text: "失踪的商队最后经过那里。清理盘踞的异兽，查清火从何来。" },
      { npcId: "guild-archivist", text: "沿石巷向东，击败监守窑门的怪物后立刻回报。" }
    ],
    turnIn: [
      { npcId: "guild-archivist", text: "你带回的灰里混着琉璃屑，这不是普通窑火能烧出的东西。" },
      { npcId: "guild-archivist", text: "陆行舟获救前听见地下传来炉钟声，线索指向封闭的琉璃熔炉。" },
      { npcId: "guild-archivist", text: "公会开放熔炉通行令。先去铁匠铺整备，再追查炉心。" }
    ]
  },
  {
    questId: "smith-first-spark",
    briefing: [
      { npcId: "forge-smith", text: "好兵器不是火里放得越久越好，火候和落锤都要准。" },
      { npcId: "forge-smith", text: "选一件装备，用玄铁尘稳住器骨，再完成一次强化。" },
      { npcId: "forge-smith", text: "成功失败都算经验，先学会听懂铁的回声。" }
    ],
    turnIn: [
      { npcId: "forge-smith", text: "锤痕齐整，器骨没散。你掌握得比我预想更快。" },
      { npcId: "forge-smith", text: "往后强化越高，代价和风险越大，保护券要留在紧要处。" },
      { npcId: "forge-smith", text: "这批玄铁尘归你，下一次自己挑一条强化路线。" }
    ]
  },
  {
    questId: "chapter-liuli-furnace",
    briefing: [
      { npcId: "liuli-appraiser", text: "灰窑里的碎屑与旧炉心同源，但表面附着了陌生的异响纹。" },
      { npcId: "liuli-appraiser", text: "进入琉璃熔炉，击破监工护甲，带回完整炉心碎片。" },
      { npcId: "liuli-appraiser", text: "熔炉深处温度失控，留意玻璃雨和地面裂火。" }
    ],
    turnIn: [
      { npcId: "liuli-appraiser", text: "碎片仍在共振，监工只是被炉心异响驱使的守门者。" },
      { npcId: "liuli-appraiser", text: "纹路通向市集商路，有人在借交易把污染过的器物送往各地。" },
      { npcId: "liuli-appraiser", text: "拍卖、增幅与天衣阁现已开放，我们需要从流通记录继续追查。" }
    ]
  },
  {
    questId: "chapter-two-trade-contract",
    briefing: [
      { npcId: "rescued-trader", text: "那批货单写的是瓷釉，箱底却全是会发热的黑色碎片。" },
      { npcId: "rescued-trader", text: "替我完成一笔城镇委托，我能借交割印记追出上家的路。" },
      { npcId: "rescued-trader", text: "只走公会账面，别让幕后的人察觉我们在查。" }
    ],
    turnIn: [
      { npcId: "rescued-trader", text: "印记对上了。货从天炉旧道出来，却绕过了所有正式关卡。" },
      { npcId: "rescued-trader", text: "买家专收带异响槽的装备，像是在筛选能承受共鸣的器物。" },
      { npcId: "rescued-trader", text: "去找韩铁娘做一次增幅，看看碎片究竟想唤醒什么。" }
    ]
  },
  {
    questId: "chapter-two-relic-study",
    briefing: [
      { npcId: "liuli-appraiser", text: "副本掉落会保留炉火与异响的双重痕迹，普通样本不够。" },
      { npcId: "liuli-appraiser", text: "带回任意一件真实战利品，我会比对它的材质层和共鸣线。" },
      { npcId: "liuli-appraiser", text: "不要提前分解，完整器物才能留下可靠证据。" }
    ],
    turnIn: [
      { npcId: "liuli-appraiser", text: "看这里，器物的纹路在成形前就被刻入，不是后来污染。" },
      { npcId: "liuli-appraiser", text: "有人从铸造源头改写装备，让它们成为炉心共鸣的节点。" },
      { npcId: "liuli-appraiser", text: "样本我已记录。这些弧晶可帮助你验证其他异响装备。" }
    ]
  },
  {
    questId: "chapter-two-resonance",
    briefing: [
      { npcId: "forge-smith", text: "异响槽像一口没敲响的钟，增幅就是给它第一记锤音。" },
      { npcId: "forge-smith", text: "选一件带异响槽的装备，以弧晶完成一次增幅。" },
      { npcId: "forge-smith", text: "若共鸣失控立刻停手，别让炉心反过来吞掉器骨。" }
    ],
    turnIn: [
      { npcId: "forge-smith", text: "共鸣稳定了，但回声里还有更深的一层炉钟。" },
      { npcId: "forge-smith", text: "这说明天炉深处仍在运转，而且有人维持着它。" },
      { npcId: "forge-smith", text: "带上保护券。下一次，我们面对的不会只是失控怪物。" }
    ]
  },
  {
    questId: "epilogue-market-oath",
    briefing: [
      { npcId: "costume-keeper", text: "天炉旧道寒热交替，普通行装撑不过第一层风口。" },
      { npcId: "costume-keeper", text: "从市集购入琉璃补给，我会替你配好耐热衬层与封纹。" },
      { npcId: "costume-keeper", text: "准备妥当再出发。深层入口尚未开启，但炉钟已经在催人。" }
    ],
    turnIn: [
      { npcId: "costume-keeper", text: "补给与行装都已封好，异响不会轻易穿透这层织纹。" },
      { npcId: "costume-keeper", text: "市集的人把希望押在你身上，也把最好的手艺交给了你。" },
      { npcId: "costume-keeper", text: "待天炉门开，沿着炉钟前行。炉山市集会守住你的归路。" }
    ]
  }
];

export function getQuestStoryScript(questId: string): QuestStoryScript | undefined {
  return questStoryScripts.find((script) => script.questId === questId);
}

export function getStoryDialogueLines(questId: string, phase: StoryDialoguePhase): readonly StoryDialogueLine[] {
  const script = getQuestStoryScript(questId);

  if (!script) {
    return [];
  }

  return phase === "briefing" ? script.briefing : script.turnIn;
}
