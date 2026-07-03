export type Rarity = "common" | "uncommon" | "rare" | "epic" | "mythic";

export type GearSlot =
  | "weapon"
  | "core"
  | "head"
  | "body"
  | "legs"
  | "belt"
  | "boots"
  | "necklace"
  | "bracelet"
  | "ring"
  | "sigil"
  | "charm";

export type StatKey =
  | "attack"
  | "defense"
  | "crit"
  | "cooldown"
  | "element"
  | "moveSpeed"
  | "goldFind"
  | "heatGain";

export type AmplifyStat = "crit" | "cooldown" | "element" | "moveSpeed";

export type SkillTag = "starter" | "launcher" | "dash" | "slam" | "pull" | "burst" | "ultimate" | "combo";

export type DungeonId = "cinder-kiln-alley" | "liuli-furnace";

export type TownId = "forge-market";

export type QuestStatus = "locked" | "active" | "ready" | "completed";

export type CurrencyId = "gold" | "ironDust" | "arcShard" | "valorToken" | "protectionTicket";

export interface StatBlock {
  attack?: number;
  defense?: number;
  crit?: number;
  cooldown?: number;
  element?: number;
  moveSpeed?: number;
  goldFind?: number;
  heatGain?: number;
}

export interface GearItem {
  id: string;
  displayName: string;
  rarity: Rarity;
  slot: GearSlot;
  level: number;
  setId?: string;
  amplification: {
    echoSlot: boolean;
  };
  stats: StatBlock;
  tags: string[];
}

export interface OwnedGearItem {
  instanceId: string;
  catalogGearId: string;
  reinforceLevel: number;
  amplifyLevel: number;
  amplifyStat?: AmplifyStat;
  locked: boolean;
  bound: boolean;
  tradable: boolean;
  sealed: boolean;
}

export interface EpicSetBonus {
  pieces: 2 | 3 | 5;
  displayName: string;
  description: string;
  stats: StatBlock;
}

export interface EpicSet {
  id: string;
  displayName: string;
  theme: string;
  bonuses: [EpicSetBonus, EpicSetBonus, EpicSetBonus];
}

export interface SkillDefinition {
  id: string;
  displayName: string;
  key: string;
  heatCost: number;
  heatGain: number;
  cooldownMs: number;
  damageScale: number;
  tags: SkillTag[];
}

export type SkillDef = SkillDefinition;

export interface DungeonDefinition {
  id: DungeonId;
  displayName: string;
  minLevel: number;
  rooms: number;
  bossId: string;
  recommendedPower: number;
  lootSetIds: string[];
}

export type DungeonDef = DungeonDefinition;

export interface TownDefinition {
  id: TownId;
  displayName: string;
  description: string;
  services: string[];
  connectedDungeonIds: DungeonId[];
}

export type TownDef = TownDefinition;

export interface QuestDefinition {
  id: string;
  displayName: string;
  chapter: string;
  objective: string;
  rewards: Partial<Record<CurrencyId, number>>;
  unlocks: string[];
}

export type QuestDef = QuestDefinition;

export type CurrencyState = Record<CurrencyId, number>;

export interface PlayerState {
  heroId: string;
  level: number;
  experience: number;
  heat: number;
  currencies: CurrencyState;
  inventory: OwnedGearItem[];
  equipment: Partial<Record<GearSlot, string>>;
  loadouts: Array<Partial<Record<GearSlot, string>>>;
  quests: Record<string, QuestStatus>;
  unlockedDungeons: DungeonId[];
}

export interface GameState {
  version: 1;
  catalogId: string;
  player: PlayerState;
  currentTown: TownId;
  currentDungeonId?: DungeonId;
  seenTutorials: string[];
}
