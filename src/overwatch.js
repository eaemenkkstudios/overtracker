
const oversmash = require('oversmash').default();
const firebase = require('firebase-admin');

const { isObject, fkey } = require('./util');

const classes = {
  DAMAGE: 'damage',
  SUPPORT: 'support',
  TANK: 'tank',
};


const sources = {
  FIREBASE: 'firebase',
  OVERSMASH: 'oversmash',
};

module.exports = {

  /* WIP
  const heroes = {
    ana: classes.SUPPORT,
    ashe: classes.DAMAGE,
    dva: classes.TANK,
  };
  */


  /* WIP
   * Verifica se a pesquisa necessita apenas do firebase,
   * oversmash ou dos dois.
  function getChecking(obj) {
    const final = {};
    let aux;
    Object.keys(sources).forEach((key) => {
      final[key] = false;
    });
    Object.values(obj).forEach((val) => {
      if (isObject(val)) {
        aux = getChecking(val);
      } else if (typeof val === 'string') {
        const args = (String)(val).split('_');
        final[args[args.length - 1]] = true;
      }
    });
    Object.keys(final).forEach((key) => {
      final[key] = final[key] || aux[key];
    });
    return final;
  }
  */

  // Transforma uma request de informação na informação requisitada.
  // Exemplo: player.SR.SUPPORT.CURRENT -> 2468
  stringToInfo(obj, oversmashStats, firebaseStats) {
    Object.keys(obj).forEach((key) => {
      if (isObject(obj[key])) {
        this.stringToInfo(obj[key], oversmashStats, firebaseStats);
      } else if (typeof obj[key] === 'string') {
        const args = (String)(obj[key]).split('_');
        switch (args[args.length - 1]) {
          case sources.FIREBASE:
            switch (args[0]) {
              case 'endorsement':
                obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                  .endorsement;
                break;
              case 'sr':
                switch (args[1]) {
                  case 'highest':
                    obj[key] = Math.max(firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.damage,
                    firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.support,
                    firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.tank);
                    break;
                  case classes.DAMAGE:
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.damage;
                    break;
                  case classes.SUPPORT:
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.support;
                    break;
                  case classes.TANK:
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .rank.tank;
                    break;
                  default:
                    break;
                }
                break;
              case 'matches':
                switch (args[1]) {
                  case 'played':
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .competitive.all.games_played || 0;
                    break;
                  case 'won':
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .competitive.all.games_won || 0;
                    break;
                  default:
                    break;
                }
                break;
              case 'main':
                switch (args[1]) {
                  case 'hero':
                    obj[key] = firebaseStats.scores[firebaseStats.length - args[1] === 'previous' ? 2 : 1]
                      .main;
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
                  case classes.DAMAGE:
                    obj[key] = oversmashStats.stats.competitive_rank.damage;
                    break;
                  case classes.SUPPORT:
                    obj[key] = oversmashStats.stats.competitive_rank.support;
                    break;
                  case classes.TANK:
                    obj[key] = oversmashStats.stats.competitive_rank.tank;
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
  },

  player: {
    ENDORSEMENT: {
      PREVIOUS: `endorsement_previous_${sources.FIREBASE}`,
      CURRENT: `endorsement_current_${sources.FIREBASE}`,
      UPDATED: `endorsement_${sources.OVERSMASH}`,
    },
    SR: {
      /* Precisa que a lista de heróis e classes (no início do arquivo) esteja completa
      MAIN: {
        PREVIOUS: `sr_main_previous_${sources.FIREBASE}`,
        CURRENT: `sr_main_current_${sources.FIREBASE}`,
        SLOPE: `sr_main_slope_${sources.FIREBASE}`,
        UPDATED: `sr_main_${sources.OVERSMASH}`,
      },
      */
      HIGHEST: {
        PREVIOUS: `sr_highest_previous_${sources.FIREBASE}`,
        CURRENT: `sr_highest_current_${sources.FIREBASE}`,
        SLOPE: `sr_highest_slope_${sources.FIREBASE}`,
        UPDATED: `sr_highest_${sources.OVERSMASH}`,
      },
      DAMAGE: {
        PREVIOUS: `sr_${classes.DAMAGE}_previous_${sources.FIREBASE}`,
        CURRENT: `sr_${classes.DAMAGE}_current_${sources.FIREBASE}`,
        SLOPE: `sr_${classes.DAMAGE}_slope_${sources.FIREBASE}`,
        UPDATED: `sr_${classes.DAMAGE}_${sources.OVERSMASH}`,
      },
      SUPPORT: {
        PREVIOUS: `sr_${classes.SUPPORT}_previous_${sources.FIREBASE}`,
        CURRENT: `sr_${classes.SUPPORT}_current_${sources.FIREBASE}`,
        SLOPE: `sr_${classes.SUPPORT}_slope_${sources.FIREBASE}`,
        UPDATED: `sr_${classes.SUPPORT}_${sources.OVERSMASH}`,
      },
      TANK: {
        PREVIOUS: `sr_${classes.TANK}_previous_${sources.FIREBASE}`,
        CURRENT: `sr_${classes.TANK}_current_${sources.FIREBASE}`,
        SLOPE: `sr_${classes.TANK}_slope_${sources.FIREBASE}`,
        UPDATED: `sr_${classes.TANK}_${sources.OVERSMASH}`,
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
    MAIN: {
      HERO: {
        PREVIOUS: `main_hero_previous_${sources.FIREBASE}`,
        CURRENT: `main_hero_current_${sources.FIREBASE}`,
        UPDATED: `main_hero_${sources.OVERSMASH}`,
      },
      TIME: {
        // NÃO GUARDAMOS O TEMPO DO MAIN NO FIREBASE!
        // CURRENT: `main_time_current_${sources.FIREBASE}`,
        UPDATED: `main_time_${sources.OVERSMASH}`,
      },
    },
    /*
    PROFILE: {
      TAG: `tag_${sources.FIREBASE}`,
      PLATFORM: `platform_${sources.FIREBASE}`,
    },
    */
  },

  friendlyPlatforms: {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
  },
  /**
   * Gets the image URL of the player's rank
   * @param {Number} rank Player's SR
   * @returns {String} Image URL
   */
  getRankImageURL(rank) {
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
  },

  async fillObject(tag, platform, obj) {
    // const checkings = getChecking(obj); Checa se o processo precisa do oversmash
    const stats = await oversmash.playerStats(tag, platform);
    await firebase
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(tag) // ADICIONAR VERIFICAÇÃO DE PLATAFORMA!!!
      .once('value', async (snapshot) => {
        if (snapshot.val()) {
          this.stringToInfo(obj, stats, fkey(snapshot.val()));
        }
      });
  },
};
