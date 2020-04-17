const oversmash = require('oversmash').default();
const firebase = require('firebase-admin');

const overwatch = require('../overwatch');
const { fkey, fval, cloneObject } = require('../util');

const scoreCard = Object.freeze({
  endorsement: overwatch.player.ENDORSEMENT.UPDATED,
  games: {
    played: overwatch.player.MATCHES.PLAYED.UPDATED,
    won: overwatch.player.MATCHES.WON.UPDATED,
  },
  main: overwatch.player.MAIN.HERO.UPDATED,
  rank: {
    damage: overwatch.player.SR.DAMAGE.UPDATED,
    support: overwatch.player.SR.SUPPORT.UPDATED,
    tank: overwatch.player.SR.TANK.UPDATED,
  },
});

/*
const cards = Object.freeze({
  MATCH_UPDATE: {
    type: 'match_update',
    sr: {
      previous: overwatch.player.SR.HIGHEST.PREVIOUS,
      current: overwatch.player.SR.HIGHEST.CURRENT,
    },
  },
  MAIN_UPDATE: {
    type: 'main_update',
    time: overwatch.player.MAIN.TIME.CURRENT,
    main: {
      previous: overwatch.player.MAIN.HERO.PREVIOUS,
      current: overwatch.player.MAIN.HERO.CURRENT,
    },
  },
  ENDORSEMENT_UPDATE: {
    type: 'endorsement_update',
    endorsement: {
      previous: overwatch.player.ENDORSEMENT.PREVIOUS,
      current: overwatch.player.ENDORSEMENT.CURRENT,
    },
  },
  HIGHLIGHT: {
    type: 'highlight',
    sr: {
      current: overwatch.player.SR.HIGHEST.CURRENT,
      state: overwatch.player.SR.HIGHEST.SLOPE,
    },
    win_rate: {
      current: overwatch.player.WINRATE.CURRENT,
      state: overwatch.player.WINRATE.SLOPE,
    },
    main: {
      current: overwatch.player.MAIN.HERO.CURRENT,
      time: overwatch.player.MAIN.TIME.CURRENT,
    },
  },
});
*/
async function makeScore(tag, platform) {
  const score = {
    date: new Date().getTime(),
    ...cloneObject(scoreCard),
  };
  const success = await overwatch.fillObject(score, tag, platform);
  return success ? score : undefined;
}

/**
 * Adds the rank image url to each rank
 * @param {{
  *  date: String
  *  endorsment: Number
  *  main: String
  *  rank: {
  *    damage: Number
  *    support: Number
  *    tank: Number
  *  }
  *  games: {
  *    played: Number
  *    won: Number
  *  }
  * }} score Player's score object
  * @returns {{
  *  rank: {
  *    damage: {
  *      sr: Number
  *      img: String
  *    }
  *    support: {
  *      sr: Number
  *      img: String
  *    }
  *    tank: {
  *      sr: Number
  *      img: String
  *    }
  *  }
  *  date: String
  *  endorsment: Number
  *  main: String
  *  games: {
  *    played: Number
  *    won: Number
  *  }
  * }} Friendly Score Object
  */
function makeFriendlyScore(score) {
  Object.keys(score.rank).forEach((rank) => {
    const img = overwatch.getRankImageURL(score.rank[rank]);
    score.rank[rank] = {
      sr: score.rank[rank],
      img,
    };
  });
  return score;
}

/**
 * Registers the player in the database
 * @async
 * @param {String} tag Player's battletag
 * @param {String} platform Player's platform
 * @returns {*} The database referece or `undefined`
 */
async function registerBattleTag(tag, platform) {
  platform = platform || 'pc';
  const player = await oversmash.player(tag, platform);
  if (!player.accounts.length) return undefined;
  let platformIndex = -1;
  if (platform) {
    for (let i = 0; i < player.accounts.length; i += 1) {
      if (player.accounts[i].platform === platform) {
        platformIndex = i;
      }
    }
  } else {
    platformIndex = 0;
  }
  if (platformIndex < 0) return undefined;
  const current = await makeScore(tag, platform);
  let finalStats = {};
  if (current) {
    finalStats = {
      tag,
      platform,
      current,
      lastUpdate: current.date,
      scores: [],
    };
  } else {
    finalStats = {
      tag,
      platform,
      lastUpdate: new Date().getTime(),
      scores: [],
    };
  }
  return firebase.database().ref('battletags').push(finalStats);
}

