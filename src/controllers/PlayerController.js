const ow = require('oversmash').default();
const firebase = require('firebase-admin');
const firebaseConfig = require('../config.json');

const serviceAccount = require('../serviceAccountKey.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});

async function makeScore(battleTag, platform) {
  const final = { date: new Date().getTime(), games: {} };
  const player = await ow.playerStats(battleTag, platform);
  final.rank = player.stats.competitive_rank;
  final.endorsement = player.stats.endorsement_level;
  final.games.played = player.stats.competitive.all.game.games_played;
  final.games.won = player.stats.competitive.all.game.games_won;

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

async function registerBattleTag(battleTag, platform) {
  const player = await ow.player(battleTag);
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
    const playerScore = await makeScore(battleTag, platform);
    const finalStats = {
      tag: battleTag,
      platform,
      lastUpdate: playerScore.date,
      scores: [playerScore],
    };
    return firebase.database().ref('battletags').push(finalStats);
  }
  if (platformIndex < 0) return undefined;
}

module.exports = {
  friendlyPlatforms: {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
  },

  async getOutdatedPlayers() {
    const currentTime = new Date().getTime();
    const outdatedPlayers = [];
    await firebase
      .database()
      .ref('battletags')
      .on('value', async (snapshot) => {
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
      });
    return outdatedPlayers;
  },

  /**
 *
 * @param {String} battleTag Player's battletag
 * @param {String} platform Player's platform
 */
  async updatePlayer(battleTag, platform) {
    await firebase
      .database()
      .ref('battletags')
      .orderByChild('tag')
      .equalTo(battleTag)
      .on('value', async (snapshot) => {
        const newScore = await makeScore(battleTag, platform);
        console.log(snapshot.key);
        const newStats = {
          ...snapshot.val()[Object.keys(snapshot.val())[0]],
          lastUpdate: newScore.date,
        };
        newStats.scores[Object.keys(snapshot.val().scores).length] = newScore;
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
