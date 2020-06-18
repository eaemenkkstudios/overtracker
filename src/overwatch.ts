import oversmash, { PlayerStats } from 'oversmash';
import heroes from './heroes.json';
import Player, { PlayerProps, ScoreSchema } from './models/Player';
import { HashMap } from './utils/Utils';

export enum Slope {
  DECREASING = 'decreasing',
  TIED = 'tied',
  INCREASING = 'increasing'
}

export enum Sources {
  MONGO = 'MONGO',
  OVERSMASH = 'OVERSMASH',
}

export enum Roles {
  DAMAGE = 'damage',
  SUPPORT = 'support',
  TANK = 'tank',
}

export interface CustomType {
  type: string;
}

export interface Obj {
  type: 'Obj';
  [key: string]: Obj | string | number | boolean;
}

interface PlayerNode {
  stats: PlayerStats;
  time: number;
  views: number;
}

class Overwatch {
  public playerCache: HashMap<PlayerNode> = {};

  public maxBufferLength: string;

  constructor() {
    this.maxBufferLength = process.env.MAX_BUFFER_LENGTH || '';
  }

  public validateRole(role: string): boolean {
    let roleIsValid = false;
    Object.values(Roles).forEach((r) => {
      if (!roleIsValid) roleIsValid = r.toString() === role;
    });
    return roleIsValid;
  }

  public makeNormalizedName(str: string): string {
    return str.toLowerCase() // Sets string to lower case
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Removes diacritics
      .replace(/[^a-zA-Z0-9\- ]/g, '') // Removes special characters
      .replace(' ', '-'); // Replaces space with hyphen
  }

  public clearObjTypes = (
    obj: Obj,
  ): void => {
    Object.keys(obj).forEach((key) => {
      if (((obj as Obj)[key] as Obj).type === 'Obj') return this.clearObjTypes(((obj as Obj)[key] as Obj));
      if (key === 'type') return delete (obj as Obj)[key];
    });
  }

