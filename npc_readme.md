# NPC Behaviour Guide

This document describes how non-player nations (`PlayerType.FakeHuman`) behave in OpenFrontIO. The implementation lives primarily in `src/core/execution/FakeHumanExecution.ts` with supporting logic in `src/core/execution/utils/BotBehavior.ts`, `src/core/game/Game.ts`, and `src/core/configuration/DefaultConfig.ts`.

## Lifecycle & Scheduling

- NPCs are instantiated from the map manifest (`Nation`) when `GameRunner` determines that `game.config().spawnNPCs()` is true. Each nation provides a spawn cell, strength rating, and display name.
- Every NPC owns a dedicated `FakeHumanExecution` instance that is seeded with `PseudoRandom(simpleHash(nation.playerInfo.id) + simpleHash(gameID))`. Given the same map and game id, their decisions are deterministic.
- During the spawn phase the execution looks for land within +/-25 tiles of the configured spawn cell. It retries up to 50 times, avoiding mountain tiles 50 % of the time, and schedules a `SpawnExecution` when it finds an empty land tile.
- Behaviour updates only run on ticks that satisfy `ticks % attackRate === attackTick`, where `attackRate` is sampled in `[40, 79]` ticks and `attackTick` is a random phase offset. Once out of the spawn phase the executor will skip all other ticks, limiting how often expensive AI logic runs.
- When the backing player dies the executor marks itself inactive so it stops scheduling work.
- On the first active tick (after the player object is available) the executor wires up a `BotBehavior` helper and immediately issues an expansion attack against terra nullius to jump-start growth.

## Resource Model & Difficulty Scaling

- Initial troops (`startManpower`) scale with map-defined nation strength and difficulty: 2 500xstrength on Easy, 5 000x on Medium, 20 000x on Hard, and 50 000x on Impossible. (See `DefaultConfig.startManpower`.)
- NPC troop caps (`maxTroops`) reuse the human formula but multiply the result by 0.5 (Easy), 1 (Medium), 1.5 (Hard), or 2 (Impossible). Bots keep only a third of that, so fake humans enjoy a sizable advantage over standard bots at higher difficulties.
- Troop regeneration (`troopIncreaseRate`) grows sub-linearly with current troops and is nudged by difficulty: 0.9x (Easy), 1x (Medium), 1.1x (Hard), 1.2x (Impossible). Regeneration slows as the garrison approaches the cap.
- Gold income (`goldAdditionRate`) matches human players at a flat 100 gold per tick; bots earn half that.
- Many other balance knobs (nuke radii, defense buffs, etc.) are shared with human players and indirectly influence NPC outcomes.

## Diplomacy & Relations

- Relations are stored as continuous scores in `PlayerImpl`; `Relation.Hostile` is below -50, `Distrustful` below 0, `Neutral` up to 50, and `Friendly` beyond. NPC routines mostly interact with the coarse enum, but the deltas shown below operate on the raw score (clamped to +/-100).
- The executor continuously mirrors embargo state: if another player embargoes the NPC, it applies a -20 relation malus exactly once; when the embargo lifts, it restores that 20 points. Conversely, it automatically embargoes players whose relation falls to Hostile and are not teammates, and cancels the embargo once relations drift back to Neutral.
- Alliance requests are filtered by `shouldAcceptAllianceRequest`: reject if the requester is a traitor, has negative relations, or already maintains three alliances; auto-accept if they own more than triple the NPC's territory; otherwise accept.
- When a human ally asks to extend an alliance close to expiry, NPCs always accept if they currently view the ally as Friendly. If the relation is Neutral they will agree roughly 2/3 of the time (owing to the current `chance(1.5)` implementation);
  they deny if the ally feels Distrustful or worse.
