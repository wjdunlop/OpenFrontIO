import {
  AllianceRequest,
  Game,
  Player,
  PlayerType,
  Relation,
  TerraNullius,
  Tick,
} from "../../game/Game";
import { PseudoRandom } from "../../PseudoRandom";
import { flattenedEmojiTable } from "../../Util";
import { AllianceExtensionExecution } from "../alliance/AllianceExtensionExecution";
import { AttackExecution } from "../AttackExecution";
import { EmojiExecution } from "../EmojiExecution";

export interface BotBehaviorSettings {
  enemyMemoryTicks: number;
  neutralAllianceExtensionOdds: number;
  assist: {
    minRelation: Relation;
    relationPenalty: number;
    emoji: string;
  };
  skipFakeHumanNeighborOdds: number;
  traitorAttackOdds: number;
  allianceAcceptance: {
    minRelation: Relation;
    rejectTraitors: boolean;
    sizeAdvantageRatio: number;
    maxAlliances: number;
  };
}

export class BotBehavior {
  private enemy: Player | null = null;
  private enemyUpdated: Tick;
  private assistAcceptEmoji: number;

  constructor(
    private random: PseudoRandom,
    private game: Game,
    private player: Player,
    private settings: BotBehaviorSettings,
    private triggerRatio: number,
    private reserveRatio: number,
    private expandRatio: number,
  ) {
    this.enemyUpdated = this.game.ticks();
    this.assistAcceptEmoji = this.resolveEmoji(settings.assist.emoji);
  }

  handleAllianceRequests() {
    for (const req of this.player.incomingAllianceRequests()) {
      if (this.shouldAcceptAllianceRequest(req)) {
        req.accept();
      } else {
        req.reject();
      }
    }
  }

  handleAllianceExtensionRequests() {
    for (const alliance of this.player.alliances()) {
      if (!alliance.onlyOneAgreedToExtend()) continue;

      const human = alliance.other(this.player);
      if (
        this.player.type() === PlayerType.FakeHuman &&
        this.player.relation(human) === Relation.Neutral
      ) {
        if (!this.random.chance(this.settings.neutralAllianceExtensionOdds)) {
          continue;
        }
      }

      this.game.addExecution(
        new AllianceExtensionExecution(this.player, human.id()),
      );
    }
  }

  private resolveEmoji(emoji: string): number {
    const index = flattenedEmojiTable.indexOf(emoji);
    if (index === -1) {
      throw new Error(`Emoji ${emoji} not found in emoji table`);
    }
    return index;
  }

  private shouldAcceptAllianceRequest(request: AllianceRequest): boolean {
    const requester = request.requestor();
    if (
      this.player.relation(requester) <
      this.settings.allianceAcceptance.minRelation
    ) {
      return false;
    }
    if (
      this.settings.allianceAcceptance.rejectTraitors &&
      requester.isTraitor()
    ) {
      return false;
    }
    if (
      requester.numTilesOwned() >
      this.player.numTilesOwned() *
        this.settings.allianceAcceptance.sizeAdvantageRatio
    ) {
      return true;
    }
    if (
      requester.alliances().length >=
      this.settings.allianceAcceptance.maxAlliances
    ) {
      return false;
    }
    return true;
  }

  private emoji(player: Player, emoji: number) {
    if (player.type() !== PlayerType.Human) return;
    this.game.addExecution(new EmojiExecution(this.player, player.id(), emoji));
  }

  private setNewEnemy(newEnemy: Player | null) {
    this.enemy = newEnemy;
    this.enemyUpdated = this.game.ticks();
  }

  private clearEnemy() {
    this.enemy = null;
    this.enemyUpdated = this.game.ticks();
  }

  forgetOldEnemies() {
    if (this.enemy === null) return;
    if (
      this.game.ticks() - this.enemyUpdated >
      this.settings.enemyMemoryTicks
    ) {
      this.clearEnemy();
    }
  }

  private hasSufficientTroops(): boolean {
    const maxTroops = this.game.config().maxTroops(this.player);
    const ratio = this.player.troops() / maxTroops;
    return ratio >= this.triggerRatio;
  }

