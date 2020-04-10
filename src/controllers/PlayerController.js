const ow = require('oversmash').default();
const firebase = require('firebase-admin');
const firebaseConfig = require('../config.json');

const serviceAccount = require('../serviceAccountKey.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});

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
    return firebase.database().ref('battletags').push({ tag: battleTag });
  }
  if (platformIndex < 0) return undefined;
}

module.exports = {
  friendlyPlatforms: {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
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
