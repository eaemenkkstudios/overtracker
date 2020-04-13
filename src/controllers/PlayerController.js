const ow = require('oversmash').default();
const firebase = require('firebase-admin');
const firebaseConfig = require('../config.json');

const serviceAccount = require('../serviceAccountKey.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});
/**
 * Creates the player's score object
 * @async
 * @param {String} battleTag Player's battletag
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
async function makeScore(battleTag, platform) {
  const final = { date: new Date().getTime(), games: {} };
  const player = await ow.playerStats(battleTag, platform);
  final.rank = {
    damage: player.stats.competitive_rank.damage || 0,
    support: player.stats.competitive_rank.support || 0,
    tank: player.stats.competitive_rank.tank || 0,
  };
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
  return final;
}

/**
 * Registers the player in the database
 * @async
 * @param {string} battleTag Player's battletag
 * @param {string} platform Player's platform
 * @returns {*} The database referece or `undefined`
 */
async function registerBattleTag(battleTag, platform) {
  platform = platform || 'pc';
  const player = await ow.player(battleTag, platform);
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
  const playerScore = await makeScore(battleTag, platform);
  const finalStats = {
    tag: battleTag,
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
   * Gets all of the players that haven't been updated in more than 24hrs
   * @async
   * @returns {[{
   *  battleTag: string
   *  platform: string
   * }]} Array of outdated players
   */
  async getOutdatedPlayers() {
    const currentTime = new Date().getTime();
    const outdatedPlayers = [];
    await firebase
      .database()
      .ref('battletags')
      .on('value', async (snapshot) => {
        if (snapshot.val()) {
          Object.keys(snapshot.val()).forEach((player) => {
            if (snapshot.val()[player].lastUpdate) {
              // 60 * 60 * 24 * 1000 = 8640000
              if (currentTime - snapshot.val()[player].lastUpdate >= 8640000) {
                outdatedPlayers.push({
                  tag: snapshot.val()[player].tag,
                  platform: snapshot.val()[player].platform,
                });
              }
            }
          });
        }
      });
    return outdatedPlayers;
  },

  /**
 * Updates the score of the player
 * @async
 * @param {String} battleTag Player's battletag
 * @param {String} platform Player's platform
 */
  async updatePlayer(battleTag, platform) {
    await firebase
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(battleTag)
      .once('value', async (snapshot) => {
        const newScore = await makeScore(battleTag, platform);
        const newStats = {
          [Object.keys(snapshot.val())[0]]: {
            tag: battleTag,
            lastUpdate: newScore.date,
            scores: [
              ...snapshot.val()[Object.keys(snapshot.val())[0]].scores,
              newScore,
            ],
          },
        };
        await snapshot.ref.update(newStats);
      });
  },

  async getStats(req, res) {
    const battleTag = req.params.battleTag.replace(/-/g, '#');
    const stats = await makeScore(battleTag);
    res.status(200).json(stats);
  },

  async getRankImage(req, res) {
    const { rank } = req.params;
    const baseUrl = 'https://d1u1mce87gyfbn.cloudfront.net/game/rank-icons/rank-';
    const suffix = 'Tier.png';
    let tier = '';
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
    return res.status(200).json({ image: baseUrl + tier + suffix });
  },

  async followPlayer(req, res) {
    const token = req.headers.authorization;
    const battleTag = req.params.battleTag.replace(/-/g, '#');
    const { platform } = req.query;
    firebase.auth().verifyIdToken(token)
      .then(async (userData) => {
        firebase.database().ref('battletags')
          .orderByChild('tag')
          .equalTo(battleTag)
          .once('value', async (snapshot) => {
            if (snapshot.val()) {
              const battleTagId = Object.keys(snapshot.val())[0];
              await firebase.database().ref('accounts')
                .child(userData.uid)
                .child('following')
                .orderByValue()
                .equalTo(battleTagId)
                .once('value', async (snap) => {
                  if (snap.val()) return res.status(400).send();
                  await firebase.database()
                    .ref('accounts')
                    .child(userData.uid)
                    .child('following')
                    .push(battleTagId);
                  return res.status(200).send();
                });
            } else {
              const newBattleTag = await registerBattleTag(battleTag, platform);
              if (!newBattleTag) return res.status(400).send();
              await firebase
                .database()
                .ref('accounts')
                .child(userData.uid)
                .child('following')
                .push(newBattleTag.key);
              return res.status(201).send();
            }
          });
      })
      .catch(() => res.status(400).send());
  },
};