module.exports = {
  /**
   * Gets all of the players that haven't been updated in more than 12hrs
   * @async
   * @returns {Promise<[{
   *  tag: String
   *  platform: String
   * }]>} Array of outdated players
   */
  async getOutdatedPlayers() {
    const currentTime = new Date().getTime();
    const outdatedPlayers = [];
    return firebase
      .database()
      .ref('battletags')
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          Object.keys(snapshot.val()).forEach((player) => {
            if (snapshot.val()[player].current) {
              // 60 * 60 * 24 * 1000 = 8640000 = 24hrs
              if (currentTime - snapshot.val()[player].lastUpdate >= 8640000) {
                outdatedPlayers.push({
                  tag: snapshot.val()[player].tag,
                  platform: snapshot.val()[player].platform,
                });
              }
            }
          });
        }
      })
      .then(() => outdatedPlayers);
  },

  /**
   * Updates the score of the player
   * @async
   * @param {String} tag Player's battletag
   * @param {String} platform Player's platform
   */
  async updatePlayer(tag, platform) {
    const newScore = await makeScore(tag, platform);
    if (!newScore) return;
    await firebase
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(tag)
      .once('value', async (snapshot) => {
        const lastScore = fkey(snapshot.val()).current;
        const hasChanged = JSON.stringify(lastScore.games) !== JSON.stringify(newScore.games)
        || JSON.stringify(lastScore.rank) !== JSON.stringify(newScore.rank);
        let newStats = {};
        if (fkey(snapshot.val()).scores) {
          newStats = {
            [fval(snapshot.val())]: {
              tag,
              platform,
              scores: hasChanged ? [
                ...fkey(snapshot.val()).scores,
                fkey(snapshot.val()).current,
              ] : [...fkey(snapshot.val()).scores],
              lastUpdate: new Date().getTime(),
              current: newScore,
            },
          };
        } else {
          newStats = {
            [fval(snapshot.val())]: {
              tag,
              platform,
              scores: hasChanged ? [fkey(snapshot.val()).current] : [],
              lastUpdate: new Date().getTime(),
              current: newScore,
            },
          };
        }
        await snapshot.ref.update(newStats);
      });
  },

  async getFeed(req, res) {
    const { role } = req.body;
    firebase
      .database()
      .ref('battletags')
      .orderByChild(`current/${role}`)
      .once('value', (snapshot) => {
        const players = [];
        players.push(snapshot.val());
        res.status(200).json(players);
      });
  },

  /**
   * Gets following players
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  async getFollowing(req, res) {
    const token = req.headers.authorization;
    firebase.auth().verifyIdToken(token)
      .then(async (userData) => {
        firebase
          .database()
          .ref('accounts')
          .child(userData.uid)
          .child('following')
          .once('value', (snapshot) => {
            firebase
              .database()
              .ref('battletags')
              .once('value', (snap) => {
                const followedPlayers = snapshot.val();
                const playersInfo = snap.val();
                const tagIds = Object.keys(followedPlayers).map((id) => followedPlayers[id]);
                const players = [];
                Object.keys(playersInfo).forEach((player) => {
                  if (tagIds.indexOf(player) !== -1) {
                    players.push({
                      id: player,
                      platform: overwatch.friendlyPlatforms[(playersInfo[player].platform)],
                      tag: playersInfo[player].tag,
                    });
                  }
                });
                res.status(200).json(players);
              });
          });
      })
      .catch(() => res.status(401).send());
  },

  /**
   * Gets detailed stats for player
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  async getStats(req, res) {
    const token = req.headers.authorization;
    const { tagId } = req.params;
    firebase.auth().verifyIdToken(token)
      .then(async () => {
        await firebase
          .database()
          .ref('battletags')
          .orderByKey()
          .equalTo(tagId)
          .once('value', async (snapshot) => {
            if (!snapshot.val()) return res.status(400).send();
            const { tag, platform } = fkey(snapshot.val());
            const newScore = await makeScore(tag, platform);
            const stats = {
              tag,
              platform,
              scores: [],
              now: makeFriendlyScore(newScore),
            };
            if (fkey(snapshot.val()).scores) {
              fkey(snapshot.val()).scores.forEach((score) => {
                stats.scores.push(makeFriendlyScore(score));
              });
            }
            res.status(200).json(stats);
          });
      })
      .catch(() => res.status(401).send());
  },

  /**
   * Follows specific player
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  async followPlayer(req, res) {
    const token = req.headers.authorization;
    const { tag, platform } = req.body;
    firebase.auth().verifyIdToken(token)
      .then(async (userData) => {
        firebase.database().ref('battletags')
          .orderByChild('tag')
          .equalTo(tag)
          .once('value', async (snapshot) => {
            if (snapshot.val()) {
              const playerId = fval(snapshot.val());
              await firebase.database().ref('accounts')
                .child(userData.uid)
                .child('following')
                .orderByValue()
                .equalTo(playerId)
                .once('value', async (snap) => {
                  if (snap.val()) return res.status(400).send();
                  await firebase.database()
                    .ref('accounts')
                    .child(userData.uid)
                    .child('following')
                    .push(playerId);
                  return res.status(200).send();
                });
            } else {
              const newPlayer = await registerBattleTag(tag, platform);
              if (!newPlayer) return res.status(400).send();
              await firebase
                .database()
                .ref('accounts')
                .child(userData.uid)
                .child('following')
                .push(newPlayer.key);
              return res.status(201).send();
            }
          });
      })
      .catch(() => res.status(401).send());
  },
};