  private checkIncomingAttacks() {
    const incomingAttacks = this.player.incomingAttacks();
    let largestAttack = 0;
    let largestAttacker: Player | undefined;
    for (const attack of incomingAttacks) {
      if (attack.troops() <= largestAttack) continue;
      largestAttack = attack.troops();
      largestAttacker = attack.attacker();
    }
    if (largestAttacker !== undefined) {
      this.setNewEnemy(largestAttacker);
    }
  }

  getNeighborTraitorToAttack(): Player | null {
    const traitors = this.player
      .neighbors()
      .filter((n): n is Player => n.isPlayer() && n.isTraitor());
    if (traitors.length === 0) {
      return null;
    }
    return this.random.randElement(traitors);
  }

  assistAllies() {
    outer: for (const ally of this.player.allies()) {
      if (ally.targets().length === 0) continue;
      if (this.player.relation(ally) < this.settings.assist.minRelation) {
        continue;
      }
      for (const target of ally.targets()) {
        if (target === this.player) {
          continue;
        }
        if (this.player.isAlliedWith(target)) {
          continue;
        }
        this.player.updateRelation(ally, this.settings.assist.relationPenalty);
        this.setNewEnemy(target);
        this.emoji(ally, this.assistAcceptEmoji);
        break outer;
      }
    }
  }

  selectEnemy(): Player | null {
    if (this.enemy === null) {
      if (!this.hasSufficientTroops()) return null;

      const bots = this.player
        .neighbors()
        .filter(
          (n): n is Player => n.isPlayer() && n.type() === PlayerType.Bot,
        );
      if (bots.length > 0) {
        const density = (p: Player) => p.troops() / p.numTilesOwned();
        let lowestDensityBot: Player | undefined;
        let lowestDensity = Infinity;

        for (const bot of bots) {
          const currentDensity = density(bot);
          if (currentDensity < lowestDensity) {
            lowestDensity = currentDensity;
            lowestDensityBot = bot;
          }
        }

        if (lowestDensityBot !== undefined) {
          this.setNewEnemy(lowestDensityBot);
        }
      }

      if (this.enemy === null) {
        this.checkIncomingAttacks();
      }

      if (this.enemy === null) {
        const mostHated = this.player.allRelationsSorted()[0];
        if (
          mostHated !== undefined &&
          mostHated.relation === Relation.Hostile
        ) {
          this.setNewEnemy(mostHated.player);
        }
      }
    }

    return this.enemySanityCheck();
  }

  selectRandomEnemy(): Player | TerraNullius | null {
    if (this.enemy === null) {
      if (!this.hasSufficientTroops()) return null;

      const neighbors = this.player.neighbors();
      for (const neighbor of this.random.shuffleArray(neighbors)) {
        if (!neighbor.isPlayer()) continue;
        if (this.player.isFriendly(neighbor)) continue;
        if (
          neighbor.type() === PlayerType.FakeHuman &&
          this.random.chance(this.settings.skipFakeHumanNeighborOdds)
        ) {
          continue;
        }
        this.setNewEnemy(neighbor);
        break;
      }

      if (this.enemy === null) {
        this.checkIncomingAttacks();
      }

      if (this.enemy === null) {
        const toAttack = this.getNeighborTraitorToAttack();
        if (
          toAttack !== null &&
          !this.player.isFriendly(toAttack) &&
          this.random.chance(this.settings.traitorAttackOdds)
        ) {
          this.setNewEnemy(toAttack);
        }
      }
    }

    return this.enemySanityCheck();
  }

  private enemySanityCheck(): Player | null {
    if (this.enemy && this.player.isFriendly(this.enemy)) {
      this.clearEnemy();
    }
    return this.enemy;
  }

  sendAttack(target: Player | TerraNullius) {
    if (target.isPlayer() && this.player.isOnSameTeam(target)) return;
    if (target.isPlayer() && this.player.isFriendly(target)) return;

    const maxTroops = this.game.config().maxTroops(this.player);
    const reserveRatio = target.isPlayer()
      ? this.reserveRatio
      : this.expandRatio;
    const targetTroops = maxTroops * reserveRatio;
    const troops = this.player.troops() - targetTroops;
    if (troops < 1) return;
    this.game.addExecution(
      new AttackExecution(
        troops,
        this.player,
        target.isPlayer() ? target.id() : this.game.terraNullius().id(),
      ),
    );
  }
}