- NPCs send their own alliance requests opportunistically: on each decision cycle there is a 5 % chance to invite a random bordering enemy before considering aggression.
- The betrayal hook is rudimentary-if the NPC decides to attack an allied player it simply breaks the alliance immediately (`maybeConsiderBetrayal`) without deeper evaluation. A TODO in the code calls out the need for strategic checks (relative strength, multi-front wars, etc.).
- Allies under attack may be assisted: `BotBehavior.assistAllies` scans allies' targets and, when friendly enough, sets that enemy as the NPC's current target and responds with a `thumbs-up` emoji. To avoid constant involvement it simultaneously subtracts 20 relation points from the ally, nudging the relationship back toward Neutral.
- Relation decay elsewhere in the engine slowly drifts scores back toward zero, so long-lived embargoes or betrayals are necessary to keep another nation marked hostile.

## Combat Decision Pipeline

On every eligible tick `FakeHumanExecution.maybeAttack` orchestrates the following steps:

- Build a list of hostile border tiles by looking at neighboring land that is owned by someone else. If none are found, there is still a 10 % chance to launch a naval raid via `sendBoatRandomly`, which moves 20 % of the current troops toward a randomly selected coastal target within ~150 tiles.
- If border tiles exist, there is still a 5 % pre-check chance to dispatch a random boat raid before ground logic executes.
- If any bordering tile belongs to terra nullius (no player owner), the NPC immediately orders an expansion attack against it.
- Otherwise, it groups bordering owners, filters to actual players, and sorts them by troop count. Target selection prefers the weakest neighbor 50 % of the time; the other half picks a random hostile neighbor. Before committing, `shouldAttack` checks:
  - Ignore teammates entirely.
  - If currently allied, it invokes `maybeConsiderBetrayal`, which (presently) just breaks the alliance and gives the green light.
  - Friendly humans on Easy or Medium difficulty trigger a strong disincentive (only a 0.5 % chance to proceed); on the same difficulties distrustful or hostile humans are attacked 25 % of the time. On Hard and Impossible the difficulty gate is removed.
- If the direct attack is skipped, the executor falls back to longer-term targeting via `BotBehavior`:
  - `forgetOldEnemies` clears stale targets after 100 ticks with no updates.
  - `assistAllies` may promote an ally's current enemy to the NPC's focus and send supportive emojis.
  - `selectEnemy` looks for new enemies once the garrison reaches the sampled trigger ratio (60-89 % of `maxTroops`). Priority order is: the bordering bot with the lowest troop density, the largest incoming attacker, then the most hostile relation.
- When an enemy is locked in, `sendAttack` determines a troop budget by leaving either `reserveRatio` (30-59 %) of `maxTroops` behind for player opponents or `expandRatio` (15-24 %) for terra nullius. The difference is sent through an `AttackExecution`. If insufficient troops are available no attack is queued.
- If the chosen enemy does not share a land border, `maybeSendBoatAttack` looks for the closest pair of shoreline tiles between the two nations and moves 20 % of current troops by transport ship.
- Incoming attacks influence targeting through `checkIncomingAttacks`, which promotes the strongest aggressor to the top of the enemy list so the NPC retaliates.

### Naval Behaviour

- `sendBoatRandomly` and `maybeSendBoatAttack` both pick launch tiles along the NPC's coastline and sample potential destinations within a search radius (150 tiles for random raids). Targets owned by neutral parties are fair game, but friendly owners are avoided.
- `maybeSpawnWarship` runs after structure placement. With a 2 % chance each evaluation tick, if the NPC owns at least one port, has no warships, and can afford the cost, it builds a single `Warship` near a random port (search radius 250).

### Nuclear Strikes

