
const oversmash = require('oversmash').default();
const firebase = require('firebase-admin');

const { isObject, isEmpty, fVal } = require('./util');

const slope = {
  DECREASING: 'decreasing',
  TIED: 'tied',
  INCREASING: 'increasing',
};

const sources = {
  FIREBASE: 'firebase',
  OVERSMASH: 'oversmash',
};

const roles = Object.freeze({
  DAMAGE: 'damage',
  SUPPORT: 'support',
  TANK: 'tank',
});

const heroes = Object.freeze({
  ana: roles.SUPPORT,
  ashe: roles.DAMAGE,
  baptiste: roles.SUPPORT,
  bastion: roles.DAMAGE,
  brigitte: roles.SUPPORT,
  dva: roles.TANK,
  doomfist: roles.DAMAGE,
  echo: roles.DAMAGE,
  genji: roles.DAMAGE,
  hanzo: roles.DAMAGE,
  junkrat: roles.DAMAGE,
  lucio: roles.SUPPORT,
  mccree: roles.DAMAGE,
  mei: roles.DAMAGE,
  mercy: roles.SUPPORT,
  moira: roles.SUPPORT,
  orisa: roles.TANK,
  pharah: roles.DAMAGE,
  reaper: roles.DAMAGE,
  reinhardt: roles.TANK,
  roadhog: roles.TANK,
  sigma: roles.TANK,
  soldier76: roles.DAMAGE,
  sombra: roles.DAMAGE,
  symmetra: roles.DAMAGE,
  torbjorn: roles.DAMAGE,
  tracer: roles.DAMAGE,
  widowmaker: roles.DAMAGE,
  winston: roles.TANK,
  wreckingball: roles.TANK,
  zarya: roles.TANK,
  zenyatta: roles.SUPPORT,
});

