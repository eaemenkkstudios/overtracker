const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const oversmash = require('oversmash').default();
const firebase = require('firebase-admin');
const firebaseConfig = require('./src/config/config');
const serviceAccount = require('./src/config/serviceAccountKey');
const routes = require('./src/routes');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});

const overwatch = require('./src/overwatch')(oversmash, firebase);
const PlayerController = require('./src/controllers/PlayerController')(overwatch, oversmash, firebase);

const app = express();

async function updateOutdatedPlayers() {
  const outdatedPlayers = PlayerController.getOutdatedPlayers();
  outdatedPlayers.then((players) => players.forEach((player) => PlayerController
    .updatePlayer(player.tag, player.platform)));
}

app.use(express.json());
app.use(cors());
app.use(routes);
app.use(errors());

updateOutdatedPlayers();
setInterval(async () => {
  updateOutdatedPlayers();
}, 43200000); // 1000 * 60 * 60 * 12 = 43200000 = 12hrs

app.listen(process.env.PORT || 8080, () => {
  console.log(`Listening to port ${process.env.PORT || 8080}`);
});