- Nukes require at least one owned missile silo and enough gold for an `AtomBomb`. NPCs will not nuke bots or teammates.
- Candidate impact points are the union of all enemy structure tiles (cities, defense posts, silos, ports, SAM launchers) plus ten random tiles from the enemy territory.
- The executor rejects targets whose 15-tile Manhattan neighbourhood includes non-target owners, ensuring the strike hits deep territory rather than borders.
- Scoring favours high-value structures (cities 25 000, missile silos 50 000, ports 10 000, defense posts 5 000). Each nearby SAM launcher (within 50 tiles Euclidean) applies a -50 000 penalty, distance to the closest friendly silo subtracts `distance x 30`, and any tile near a recent strike (tracked for 500 ticks) receives a heavy -1 000 000 penalty. The highest-scoring tile is passed to `NukeExecution`.

### Psychological Warfare

- NPCs keep a per-opponent cooldown (300 ticks) before sending another heckling emoji. When the cooldown expires and the enemy is human, the executor sends either `clown-face` or `angry-face` via `EmojiExecution`.

## Infrastructure & Economy

- On each behaviour pass, the NPC tries to schedule exactly one build action in priority order: `City` -> `Port` -> `Warship` -> `Factory` -> `MissileSilo`. Once a build succeeds the rest of the list is skipped until the next evaluation tick.
- `maybeSpawnStructure` inflates perceived costs by `(owned + 1)` (capped at 5x) before checking affordability, discouraging spam of the same building type.
- Tile evaluation relies on `structureSpawnTileValue`:
  - Ports favour distance from existing ports so they spread along the coast.
  - Cities, factories, and missile silos favour higher terrain magnitude, greater Manhattan distance from the border (up to the atom bomb outer radius, currently 30 tiles), and separation from same-type structures.
- Candidate tiles are sampled randomly (up to 50 per evaluation) to curb the cost of scanning large empires while still balancing placement quality.

## Randomisation Summary

| Behaviour               | Sampling Range / Chance                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Attack interval         | `attackRate in [40, 79]` ticks; executed only when `ticks % attackRate == attackTick` |
| Trigger ratio           | `triggerRatio in [0.60, 0.89]` of max troops before considering new enemies           |
| Reserve ratio           | `reserveRatio in [0.30, 0.59]` of max troops kept in reserve vs players               |
| Expansion reserve       | `expandRatio in [0.15, 0.24]` of max troops kept when expanding                       |
| Naval raid when idle    | 10 % chance each evaluation tick                                                      |
| Naval raid when engaged | 5 % chance before processing borders                                                  |
| Alliance request        | 5 % chance per evaluation cycle to contact a random neighbor                          |
| Assist allied attack    | Guaranteed when conditions met, but relation drops by 20 to throttle frequency        |
| Warship construction    | 2 % chance per evaluation provided prerequisites hold                                 |
| Emoji taunt             | One taunt per human opponent every 300 ticks                                          |
| Nuke reuse cooldown     | Avoids tiles within radius of last strike for 500 ticks                               |

All randomness is deterministic per game because the pseudo-random generator is seeded from the game id and NPC id.

## Known Limitations / TODOs

- Alliance betrayal lacks strategic safeguards; NPCs will break pacts instantly when `shouldAttack` selects an ally. The comment in `maybeConsiderBetrayal` outlines desired future checks (relative strength, multi-front wars, strategic value, etc.).
- Naval logistics are rudimentary: NPCs send fixed-size transports (20 % of current troops) and do not coordinate fleets or support multiple warships.
- Structure planning ignores rail ranges and other economic subtleties; ports and factories may still cluster if random sampling misses better options on large empires.
- Assist behaviour currently penalises allied relations, which can unintentionally discourage long-term cooperation.

## File Reference

- `src/core/execution/FakeHumanExecution.ts` - main state machine for NPC nations.
- `src/core/execution/utils/BotBehavior.ts` - shared targeting, diplomatic responses, and attack budgeting.
- `src/core/configuration/DefaultConfig.ts` - tunable balance knobs (difficulty scaling, nuke radii, etc.).
- `src/core/game/PlayerImpl.ts` - relation bookkeeping and alliance mechanics used by the NPC routines.

Use this guide as a starting point when tuning nation behaviour or introducing new AI hooks.
