// Shared domain types for the Eldrin Chronicles

export type View =
  | "hall"
  | "knowledge"
  | "guild"
  | "grimoire"
  | "profile"
  | "admin"
  | "login";

export type KnowledgeTab =
  | "countries"
  | "personalities"
  | "relations"
  | "systems"
  | "pantheon"
  | "legends";

export type Role = "ADMIN" | "PLAYER";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  category: string | null;
  autoGrant: boolean;
  createdAt: string;
}

export interface Country {
  id: string;
  name: string;
  description: string;
  banner: string | null;
  emblem: string | null;
  capital: string | null;
  government: string | null;
  population: string | null;
  culture: string | null;
  climate: string | null;
}

export interface Personality {
  id: string;
  name: string;
  title: string | null;
  description: string;
  portrait: string | null;
  affiliation: string | null;
  role: string | null;
  status: string;
}

export interface CountryRelation {
  id: string;
  countryAName: string;
  countryBName: string;
  relationType: string;
  description: string | null;
}

export interface WorldSystem {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string | null;
}

export interface God {
  id: string;
  name: string;
  title: string | null;
  domain: string;
  description: string;
  symbol: string | null;
  alignment: string | null;
  pantheon: string | null;
}

export interface Legend {
  id: string;
  title: string;
  content: string;
  era: string | null;
  icon: string | null;
}

export interface GuildRank {
  id: string;
  name: string;
  level: number;
  description: string | null;
  icon: string | null;
  minXp: number;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  race: string | null;
  charClass: string | null;
  level: number;
  xp: number;
  bio: string | null;
  portrait: string | null;
  guildRankId: string | null;
  guildRank?: GuildRank | null;
  achievements?: { achievement: Achievement; grantedAt: string; grantedBy: string | null }[];
  questProgress?: { quest: Quest; status: string; acceptedAt: string; completedAt: string | null }[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  reward: string | null;
  location: string | null;
  status: string;
}

export interface GrimoireEntry {
  id: string;
  title: string;
  encodedContent: string;
  realContent: string;
  unlocked: boolean;
  unlockHint: string | null;
  category: string;
  order: number;
}
