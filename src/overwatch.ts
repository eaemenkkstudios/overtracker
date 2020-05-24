import oversmash from 'oversmash';
import heroes from './heroes.json';

export enum Slope {
  DECREASING = 'decreasing',
  TIED = 'tied',
  INCREASING = 'increasing'
}

export enum Sources {
  MONGO,
  OVERSMASH
}

export enum Roles {
  DAMAGE = 'damage',
  SUPPORT = 'support',
  TANK = 'tank',
}

class Overwatch {
  public playerCache = {};

  // Transforma uma request de informação na informação requisitada.
  // Exemplo: player.SR.SUPPORT.CURRENT -> 2468
  public stringToInfo(obj, oversmashStats, mongoStats, time) {
    if (time < 1) return;
    Object.keys(obj).forEach((key) => {
      if (isObject(obj[key])) {
        stringToInfo(obj[key], oversmashStats, mongoStats, time);
      } else if (typeof obj[key] === 'string') {
        const args = (String)(obj[key]).split('_');
        switch (args[args.length - 1]) {
          case Sources.MONGO:
            switch (args[0]) {
              case 'endorsement':
                switch (args[1]) {
                  case 'previous':
                    if (!mongoStats.scores
                    || mongoStats.scores.length < time) break;
                    obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                      .endorsement;
                    break;
                  case 'current':
                    if (time > 1 && (!mongoStats.scores
                    || !mongoStats.scores.length < time - 1)) break;
                    obj[key] = time === 1 ? mongoStats.current.endorsement
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
                        obj[key] = Math.max(mongoStats.scores[mongoStats.scores.length - time]
                          .rank.damage,
                        mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support,
                        mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank);
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? Math.max(mongoStats.current
                          .rank.damage,
                        mongoStats.current
                          .rank.support,
                        mongoStats.current
                          .rank.tank)
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
                          obj[key] = Slope.TIED;
                          break;
                        }
                        switch (time === 1 ? Math.max(mongoStats.current
                          .rank.damage,
                        mongoStats.current
                          .rank.support,
                        mongoStats.current
                          .rank.tank)
                          : Math.max(mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support,
                          mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank)) {
                          case (time === 1 ? mongoStats.current
                            .rank.support
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.support):
                            obj[key] = time === 1 ? (mongoStats.current
                              .rank.support)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.support)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.support;
                            if (obj[key] > 0) {
                              obj[key] = Slope.INCREASING;
                            } else if (obj[key] < 0) {
                              obj[key] = Slope.DECREASING;
                            } else {
                              obj[key] = Slope.TIED;
                            }
                            break;
                          case (time === 1 ? mongoStats.current
                            .rank.damage
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.damage):
                            obj[key] = time === 1 ? (mongoStats.current
                              .rank.damage)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.damage)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.damage;
                            if (obj[key] > 0) {
                              obj[key] = Slope.INCREASING;
                            } else if (obj[key] < 0) {
                              obj[key] = Slope.DECREASING;
                            } else {
                              obj[key] = Slope.TIED;
                            }
                            break;
                          case (time === 1 ? mongoStats.current
                            .rank.tank
                            : mongoStats.scores[mongoStats.scores.length - time + 1]
                              .rank.tank):
                            obj[key] = time === 1 ? (mongoStats.current
                              .rank.tank)
                              : (mongoStats.scores[mongoStats.scores.length - time + 1]
                                .rank.tank)
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank.tank;
                            if (obj[key] > 0) {
                              obj[key] = Slope.INCREASING;
                            } else if (obj[key] < 0) {
                              obj[key] = Slope.DECREASING;
                            } else {
                              obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank[heroes[time === 1 ? mongoStats.current.main
                            : mongoStats.scores[mongoStats.scores.length - time + 1].main]];
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? mongoStats.current
                          .rank[heroes[mongoStats.current.main]]
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank[heroes[mongoStats.scores[mongoStats.scores.length - time + 1]
                              .main]];
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          obj[key] = Slope.TIED;
                          break;
                        }
                        obj[key] = time === 1 ? (mongoStats.current
                          .rank[heroes[mongoStats.current.main]]
                        - mongoStats.scores[mongoStats.scores.length - time]
                          .rank[heroes[mongoStats.current.main]])
                          : (mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank[heroes[mongoStats.scores[mongoStats.scores.length - time + 1]
                              .main]]
                            - mongoStats.scores[mongoStats.scores.length - time]
                              .rank[heroes[mongoStats
                                .scores[mongoStats.scores.length - time + 1]
                                .main]]);
                        if (obj[key] > 0) {
                          obj[key] = Slope.INCREASING;
                        } else if (obj[key] < 0) {
                          obj[key] = Slope.DECREASING;
                        } else {
                          obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? mongoStats.current
                          .rank.support
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          obj[key] = Slope.TIED;
                          break;
                        }
                        obj[key] = (time === 1 ? mongoStats.current
                          .rank.support
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.support) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.support;
                        if (obj[key] > 0) {
                          obj[key] = Slope.INCREASING;
                        } else if (obj[key] < 0) {
                          obj[key] = Slope.DECREASING;
                        } else {
                          obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.damage;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? mongoStats.current
                          .rank.damage
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          obj[key] = Slope.TIED;
                          break;
                        }
                        obj[key] = (time === 1 ? mongoStats.current
                          .rank.damage
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.damage) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.damage;
                        if (obj[key] > 0) {
                          obj[key] = Slope.INCREASING;
                        } else if (obj[key] < 0) {
                          obj[key] = Slope.DECREASING;
                        } else {
                          obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? mongoStats.current
                          .rank.tank
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank;
                        break;
                      case 'slope':
                        if (!mongoStats.scores
                        || mongoStats.scores.length < time) {
                          obj[key] = Slope.TIED;
                          break;
                        }
                        obj[key] = (time === 1 ? mongoStats.current
                          .rank.tank
                          : mongoStats.scores[mongoStats.scores.length - time + 1]
                            .rank.tank) - mongoStats.scores[mongoStats.scores.length - time]
                          .rank.tank;
                        if (obj[key] > 0) {
                          obj[key] = Slope.INCREASING;
                        } else if (obj[key] < 0) {
                          obj[key] = Slope.DECREASING;
                        } else {
                          obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .games.played || 0;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = mongoStats.current
                          .games.played || 0;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .games.won || 0;
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = mongoStats.current
                          .games.won || 0;
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
                    obj[key] = `${(((mongoStats.scores[mongoStats.scores.length - time]
                      .games.won || 0)
              / mongoStats.scores[mongoStats.scores.length - time]
                .games.played || 1) * 100).toFixed(2)}%`;
                    break;
                  case 'current':
                    if (time === 1 ? !mongoStats.current
                      : !mongoStats.scores[mongoStats.scores.length - time + 1]) break;
                    obj[key] = `${(((time === 1 ? mongoStats.current
                      .games.won || 0
                      : mongoStats.scores[mongoStats.scores.length - time + 1].games.won || 0)
              / mongoStats.current
                .games.played || 1) * 100).toFixed(2)}%`;
                    break;
                  case 'slope':
                    if (!mongoStats.scores
                    || mongoStats.scores.length < time) {
                      obj[key] = Slope.TIED;
                      break;
                    }
                    obj[key] = (time === 1 ? ((mongoStats.current
                      .games.won || 0)
              / mongoStats.current
                .games.played || 1) : ((mongoStats.scores[mongoStats.scores.length - time + 1]
                      .games.won || 0)
            / (mongoStats.scores[mongoStats.scores.length - time + 1]
              .games.played || 1)))
                - ((mongoStats.scores[mongoStats.scores.length - time]
                  .games.won || 0)
            / mongoStats.scores[mongoStats.scores.length - time]
              .games.played || 1);
                    if (obj[key] > 0) {
                      obj[key] = Slope.INCREASING;
                    } else if (obj[key] < 0) {
                      obj[key] = Slope.DECREASING;
                    } else {
                      obj[key] = Slope.TIED;
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
                        obj[key] = mongoStats.scores[mongoStats.scores.length - time]
                          .main || '';
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? mongoStats.current
                          .main || '' : mongoStats.scores[mongoStats.scores.length - time + 1].main;
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
                        obj[key] = heroes[mongoStats.scores[mongoStats.scores.length - time]
                          .main] || '';
                        break;
                      case 'current':
                        if (time > 1 && (!mongoStats.scores
                        || !mongoStats.scores.length < time - 1)) break;
                        obj[key] = time === 1 ? heroes[mongoStats.current
                          .main] || '' : heroes[mongoStats.scores[mongoStats.scores.length - time + 1].main];
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
              if (!oversmashStats || isEmpty(oversmashStats.stats.competitive)) break;
              switch (args[0]) {
                case 'endorsement':
                  obj[key] = oversmashStats.stats.endorsement_level;
                  break;
                case 'sr':
                  switch (args[1]) {
                    case 'highest':
                      obj[key] = Math.max(oversmashStats.stats.competitive_rank.damage,
                        oversmashStats.stats.competitive_rank.support,
                        oversmashStats.stats.competitive_rank.tank);
                      break;
                    case Roles.SUPPORT:
                      obj[key] = oversmashStats.stats.competitive_rank.support || 0;
                      break;
                    case Roles.DAMAGE:
                      obj[key] = oversmashStats.stats.competitive_rank.damage || 0;
                      break;
                    case Roles.TANK:
                      obj[key] = oversmashStats.stats.competitive_rank.tank || 0;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'matches':
                  switch (args[1]) {
                    case 'played':
                      obj[key] = oversmashStats.stats.competitive.all.game.games_played || 0;
                      break;
                    case 'won':
                      obj[key] = oversmashStats.stats.competitive.all.game.games_won || 0;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'winrate':
                  obj[key] = (`${(((oversmashStats.stats.competitive.all.game.games_won || 0)
              / oversmashStats.stats.competitive.all.game.games_played || 1) * 100).toFixed(2)}%`);
                  break;
                case 'main':
                  switch (args[1]) {
                    case 'hero':
                      obj[key] = Object.keys(oversmashStats.stats.competitive)
                        .reduce((previousValue, currentValue) => {
                          if (previousValue === '' || previousValue === 'all') return currentValue;
                          let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                            .game.time_played;
                          let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                            .game.time_played;
                          if (typeof currentTimePlayed === 'undefined') return previousValue;
                          if (previousTimePlayed.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                          if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                          return previousTimePlayed > currentTimePlayed ? previousValue
                            : currentValue;
                        }, '');
                      break;
                    case 'role':
                      obj[key] = heroes[Object.keys(oversmashStats.stats.competitive)
                        .reduce((previousValue, currentValue) => {
                          if (previousValue === '' || previousValue === 'all') return currentValue;
                          let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                            .game.time_played;
                          let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                            .game.time_played;
                          if (typeof currentTimePlayed === 'undefined') return previousValue;
                          if (previousTimePlayed.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                          if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                          return previousTimePlayed > currentTimePlayed ? previousValue
                            : currentValue;
                        }, '')];
                      break;
                    case 'time':
                      obj[key] = oversmashStats.stats
                        .competitive[Object.keys(oversmashStats.stats.competitive)
                          .reduce((previousValue, currentValue) => {
                            if (previousValue === '' || previousValue === 'all') return currentValue;
                            let previousTimePlayed = oversmashStats.stats.competitive[previousValue]
                              .game.time_played;
                            let currentTimePlayed = oversmashStats.stats.competitive[currentValue]
                              .game.time_played;
                            if (typeof currentTimePlayed === 'undefined') return previousValue;
                            if (previousTimePlayed.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                            if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                            return previousTimePlayed > currentTimePlayed ? previousValue
                              : currentValue;
                          }, '')].game.time_played;
                      if (obj[key].length === 5) obj[key] = `00:${obj[key]}`;
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
 * @param {Number} rank Player's SR
 * @returns {String} Image URL
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

  public async getPlayerInfo(tag: string, platform: string, forceUpdate: boolean): Promise<any> {
    let playerStats;
    if (playerCache[`${tag}${platform}`]) {
      const now = new Date().getDate();
      // 1000 * 60 * 5 = 300.000ms
      if (now - playerCache[`${tag}${platform}`].time >= 300000 || forceUpdate === true) {
        playerStats = await oversmash().playerStats(tag, platform);
        playerCache[`${tag}${platform}`].info = playerStats;
        playerCache[`${tag}${platform}`].time = now;
      } else playerStats = playerCache[`${tag}${platform}`].info;
      playerCache[`${tag}${platform}`].views += 1;
    } else {
      playerStats = await oversmash().playerStats(tag, platform);
      if (Object.keys(playerCache).length >= (config.maxBufferLength || 64)) {
        let lessPopular = Object.keys(playerCache)[0];
        Object.keys(playerCache).forEach((savedPlayer) => {
          if (iVal(playerCache, savedPlayer).views < iVal(playerCache, lessPopular)) {
            lessPopular = savedPlayer;
          }
        });
        delete playerCache[lessPopular];
      }
      playerCache[`${tag}${platform}`] = { info: playerStats, time: new Date().getTime(), views: 1 };
    }
    return playerStats;
  }

  public fillObject = async (
    obj,
    tag: string,
    platform: string,
    time: number,
    forceUpdate: boolean,
  ): Promise<any> => {
    const playerStats = await this.getPlayerInfo(tag, platform, forceUpdate);
    if (isEmpty(playerStats.stats.competitive)) return false;
    let exists = false;
    await mongo
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(tag) // ADICIONAR VERIFICAÇÃO DE PLATAFORMA!!!
      .once('value', async (snapshot) => {
        if (snapshot.val()) {
          stringToInfo(obj, playerStats, fVal(snapshot.val()), time);
          exists = true;
        }
      });
    if (!exists) stringToInfo(obj, playerStats);
    return true;
  }
}

export default new Overwatch();
