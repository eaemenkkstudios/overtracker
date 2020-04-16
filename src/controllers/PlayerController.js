const ow = require('oversmash').default();
const firebase = require('firebase-admin');
const firebaseConfig = require('../config/config');
const { fkey, fval } = require('../util');

const serviceAccount = require('../config/serviceAccountKey');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});
/**
 * Creates the player's score object
 * @async
 * @param {String} tag Player's battletag
 * @param {String} platform Player's platform
 * @returns {{
 *  date: string
 *  endorsment: number
 *  main: string
 *  rank: {
 *    damage: number
 *    support: number
 *    tank: number
 *  }
 *  games: {
 *    played: number
 *    won: number
 *  }
 * }} Score object
 */
async function makeScore(tag, platform) {
  const final = { date: new Date().getTime(), endorsement: 0, games: {} };
  const player = await ow.playerStats(tag, platform);
  final.endorsement = player.stats.endorsement_level;
  if (player.stats.competitive.all) {
    final.games.played = player.stats.competitive.all.game.games_played || 0;
    final.games.won = player.stats.competitive.all.game.games_won || 0;
  } else {
    final.games.played = 0;
    final.games.won = 0;
  }
  const main = Object.keys(player.stats.competitive).reduce((previousValue, currentValue) => {
    if (previousValue === '' || previousValue === 'all') return currentValue;
    let previousTimePlayed = player.stats.competitive[previousValue].game.time_played;
    let currentTimePlayed = player.stats.competitive[currentValue].game.time_played;
    if (previousTimePlayed.length === 5) previousTimePlayed = `00:${previousTimePlayed}`;
    if (currentTimePlayed.length === 5) currentTimePlayed = `00:${currentTimePlayed}`;
    return previousTimePlayed > currentTimePlayed ? previousValue : currentValue;
  }, '');
  final.main = main;
  final.rank = {
    damage: player.stats.competitive_rank.damage || 0,
    support: player.stats.competitive_rank.support || 0,
    tank: player.stats.competitive_rank.tank || 0,
  };


  return final;
}

/**
 * Gets the image URL of the player's rank
 * @param {number} rank Player's SR
 * @returns {string} Image URL
 */
function getRankImage(rank) {
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

/**
 * Adds the rank image url to each rank
 * @param {{
 *  date: string
 *  endorsment: number
 *  main: string
 *  rank: {
 *    damage: number
 *    support: number
 *    tank: number
 *  }
 *  games: {
 *    played: number
 *    won: number
 *  }
 * }} score Player's score object
 * @returns {{
 *  rank: {
 *    damage: {
 *      sr: number
 *      img: string
 *    }
 *    support: {
 *      sr: number
 *      img: string
 *    }
 *    tank: {
 *      sr: number
 *      img: string
 *    }
 *  }
 *  date: string
 *  endorsment: number
 *  main: string
 *  games: {
 *    played: number
 *    won: number
 *  }
 * }} Friendly Score Object
 */
function makeFriendlyScore(score) {
  Object.keys(score.rank).forEach((rank) => {
    const img = getRankImage(score.rank[rank]);
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
 * @param {string} tag Player's battletag
 * @param {string} platform Player's platform
 * @returns {*} The database referece or `undefined`
 */
async function registerBattleTag(tag, platform) {
  platform = platform || 'pc';
  const player = await ow.player(tag, platform);
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
  const playerScore = await makeScore(tag, platform);
  const finalStats = {
    tag,
    platform,
    lastUpdate: playerScore.date,
    scores: [playerScore],
  };
  return firebase.database().ref('battletags').push(finalStats);
}

module.exports = {
  friendlyPlatforms: {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
  },

  /**
   * Gets all of the players that haven't been updated in more than 12hrs
   * @async
   * @returns {Promise<[{
   *  tag: string
   *  platform: string
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
            if (snapshot.val()[player].lastUpdate) {
              // 60 * 60 * 24 * 1000 = 8640000 = 24hrs
              if (currentTime - snapshot.val()[player].lastUpdate >= (8640000 / 2)) {
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
    await firebase
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(tag)
      .once('value', async (snapshot) => {
        const lastScore = fkey(snapshot.val()).scores.pop();
        const hasChanged = !(JSON.stringify(lastScore.games) === JSON.stringify(newScore.games)
        && JSON.stringify(lastScore.rank) === JSON.stringify(newScore.rank));
        const newStats = {
          [fval(snapshot.val())]: {
            tag,
            platform,
            lastUpdate: newScore.date,
            scores: hasChanged ? [
              ...fkey(snapshot.val()).scores,
              newScore,
            ] : [...fkey(snapshot.val()).scores],
          },
        };
        await snapshot.ref.update(newStats);
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
                      platform: playersInfo[player].platform,
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
            fkey(snapshot.val()).scores.forEach((score) => {
              stats.scores.push(makeFriendlyScore(score));
            });
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
