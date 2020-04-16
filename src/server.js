const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const firebase = require('firebase-admin');
const firebaseConfig = require('./config/config');
const serviceAccount = require('./config/serviceAccountKey');
const routes = require('./routes');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: firebaseConfig.databaseURL,
});

const overwatch = require('./overwatch');
const PlayerController = require('./controllers/PlayerController');

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

module.exports = {
  overwatch,
  PlayerController,
};
