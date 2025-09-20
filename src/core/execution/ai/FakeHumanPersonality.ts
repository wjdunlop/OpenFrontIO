import { Difficulty, PlayerType, Relation, UnitType } from "../../game/Game";

export interface NumberRangeSpec {
  min: number;
  max: number;
}

export type RelationName =
  | keyof typeof Relation
  | "Hostile"
  | "Distrustful"
  | "Neutral"
  | "Friendly";
export type DifficultyName = keyof typeof Difficulty;
export type PlayerTypeName = keyof typeof PlayerType;

export interface BuildDirectiveSpecBase {
  unitType: string;
}

export interface BuildStructureDirectiveSpec extends BuildDirectiveSpecBase {
  kind: "structure";
}

export interface BuildWarshipDirectiveSpec extends BuildDirectiveSpecBase {
  kind: "warship";
  chanceOdds: number;
  spawnRadius: number;
  maxExisting: number;
  minPorts: number;
}

export type BuildDirectiveSpec =
  | BuildStructureDirectiveSpec
  | BuildWarshipDirectiveSpec;

export interface FakeHumanPersonalitySpec {
  id: string;
  pacing: {
    attackRateTicks: NumberRangeSpec;
    triggerRatio: NumberRangeSpec;
    reserveRatio: NumberRangeSpec;
    expandRatio: NumberRangeSpec;
  };
  spawn: {
    landSearch: {
      delta: number;
      attempts: number;
      skipMountainOdds: number;
    };
  };
  diplomacy: {
    embargo: {
      relationMalus: number;
      startRelation: RelationName;
      stopRelation: RelationName;
    };
    allianceRequestOdds: number;
    neutralAllianceExtensionOdds: number;
    allowImmediateBetrayal: boolean;
    allianceAcceptance: {
      minRelation: RelationName;
      rejectTraitors: boolean;
      sizeAdvantageRatio: number;
      maxAlliances: number;
    };
    assist: {
      minRelation: RelationName;
      relationPenalty: number;
      emoji: string;
    };
    skipFakeHumanNeighborOdds: number;
    traitorAttackOdds: number;
  };
  combat: {
    weakestEnemyOdds: number;
    friendlyAttackOdds: number;
    friendlyDiscouragedAttackOdds: number;
    hostileDiscouragedAttackOdds: number;
    discourage: {
      targetTypes: PlayerTypeName[];
      difficulties: DifficultyName[];
      ignoreTraitors: boolean;
    };
  };
  behavior: {
    enemyMemoryTicks: number;
  };
  communications: {
    tauntCooldownTicks: number;
    tauntEmojis: string[];
  };
  naval: {
    idleRaidOdds: number;
    engagedRaidOdds: number;
    raidTroopShare: number;
    attackTroopShare: number;
    boatDestinationSearchRadius: number;
    boatDestinationMaxAttempts: number;
    warship: {
      chanceOdds: number;
      spawnRadius: number;
      maxExisting: number;
      minPorts: number;
    };
  };
  nukes: {
    randomTileSampleSize: number;
    borderValidationRadius: number;
    damageRadius: number;
    samAvoidanceRadius: number;
    structureScores: Record<string, number>;
    samPenalty: number;
    distancePenaltyPerTile: number;
    recentTargetPenalty: number;
    recentTargetCooldownTicks: number;
  };
  construction: {
    perceivedCostMultiplierCap: number;
    structureTileSampleSize: number;
    sequence: BuildDirectiveSpec[];
  };
}

export interface BuildStructureDirective {
  kind: "structure";
  unitType: UnitType;
}

export interface BuildWarshipDirective {
  kind: "warship";
  unitType: UnitType;
  chanceOdds: number;
  spawnRadius: number;
  maxExisting: number;
  minPorts: number;
}

export type BuildDirective = BuildStructureDirective | BuildWarshipDirective;