// Transforma uma request de informação na informação requisitada.
// Exemplo: player.SR.SUPPORT.CURRENT -> 2468
function stringToInfo(obj, oversmashStats, firebaseStats, page) {
  if (page < 1) return;
  Object.keys(obj).forEach((key) => {
    if (isObject(obj[key])) {
      stringToInfo(obj[key], oversmashStats, firebaseStats, page);
    } else if (typeof obj[key] === 'string') {
      const args = (String)(obj[key]).split('_');
      switch (args[args.length - 1]) {
        case sources.FIREBASE:
          switch (args[0]) {
            case 'endorsement':
              switch (args[1]) {
                case 'previous':
                  obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                    .endorsement;
                  break;
                case 'current':
                  obj[key] = page === 1 ? firebaseStats.current.endorsement
                    : firebaseStats.scores[firebaseStats.scores.length - page + 1].endorsement;
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
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = Math.max(firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.damage,
                      firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.support,
                      firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.tank);
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? Math.max(firebaseStats.current
                        .rank.damage,
                      firebaseStats.current
                        .rank.support,
                      firebaseStats.current
                        .rank.tank)
                        : Math.max(firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.damage,
                        firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.support,
                        firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.tank);
                      break;
                    case 'slope':
                      if (!firebaseStats.scores) {
                        obj[key] = slope.TIED;
                        break;
                      }
                      switch (page === 1 ? Math.max(firebaseStats.current
                        .rank.damage,
                      firebaseStats.current
                        .rank.support,
                      firebaseStats.current
                        .rank.tank)
                        : Math.max(firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.damage,
                        firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.support,
                        firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.tank)) {
                        case (page === 1 ? firebaseStats.current
                          .rank.support
                          : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                            .rank.support):
                          obj[key] = page === 1 ? (firebaseStats.current
                            .rank.support)
                            : (firebaseStats.scores[firebaseStats.scores.length - page + 1]
                              .rank.support)
                            - firebaseStats.scores[firebaseStats.scores.length - page]
                              .rank.support;
                          if (obj[key] > 0) {
                            obj[key] = slope.INCREASING;
                          } else if (obj[key] < 0) {
                            obj[key] = slope.DECREASING;
                          } else {
                            obj[key] = slope.TIED;
                          }
                          break;
                        case (page === 1 ? firebaseStats.current
                          .rank.damage
                          : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                            .rank.damage):
                          obj[key] = page === 1 ? (firebaseStats.current
                            .rank.damage)
                            : (firebaseStats.scores[firebaseStats.scores.length - page + 1]
                              .rank.damage)
                            - firebaseStats.scores[firebaseStats.scores.length - page]
                              .rank.damage;
                          if (obj[key] > 0) {
                            obj[key] = slope.INCREASING;
                          } else if (obj[key] < 0) {
                            obj[key] = slope.DECREASING;
                          } else {
                            obj[key] = slope.TIED;
                          }
                          break;
                        case (page === 1 ? firebaseStats.current
                          .rank.tank
                          : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                            .rank.tank):
                          obj[key] = page === 1 ? (firebaseStats.current
                            .rank.tank)
                            : (firebaseStats.scores[firebaseStats.scores.length - page + 1]
                              .rank.tank)
                            - firebaseStats.scores[firebaseStats.scores.length - page]
                              .rank.tank;
                          if (obj[key] > 0) {
                            obj[key] = slope.INCREASING;
                          } else if (obj[key] < 0) {
                            obj[key] = slope.DECREASING;
                          } else {
                            obj[key] = slope.TIED;
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
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank[heroes[page === 1 ? firebaseStats.current.main
                          : firebaseStats.scores[firebaseStats.scores.length - page + 1].main]];
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? firebaseStats.current
                        .rank[heroes[firebaseStats.current.main]]
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank[heroes[firebaseStats.scores[firebaseStats.scores.length - page + 1]
                            .main]];
                      break;
                    case 'slope':
                      if (!firebaseStats.scores) {
                        obj[key] = slope.TIED;
                        break;
                      }
                      obj[key] = page === 1 ? (firebaseStats.current
                        .rank[heroes[firebaseStats.current.main]]
                        - firebaseStats.scores[firebaseStats.scores.length - page]
                          .rank[heroes[firebaseStats.current.main]])
                        : (firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank[heroes[firebaseStats.scores[firebaseStats.scores.length - page + 1]
                            .main]]
                            - firebaseStats.scores[firebaseStats.scores.length - page]
                              .rank[heroes[firebaseStats
                                .scores[firebaseStats.scores.length - page + 1]
                                .main]]);
                      if (obj[key] > 0) {
                        obj[key] = slope.INCREASING;
                      } else if (obj[key] < 0) {
                        obj[key] = slope.DECREASING;
                      } else {
                        obj[key] = slope.TIED;
                      }
                      break;
                    default:
                      break;
                  }
                  break;
                case roles.SUPPORT:
                  switch (args[2]) {
                    case 'previous':
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.support;
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? firebaseStats.current
                        .rank.support
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.support;
                      break;
                    case 'slope':
                      if (!firebaseStats.scores) {
                        obj[key] = slope.TIED;
                        break;
                      }
                      obj[key] = (page === 1 ? firebaseStats.current
                        .rank.support
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.support) - firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.support;
                      if (obj[key] > 0) {
                        obj[key] = slope.INCREASING;
                      } else if (obj[key] < 0) {
                        obj[key] = slope.DECREASING;
                      } else {
                        obj[key] = slope.TIED;
                      }
                      break;
                    default:
                      break;
                  }
                  break;
                case roles.DAMAGE:
                  switch (args[2]) {
                    case 'previous':
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.damage;
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? firebaseStats.current
                        .rank.damage
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.damage;
                      break;
                    case 'slope':
                      if (!firebaseStats.scores) {
                        obj[key] = slope.TIED;
                        break;
                      }
                      obj[key] = (page === 1 ? firebaseStats.current
                        .rank.damage
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.damage) - firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.damage;
                      if (obj[key] > 0) {
                        obj[key] = slope.INCREASING;
                      } else if (obj[key] < 0) {
                        obj[key] = slope.DECREASING;
                      } else {
                        obj[key] = slope.TIED;
                      }
                      break;
                    default:
                      break;
                  }
                  break;
                case roles.TANK:
                  switch (args[2]) {
                    case 'previous':
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.tank;
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? firebaseStats.current
                        .rank.tank
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.tank;
                      break;
                    case 'slope':
                      if (!firebaseStats.scores) {
                        obj[key] = slope.TIED;
                        break;
                      }
                      obj[key] = (page === 1 ? firebaseStats.current
                        .rank.tank
                        : firebaseStats.scores[firebaseStats.scores.length - page + 1]
                          .rank.tank) - firebaseStats.scores[firebaseStats.scores.length - page]
                        .rank.tank;
                      if (obj[key] > 0) {
                        obj[key] = slope.INCREASING;
                      } else if (obj[key] < 0) {
                        obj[key] = slope.DECREASING;
                      } else {
                        obj[key] = slope.TIED;
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
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .games.played || 0;
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = firebaseStats.current
                        .games.played || 0;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'won':
                  switch (args[2]) {
                    case 'previous':
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .games.won || 0;
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = firebaseStats.current
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
                  if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                  obj[key] = `${(((firebaseStats.scores[firebaseStats.scores.length - page]
                    .games.won || 0)
              / firebaseStats.scores[firebaseStats.scores.length - page]
                .games.played || 1) * 100).toFixed(2)}%`;
                  break;
                case 'current':
                  if (page === 1 ? !firebaseStats.current
                    : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                  obj[key] = `${(((page === 1 ? firebaseStats.current
                    .games.won || 0
                    : firebaseStats.scores[firebaseStats.scores.length - page + 1].games.won || 0)
              / firebaseStats.current
                .games.played || 1) * 100).toFixed(2)}%`;
                  break;
                case 'slope':
                  if (!firebaseStats.scores) {
                    obj[key] = slope.TIED;
                    break;
                  }
                  obj[key] = page === 1 ? ((firebaseStats.current
                    .games.won || 0)
              / firebaseStats.current
                .games.played || 1) : ((firebaseStats.scores[firebaseStats.scores.length - page + 1]
                    .games.won || 0)
            / (firebaseStats.scores[firebaseStats.scores.length - page + 1]
              .games.played || 1))
                - (firebaseStats.scores[firebaseStats.scores.length - page]
                  .games.won || 0)
            / firebaseStats.scores[firebaseStats.scores.length - page]
              .games.played || 1;
                  if (obj[key] > 0) {
                    obj[key] = slope.INCREASING;
                  } else if (obj[key] < 0) {
                    obj[key] = slope.DECREASING;
                  } else {
                    obj[key] = slope.TIED;
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
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = firebaseStats.scores[firebaseStats.scores.length - page]
                        .main || '';
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? firebaseStats.current
                        .main || '' : firebaseStats.scores[firebaseStats.scores.length - page + 1].main;
                      break;
                    default:
                      break;
                  }
                  break;
                case 'role':
                  switch (args[2]) {
                    case 'previous':
                      if (!firebaseStats.scores || firebaseStats.scores.length < page) break;
                      obj[key] = heroes[firebaseStats.scores[firebaseStats.scores.length - page]
                        .main] || '';
                      break;
                    case 'current':
                      if (page === 1 ? !firebaseStats.current
                        : !firebaseStats.scores[firebaseStats.scores.length - page + 1]) break;
                      obj[key] = page === 1 ? heroes[firebaseStats.current
                        .main] || '' : heroes[firebaseStats.scores[firebaseStats.scores.length - page + 1].main];
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
        case sources.OVERSMASH:
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
                case roles.SUPPORT:
                  obj[key] = oversmashStats.stats.competitive_rank.support || 0;
                  break;
                case roles.DAMAGE:
                  obj[key] = oversmashStats.stats.competitive_rank.damage || 0;
                  break;
                case roles.TANK:
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
                        if (previousTimePlayed.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
                        if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
                        return previousTimePlayed > currentTimePlayed ? previousValue
                          : currentValue;
                      }, '')].game.time_played;
                  break;
                default:
                  break;
              }
              break;
            default:
              break;
          }
          break;
      }
    }
  });
}

const player = Object.freeze({
  ENDORSEMENT: {
    PREVIOUS: `endorsement_previous_${sources.FIREBASE}`,
    CURRENT: `endorsement_current_${sources.FIREBASE}`,
    UPDATED: `endorsement_${sources.OVERSMASH}`,
  },
  SR: {
    MAIN: {
      PREVIOUS: `sr_main_previous_${sources.FIREBASE}`,
      CURRENT: `sr_main_current_${sources.FIREBASE}`,
      SLOPE: `sr_main_slope_${sources.FIREBASE}`,
      UPDATED: `sr_main_${sources.OVERSMASH}`,
    },
    HIGHEST: {
      PREVIOUS: `sr_highest_previous_${sources.FIREBASE}`,
      CURRENT: `sr_highest_current_${sources.FIREBASE}`,
      SLOPE: `sr_highest_slope_${sources.FIREBASE}`,
      UPDATED: `sr_highest_${sources.OVERSMASH}`,
    },
    DAMAGE: {
      PREVIOUS: `sr_${roles.DAMAGE}_previous_${sources.FIREBASE}`,
      CURRENT: `sr_${roles.DAMAGE}_current_${sources.FIREBASE}`,
      SLOPE: `sr_${roles.DAMAGE}_slope_${sources.FIREBASE}`,
      UPDATED: `sr_${roles.DAMAGE}_${sources.OVERSMASH}`,
    },
    SUPPORT: {
      PREVIOUS: `sr_${roles.SUPPORT}_previous_${sources.FIREBASE}`,
      CURRENT: `sr_${roles.SUPPORT}_current_${sources.FIREBASE}`,
      SLOPE: `sr_${roles.SUPPORT}_slope_${sources.FIREBASE}`,
      UPDATED: `sr_${roles.SUPPORT}_${sources.OVERSMASH}`,
    },
    TANK: {
      PREVIOUS: `sr_${roles.TANK}_previous_${sources.FIREBASE}`,
      CURRENT: `sr_${roles.TANK}_current_${sources.FIREBASE}`,
      SLOPE: `sr_${roles.TANK}_slope_${sources.FIREBASE}`,
      UPDATED: `sr_${roles.TANK}_${sources.OVERSMASH}`,
    },
  },
  MATCHES: {
    PLAYED: {
      PREVIOUS: `matches_played_previous_${sources.FIREBASE}`,
      CURRENT: `matches_played_current_${sources.FIREBASE}`,
      UPDATED: `matches_played_${sources.OVERSMASH}`,
    },
    WON: {
      PREVIOUS: `matches_won_previous_${sources.FIREBASE}`,
      CURRENT: `matches_won_current_${sources.FIREBASE}`,
      UPDATED: `matches_won_${sources.OVERSMASH}`,
    },
  },
  WINRATE: {
    PREVIOUS: `winrate_previous_${sources.FIREBASE}`,
    CURRENT: `winrate_current_${sources.FIREBASE}`,
    SLOPE: `winrate_slope_${sources.FIREBASE}`,
    UPDATED: `winrate_${sources.OVERSMASH}`,
  },
  MAIN: {
    HERO: {
      PREVIOUS: `main_hero_previous_${sources.FIREBASE}`,
      CURRENT: `main_hero_current_${sources.FIREBASE}`,
      UPDATED: `main_hero_${sources.OVERSMASH}`,
    },
    ROLE: {
      PREVIOUS: `main_role_previous_${sources.FIREBASE}`,
      CURRENT: `main_role_current_${sources.FIREBASE}`,
      UPDATED: `main_role_${sources.OVERSMASH}`,
    },
    TIME: {
      UPDATED: `main_time_${sources.OVERSMASH}`,
    },
  },
});

const friendlyPlatforms = Object.freeze({
  pc: 'PC',
  psn: 'PlayStation Network',
  xbl: 'Xbox Live',
});

/**
 * Gets the image URL of the player's rank
 * @param {Number} rank Player's SR
 * @returns {String} Image URL
 */
function getRankImageURL(rank) {
  const baseUrl = 'https://d1u1mce87gyfbn.cloudfront.net/game/rank-icons/rank-';
  const suffix = 'Tier.png';
  let tier = '';
  if (rank < 1) return undefined;
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

async function fillObject(obj, tag, platform, page) {
  const playerStats = await oversmash.playerStats(tag, platform);
  if (isEmpty(playerStats.stats.competitive)) return false;
  let exists = false;
  await firebase
    .database()
    .ref('battletags')
    .orderByChild('tag')
    .equalTo(tag) // ADICIONAR VERIFICAÇÃO DE PLATAFORMA!!!
    .once('value', async (snapshot) => {
      if (snapshot.val()) {
        stringToInfo(obj, playerStats, fVal(snapshot.val()), page);
        exists = true;
      }
    });
  if (!exists) stringToInfo(obj, playerStats);
  return true;
}

module.exports = {
  roles,
  heroes,
  stringToInfo,
  player,
  friendlyPlatforms,
  getRankImageURL,
  fillObject,
};