  // Transforms a data request into information about the player.
  // Example: player.SR.SUPPORT.CURRENT -> 2468
  public stringToInfo = (
    obj: Obj | string,
    time: number,
    oversmashStats: PlayerStats,
    mongoStats?: PlayerProps,
  ): void => {
    if (time && time < 1) return;
    Object.keys(obj).forEach((key) => {
      if (((obj as Obj)[key] as Obj).type === 'Obj') {
        this.stringToInfo((obj as Obj)[key] as Obj, time, oversmashStats, mongoStats);
      } else if (typeof (obj as Obj)[key] === 'string') {
        if (key === 'type') return;
        const args = ((obj as Obj)[key] as string).split('_');
        switch (args[args.length - 1]) {
          case Sources.MONGO:
            if (!mongoStats) break;
            switch (args[0]) {
              case 'endorsement':
                switch (args[1]) {
                  case 'previous':
                    if (!mongoStats.scores
                    || mongoStats.scores.length < time) break;
                    (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                      .endorsement;
                    break;
                  case 'current':
                    if (time > 1 && (!mongoStats.scores
                    || !(mongoStats.scores.length < time - 1))) break;
                    (obj as Obj)[key] = time === 1 ? mongoStats.current?.endorsement || 1
                      : mongoStats.scores[mongoStats.scores.length - time + 1].endorsement;
                    break;
                  default:
                    break;
                }
                break;
              case 'sr':
                switch (args[1]) {
                  case 'highest':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = Math.max(mongoStats.scores[
                          mongoStats.scores.length - time].rank.damage,
                        mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support,
                        mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank);
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? Math.max(
                          mongoStats.current?.rank.damage || 0,
                          mongoStats.current?.rank.support || 0,
                          mongoStats.current?.rank.tank || 0,
                        )
                          : Math.max(mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank);
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          (obj as Obj)[key] = Slope.TIED;
                          break;
                        }
                        switch (time === 1 ? Math.max(
                          mongoStats.current?.rank.damage || 0,
                          mongoStats.current?.rank.support || 0,
                          mongoStats.current?.rank.tank || 0,
                        )
                          : Math.max(mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank)) {
                          case (time === 1 ? mongoStats.current?.rank.support
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.support):
                            (obj as Obj)[key] = time === 1 ? (mongoStats.current?.rank.support || 0)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.support)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.support;
                            if ((obj as Obj)[key] > 0) {
                              (obj as Obj)[key] = Slope.INCREASING;
                            } else if ((obj as Obj)[key] < 0) {
                              (obj as Obj)[key] = Slope.DECREASING;
                            } else {
                              (obj as Obj)[key] = Slope.TIED;
                            }
                            break;
                          case (time === 1 ? mongoStats.current?.rank.damage
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.damage):
                            (obj as Obj)[key] = time === 1 ? (mongoStats.current?.rank.damage || 0)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.damage)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.damage;
                            if ((obj as Obj)[key] > 0) {
                              (obj as Obj)[key] = Slope.INCREASING;
                            } else if ((obj as Obj)[key] < 0) {
                              (obj as Obj)[key] = Slope.DECREASING;
                            } else {
                              (obj as Obj)[key] = Slope.TIED;
                            }
                            break;
                          case (time === 1 ? mongoStats.current?.rank.tank
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.tank):
                            (obj as Obj)[key] = time === 1 ? (mongoStats.current?.rank.tank || 0)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.tank)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.tank;
                            if ((obj as Obj)[key] > 0) {
                              (obj as Obj)[key] = Slope.INCREASING;
                            } else if ((obj as Obj)[key] < 0) {
                              (obj as Obj)[key] = Slope.DECREASING;
                            } else {
                              (obj as Obj)[key] = Slope.TIED;
                            }
                            break;
                          default:
                            break;
                        }
                        break;
                      default:
                        break;
                    }
                    break;
                  case 'main':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank[heroes[(time === 1 ? mongoStats.current?.main
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .main) as keyof typeof heroes] as keyof typeof ScoreSchema.rank];
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? mongoStats.current?.rank[heroes[
                            mongoStats.current?.main as keyof typeof heroes
                        ] as keyof typeof ScoreSchema.rank] || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank[heroes[mongoStats.scores[mongoStats.scores.length - time + 1]
                              .main as keyof typeof heroes] as keyof typeof ScoreSchema.rank];
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          (obj as Obj)[key] = Slope.TIED;
                          break;
                        }
                        (obj as Obj)[key] = time === 1 ? (mongoStats.current?.rank[heroes[
                            mongoStats.current?.main as keyof typeof heroes
                        ] as keyof typeof ScoreSchema.rank] || 0
                        - mongoStats.scores[mongoStats.scores.length - time]
                          .rank[heroes[
                            mongoStats.current?.main as keyof typeof heroes
                          ] as keyof typeof ScoreSchema.rank])
                          : (mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank[heroes[mongoStats.scores[mongoStats.scores.length - time + 1]
                              .main as keyof typeof heroes] as keyof typeof ScoreSchema.rank]
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank[heroes[mongoStats
                                .scores[mongoStats.scores.length - time + 1]
                                .main as keyof typeof heroes] as keyof typeof ScoreSchema.rank]);
                        if ((obj as Obj)[key] > 0) {
                          (obj as Obj)[key] = Slope.INCREASING;
                        } else if ((obj as Obj)[key] < 0) {
                          (obj as Obj)[key] = Slope.DECREASING;
                        } else {
                          (obj as Obj)[key] = Slope.TIED;
                        }
                        break;
                      default:
                        break;
                    }
                    break;
                  case Roles.SUPPORT:
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? mongoStats.current?.rank.support || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          (obj as Obj)[key] = Slope.TIED;
                          break;
                        }
                        (obj as Obj)[key] = (time === 1 ? mongoStats.current?.rank.support || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support;
                        if ((obj as Obj)[key] > 0) {
                          (obj as Obj)[key] = Slope.INCREASING;
                        } else if ((obj as Obj)[key] < 0) {
                          (obj as Obj)[key] = Slope.DECREASING;
                        } else {
                          (obj as Obj)[key] = Slope.TIED;
                        }
                        break;
                      default:
                        break;
                    }
                    break;
                  case Roles.DAMAGE:
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.damage;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? mongoStats.current?.rank.damage || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          (obj as Obj)[key] = Slope.TIED;
                          break;
                        }
                        (obj as Obj)[key] = (time === 1 ? mongoStats.current?.rank.damage || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.damage;
                        if ((obj as Obj)[key] > 0) {
                          (obj as Obj)[key] = Slope.INCREASING;
                        } else if ((obj as Obj)[key] < 0) {
                          (obj as Obj)[key] = Slope.DECREASING;
                        } else {
                          (obj as Obj)[key] = Slope.TIED;
                        }
                        break;
                      default:
                        break;
                    }
                    break;
                  case Roles.TANK:
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? mongoStats.current?.rank.tank || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          (obj as Obj)[key] = Slope.TIED;
                          break;
                        }
                        (obj as Obj)[key] = (time === 1 ? mongoStats.current?.rank.tank || 0
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank;
                        if ((obj as Obj)[key] > 0) {
                          (obj as Obj)[key] = Slope.INCREASING;
                        } else if ((obj as Obj)[key] < 0) {
                          (obj as Obj)[key] = Slope.DECREASING;
                        } else {
                          (obj as Obj)[key] = Slope.TIED;
                        }
                        break;
                      default:
                        break;
                    }
                    break;
                  default:
                    break;
                }
                break;
              case 'matches':
                switch (args[1]) {
                  case 'played':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .games?.played || 0;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = mongoStats.current?.games?.played || 0;
                        break;
                      default:
                        break;
                    }
                    break;
                  case 'won':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .games?.won || 0;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = mongoStats.current?.games?.won || 0;
                        break;
                      default:
                        break;
                    }
                    break;
                  default:
                    break;
                }
                break;
              case 'winrate':
                switch (args[1]) {
                  case 'previous':
                    if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                    (obj as Obj)[key] = `${(((mongoStats.scores[mongoStats.scores.length - time]
                      .games?.won || 0)
              / (mongoStats.scores[mongoStats.scores.length - time]
                .games?.played || 1)) * 100).toFixed(2)}%`;
                    break;
                  case 'current':
                    if (time === 1 ? !mongoStats.current
                      : !mongoStats.scores[mongoStats.scores.length - time + 1]) break;
                    (obj as Obj)[key] = `${(((time === 1 ? mongoStats.current?.games?.won || 0
                      : mongoStats.scores[mongoStats.scores.length - time + 1].games?.won || 0)
              / (mongoStats.current?.games?.played || 1)) * 100).toFixed(2)}%`;
                    break;
                  case 'slope':
                    if (!mongoStats.scores
                    || mongoStats.scores.length < time) {
                      (obj as Obj)[key] = Slope.TIED;
                      break;
                    }
                    (obj as Obj)[key] = (time === 1 ? ((mongoStats.current?.games?.won || 0)
              / (mongoStats.current?.games?.played || 1))
                      : ((mongoStats.scores[mongoStats.scores.length - time + 1]
                        .games?.won || 0)
            / (mongoStats.scores[mongoStats.scores.length - time + 1]
              .games?.played || 1)))
                - ((mongoStats.scores[mongoStats.scores.length - time]
                  .games?.won || 0)
            / (mongoStats.scores[mongoStats.scores.length - time]
              .games?.played || 1));
                    if ((obj as Obj)[key] > 0) {
                      (obj as Obj)[key] = Slope.INCREASING;
                    } else if ((obj as Obj)[key] < 0) {
                      (obj as Obj)[key] = Slope.DECREASING;
                    } else {
                      (obj as Obj)[key] = Slope.TIED;
                    }
                    break;
                  default:
                    break;
                }
                break;
              case 'main':
                switch (args[1]) {
                  case 'hero':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .main || '';
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? mongoStats.current?.main || ''
                          : mongoStats.scores[mongoStats.scores.length - time + 1].main;
                        break;
                      default:
                        break;
                    }
                    break;
                  case 'role':
                    switch (args[2]) {
                      case 'previous':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) break;
                        (obj as Obj)[key] = heroes[
                          mongoStats.scores[mongoStats.scores.length - time]
                            .main as keyof typeof heroes] || '';
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !(mongoStats.scores.length < time - 1))) break;
                        (obj as Obj)[key] = time === 1 ? heroes[mongoStats.current?.main as keyof typeof heroes] || ''
                          : heroes[mongoStats.scores[
                            mongoStats.scores.length - time + 1
                          ].main as keyof typeof heroes];
                        break;
                      default:
                        break;
                    }
                    break;
                  default:
                    break;
                }
                break;
              default:
                break;
            }
            break;
          default:
            break;
          case Sources.OVERSMASH:
            try {
              if (!oversmashStats
                || JSON.stringify(oversmashStats.stats.competitive) === JSON.stringify({})) break;
              switch (args[0]) {
                case 'endorsement':
                  (obj as Obj)[key] = oversmashStats.stats.endorsement_level;
                  break;
                case 'sr':
                  switch (args[1]) {
                    case 'highest':
                      (obj as Obj)[key] = Math.max(oversmashStats.stats.competitive_rank.damage
                        || 0,
                      oversmashStats.stats.competitive_rank.support || 0,
                      oversmashStats.stats.competitive_rank.tank || 0);
                      break;
                    case Roles.SUPPORT:
                      (obj as Obj)[key] = oversmashStats.stats.competitive_rank.support || 0;
                      break;
                    case Roles.DAMAGE:
                      (obj as Obj)[key] = oversmashStats.stats.competitive_rank.damage || 0;
                      break;
                    case Roles.TANK:
                      (obj as Obj)[key] = oversmashStats.stats.competitive_rank.tank || 0;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'matches':
                  switch (args[1]) {
                    case 'played':
                      (obj as Obj)[key] = oversmashStats.stats.competitive.all.game?.games_played
                      || 0;
                      break;
                    case 'won':
                      (obj as Obj)[key] = oversmashStats.stats.competitive.all.game?.games_won
                      || 0;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'winrate':
                  (obj as Obj)[key] = (`${(((oversmashStats.stats.competitive.all.game?.games_won || 0)
              / (oversmashStats.stats.competitive.all.game?.games_played || 1)) * 100).toFixed(2)}%`);
                  break;
                case 'main':
                  switch (args[1]) {
                    case 'hero':
                      (obj as Obj)[key] = Object.keys(oversmashStats.stats.competitive)
                        .reduce((previousValue, currentValue) => {
                          if (previousValue === '' || previousValue === 'all') return currentValue;
                          let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                            .game?.time_played;
                          let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                            .game?.time_played;
                          if (typeof currentTimePlayed === 'undefined') return previousValue;
                          if (previousTimePlayed?.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                          if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                          return previousTimePlayed && previousTimePlayed
                          > currentTimePlayed ? previousValue : currentValue;
                        }, '');
                      break;
                    case 'role':
                      (obj as Obj)[key] = heroes[Object.keys(oversmashStats.stats.competitive)
                        .reduce((previousValue, currentValue) => {
                          if (previousValue === '' || previousValue === 'all') return currentValue;
                          let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                            .game?.time_played;
                          let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                            .game?.time_played;
                          if (typeof currentTimePlayed === 'undefined') return previousValue;
                          if (previousTimePlayed?.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                          if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                          return previousTimePlayed && previousTimePlayed > currentTimePlayed
                            ? previousValue
                            : currentValue;
                        }, '') as keyof typeof heroes];
                      break;
                    case 'time':
                      (obj as Obj)[key] = oversmashStats.stats
                        .competitive[Object.keys(oversmashStats.stats.competitive)
                          .reduce((previousValue, currentValue) => {
                            if (previousValue === '' || previousValue === 'all') return currentValue;
                            let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                              .game?.time_played;
                            let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                              .game?.time_played;
                            if (typeof currentTimePlayed === 'undefined') return previousValue;
                            if (previousTimePlayed?.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                            if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                            return previousTimePlayed && previousTimePlayed > currentTimePlayed
                              ? previousValue
                              : currentValue;
                          }, '')].game?.time_played as string;
                      if (((obj as Obj)[key] as string).length === 5) (obj as Obj)[key] = `00:${(obj as Obj)[key]}`;
                      break;
                    default:
                      break;
                  }
                  break;
                default:
                  break;
              }
            } catch (e) {
              console.log(oversmashStats.stats.competitive);
            }
            break;
        }
      }
    });
  }

  public readonly player = {
    ENDORSEMENT: {
      PREVIOUS: `endorsement_previous_${Sources.MONGO}`,
      CURRENT: `endorsement_current_${Sources.MONGO}`,
      UPDATED: `endorsement_${Sources.OVERSMASH}`,
    },
    SR: {
      MAIN: {
        PREVIOUS: `sr_main_previous_${Sources.MONGO}`,
        CURRENT: `sr_main_current_${Sources.MONGO}`,
        SLOPE: `sr_main_slope_${Sources.MONGO}`,
        UPDATED: `sr_main_${Sources.OVERSMASH}`,
      },
      HIGHEST: {
        PREVIOUS: `sr_highest_previous_${Sources.MONGO}`,
        CURRENT: `sr_highest_current_${Sources.MONGO}`,
        SLOPE: `sr_highest_slope_${Sources.MONGO}`,
        UPDATED: `sr_highest_${Sources.OVERSMASH}`,
      },
      DAMAGE: {
        PREVIOUS: `sr_${Roles.DAMAGE}_previous_${Sources.MONGO}`,
        CURRENT: `sr_${Roles.DAMAGE}_current_${Sources.MONGO}`,
        SLOPE: `sr_${Roles.DAMAGE}_slope_${Sources.MONGO}`,
        UPDATED: `sr_${Roles.DAMAGE}_${Sources.OVERSMASH}`,
      },
      SUPPORT: {
        PREVIOUS: `sr_${Roles.SUPPORT}_previous_${Sources.MONGO}`,
        CURRENT: `sr_${Roles.SUPPORT}_current_${Sources.MONGO}`,
        SLOPE: `sr_${Roles.SUPPORT}_slope_${Sources.MONGO}`,
        UPDATED: `sr_${Roles.SUPPORT}_${Sources.OVERSMASH}`,
      },
      TANK: {
        PREVIOUS: `sr_${Roles.TANK}_previous_${Sources.MONGO}`,
        CURRENT: `sr_${Roles.TANK}_current_${Sources.MONGO}`,
        SLOPE: `sr_${Roles.TANK}_slope_${Sources.MONGO}`,
        UPDATED: `sr_${Roles.TANK}_${Sources.OVERSMASH}`,
      },
    },
    MATCHES: {
      PLAYED: {
        PREVIOUS: `matches_played_previous_${Sources.MONGO}`,
        CURRENT: `matches_played_current_${Sources.MONGO}`,
        UPDATED: `matches_played_${Sources.OVERSMASH}`,
      },
      WON: {
        PREVIOUS: `matches_won_previous_${Sources.MONGO}`,
        CURRENT: `matches_won_current_${Sources.MONGO}`,
        UPDATED: `matches_won_${Sources.OVERSMASH}`,
      },
    },
    WINRATE: {
      PREVIOUS: `winrate_previous_${Sources.MONGO}`,
      CURRENT: `winrate_current_${Sources.MONGO}`,
      SLOPE: `winrate_slope_${Sources.MONGO}`,
      UPDATED: `winrate_${Sources.OVERSMASH}`,
    },
    MAIN: {
      HERO: {
        PREVIOUS: `main_hero_previous_${Sources.MONGO}`,
        CURRENT: `main_hero_current_${Sources.MONGO}`,
        UPDATED: `main_hero_${Sources.OVERSMASH}`,
      },
      ROLE: {
        PREVIOUS: `main_role_previous_${Sources.MONGO}`,
        CURRENT: `main_role_current_${Sources.MONGO}`,
        UPDATED: `main_role_${Sources.OVERSMASH}`,
      },
      TIME: {
        UPDATED: `main_time_${Sources.OVERSMASH}`,
      },
    },
  };

  public readonly friendlyPlatforms = {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
  };

  /**
   * Gets the image URL of the player's rank
   * @param rank Player's SR
   * @returns Image URL
   */
  public getRankImageURL(rank: number): string {
    const baseUrl = 'https://d1u1mce87gyfbn.cloudfront.net/game/rank-icons/rank-';
    const suffix = 'Tier.png';
    let tier = '';
    if (rank < 1) return 'Unranked';
    if (rank < 1500) {
      tier = 'Bronze';
    } else if (rank < 2000) {
      tier = 'Silver';
    } else if (rank < 2500) {
      tier = 'Gold';
    } else if (rank < 3000) {
      tier = 'Platinum';
    } else if (rank < 3500) {
      tier = 'Diamond';
    } else if (rank < 4000) {
      tier = 'Master';
    } else {
      tier = 'Grandmaster';
    }
    return baseUrl + tier + suffix;
  }

  public async getPlayerInfo(
    tag: string,
    platform: string,
    forceUpdate: boolean,
  ): Promise<PlayerStats> {
    let playerStats: PlayerStats;
    if (this.playerCache[`${tag}${platform}`]) {
      const now = new Date().getDate();
      if (now - this.playerCache[`${tag}${platform}`].time >= (+(process.env.MINUTES_TO_UPDATE_PLAYER_ON_CACHE || 30) * 1000 * 60) || forceUpdate === true) {
        playerStats = await oversmash().playerStats(tag, platform);
        this.playerCache[`${tag}${platform}`].stats = playerStats;
        this.playerCache[`${tag}${platform}`].time = now;
      } else playerStats = this.playerCache[`${tag}${platform}`].stats;
      this.playerCache[`${tag}${platform}`].views += 1;
    } else {
      playerStats = await oversmash().playerStats(tag, platform);
      if (Object.keys(this.playerCache).length >= (this.maxBufferLength || 64)) {
        let lessPopular = Object.keys(this.playerCache)[0];
        Object.keys(this.playerCache).forEach((savedPlayer) => {
          if (this.playerCache[savedPlayer].views < this.playerCache[lessPopular].views) {
            lessPopular = savedPlayer;
          }
        });
        delete this.playerCache[lessPopular];
      }
      this.playerCache[`${tag}${platform}`] = {
        stats: playerStats,
        time: new Date().getTime(),
        views: 1,
      };
    }
    return playerStats;
  }

  public fillObject = async (
    obj: Obj,
    tag: string,
    platform: string,
    time: number,
    forceUpdate: boolean,
  ): Promise<boolean> => {
    const playerStats = await this.getPlayerInfo(tag, platform, forceUpdate);
    if (JSON.stringify(playerStats.stats.competitive) === JSON.stringify({})) return false;
    const player = await Player.findOne({ tag, platform });
    if (player) this.stringToInfo(obj, time, playerStats, player);
    else this.stringToInfo(obj, time, playerStats);
    this.clearObjTypes(obj);
    return true;
  }
}

export default new Overwatch();