export interface FakeHumanPersonality {
  id: string;
  pacing: {
    attackRateTicks: NumberRangeSpec;
    triggerRatio: NumberRangeSpec;
    reserveRatio: NumberRangeSpec;
    expandRatio: NumberRangeSpec;
  };
  spawn: {
    landSearch: {
      delta: number;
      attempts: number;
      skipMountainOdds: number;
    };
  };
  diplomacy: {
    embargo: {
      relationMalus: number;
      startRelation: Relation;
      stopRelation: Relation;
    };
    allianceRequestOdds: number;
    neutralAllianceExtensionOdds: number;
    allowImmediateBetrayal: boolean;
    allianceAcceptance: {
      minRelation: Relation;
      rejectTraitors: boolean;
      sizeAdvantageRatio: number;
      maxAlliances: number;
    };
    assist: {
      minRelation: Relation;
      relationPenalty: number;
      emoji: string;
    };
    skipFakeHumanNeighborOdds: number;
    traitorAttackOdds: number;
  };
  combat: {
    weakestEnemyOdds: number;
    friendlyAttackOdds: number;
    friendlyDiscouragedAttackOdds: number;
    hostileDiscouragedAttackOdds: number;
    discourage: {
      targetTypes: PlayerType[];
      difficulties: Difficulty[];
      ignoreTraitors: boolean;
    };
  };
  behavior: {
    enemyMemoryTicks: number;
  };
  communications: {
    tauntCooldownTicks: number;
    tauntEmojis: string[];
  };
  naval: {
    idleRaidOdds: number;
    engagedRaidOdds: number;
    raidTroopShare: number;
    attackTroopShare: number;
    boatDestinationSearchRadius: number;
    boatDestinationMaxAttempts: number;
    warship: {
      chanceOdds: number;
      spawnRadius: number;
      maxExisting: number;
      minPorts: number;
    };
  };
  nukes: {
    randomTileSampleSize: number;
    borderValidationRadius: number;
    damageRadius: number;
    samAvoidanceRadius: number;
    structureScores: Partial<Record<UnitType, number>>;
    samPenalty: number;
    distancePenaltyPerTile: number;
    recentTargetPenalty: number;
    recentTargetCooldownTicks: number;
  };
  construction: {
    perceivedCostMultiplierCap: number;
    structureTileSampleSize: number;
    sequence: BuildDirective[];
  };
}

export interface FakeHumanPersonalityFileSpec {
  personalities: FakeHumanPersonalitySpec[];
}

const relationLookup: Record<string, Relation> = {
  Hostile: Relation.Hostile,
  Distrustful: Relation.Distrustful,
  Neutral: Relation.Neutral,
  Friendly: Relation.Friendly,
};

const difficultyLookup: Record<string, Difficulty> = Object.fromEntries(
  Object.values(Difficulty).map((difficulty) => [difficulty, difficulty]),
) as Record<string, Difficulty>;

const playerTypeLookup: Record<string, PlayerType> = Object.fromEntries(
  Object.values(PlayerType).map((type) => [type, type]),
) as Record<string, PlayerType>;

function parseRelation(name: RelationName): Relation {
  const relation = relationLookup[name];
  if (relation === undefined) {
    throw new Error(`Unknown relation name: ${name}`);
  }
  return relation;
}

function parseDifficulty(name: DifficultyName): Difficulty {
  const difficulty = difficultyLookup[name];
  if (difficulty === undefined) {
    throw new Error(`Unknown difficulty: ${name}`);
  }
  return difficulty;
}

function parsePlayerType(name: PlayerTypeName): PlayerType {
  const playerType = playerTypeLookup[name];
  if (playerType === undefined) {
    throw new Error(`Unknown player type: ${name}`);
  }
  return playerType;
}

function parseUnitType(name: string): UnitType {
  const entry = (Object.values(UnitType) as string[]).find(
    (value) => value === name,
  );
  if (!entry) {
    throw new Error(`Unknown unit type: ${name}`);
  }
  return entry as UnitType;
}

function normalizeBuildDirective(spec: BuildDirectiveSpec): BuildDirective {
  switch (spec.kind) {
    case "structure":
      return {
        kind: "structure",
        unitType: parseUnitType(spec.unitType),
      };
    case "warship":
      return {
        kind: "warship",
        unitType: parseUnitType(spec.unitType),
        chanceOdds: spec.chanceOdds,
        spawnRadius: spec.spawnRadius,
        maxExisting: spec.maxExisting,
        minPorts: spec.minPorts,
      };
    default:
      throw new Error(
        `Unknown build directive kind: ${(spec as BuildDirectiveSpec).kind}`,
      );
  }
}

export function normalizeFakeHumanPersonality(
  spec: FakeHumanPersonalitySpec,
): FakeHumanPersonality {
  return {
    id: spec.id,
    pacing: spec.pacing,
    spawn: spec.spawn,
    diplomacy: {
      embargo: {
        relationMalus: spec.diplomacy.embargo.relationMalus,
        startRelation: parseRelation(spec.diplomacy.embargo.startRelation),
        stopRelation: parseRelation(spec.diplomacy.embargo.stopRelation),
      },
      allianceRequestOdds: spec.diplomacy.allianceRequestOdds,
      neutralAllianceExtensionOdds: spec.diplomacy.neutralAllianceExtensionOdds,
      allowImmediateBetrayal: spec.diplomacy.allowImmediateBetrayal,
      allianceAcceptance: {
        minRelation: parseRelation(
          spec.diplomacy.allianceAcceptance.minRelation,
        ),
        rejectTraitors: spec.diplomacy.allianceAcceptance.rejectTraitors,
        sizeAdvantageRatio:
          spec.diplomacy.allianceAcceptance.sizeAdvantageRatio,
        maxAlliances: spec.diplomacy.allianceAcceptance.maxAlliances,
      },
      assist: {
        minRelation: parseRelation(spec.diplomacy.assist.minRelation),
        relationPenalty: spec.diplomacy.assist.relationPenalty,
        emoji: spec.diplomacy.assist.emoji,
      },
      skipFakeHumanNeighborOdds: spec.diplomacy.skipFakeHumanNeighborOdds,
      traitorAttackOdds: spec.diplomacy.traitorAttackOdds,
    },
    combat: {
      weakestEnemyOdds: spec.combat.weakestEnemyOdds,
      friendlyAttackOdds: spec.combat.friendlyAttackOdds,
      friendlyDiscouragedAttackOdds: spec.combat.friendlyDiscouragedAttackOdds,
      hostileDiscouragedAttackOdds: spec.combat.hostileDiscouragedAttackOdds,
      discourage: {
        targetTypes: spec.combat.discourage.targetTypes.map(parsePlayerType),
        difficulties: spec.combat.discourage.difficulties.map(parseDifficulty),
        ignoreTraitors: spec.combat.discourage.ignoreTraitors,
      },
    },
    behavior: spec.behavior,
    communications: spec.communications,
    naval: spec.naval,
    nukes: {
      randomTileSampleSize: spec.nukes.randomTileSampleSize,
      borderValidationRadius: spec.nukes.borderValidationRadius,
      damageRadius: spec.nukes.damageRadius,
      samAvoidanceRadius: spec.nukes.samAvoidanceRadius,
      structureScores: Object.fromEntries(
        Object.entries(spec.nukes.structureScores).map(([key, value]) => [
          parseUnitType(key),
          value,
        ]),
      ) as Partial<Record<UnitType, number>>,
      samPenalty: spec.nukes.samPenalty,
      distancePenaltyPerTile: spec.nukes.distancePenaltyPerTile,
      recentTargetPenalty: spec.nukes.recentTargetPenalty,
      recentTargetCooldownTicks: spec.nukes.recentTargetCooldownTicks,
    },
    construction: {
      perceivedCostMultiplierCap: spec.construction.perceivedCostMultiplierCap,
      structureTileSampleSize: spec.construction.structureTileSampleSize,
      sequence: spec.construction.sequence.map(normalizeBuildDirective),
    },
  };
}

export class FakeHumanPersonalityCatalog {
  private readonly personalities: Map<string, FakeHumanPersonality>;

  constructor(personalities: FakeHumanPersonality[]) {
    this.personalities = new Map(personalities.map((p) => [p.id, p]));
  }

  static fromSpecFile(
    file: FakeHumanPersonalityFileSpec,
  ): FakeHumanPersonalityCatalog {
    const personalities = file.personalities.map(normalizeFakeHumanPersonality);
    return new FakeHumanPersonalityCatalog(personalities);
  }

  get(id: string): FakeHumanPersonality {
    const personality = this.personalities.get(id);
    if (!personality) {
      throw new Error(`Unknown fake human personality: ${id}`);
    }
    return personality;
  }

  has(id: string): boolean {
    return this.personalities.has(id);
  }

  ids(): string[] {
    return Array.from(this.personalities.keys());
  }
}
