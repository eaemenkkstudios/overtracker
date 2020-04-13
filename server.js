const express = require('express');
const { errors } = require('celebrate');
const routes = require('./src/routes');
const PlayerController = require('./src/controllers/PlayerController');

const app = express();

async function updateOutdatedPlayers() {
  const outdatedPlayers = await PlayerController.getOutdatedPlayers();
  outdatedPlayers.forEach(async (player) => PlayerController
    .updatePlayer(player.tag, player.platform));
}

app.use(express.json());
app.use(routes);
app.use(errors());

updateOutdatedPlayers();
setInterval(async () => {
  updateOutdatedPlayers();
}, 43200000); // 1000 * 60 * 60 * 12 = 43200000 = 12hrs

app.listen(process.env.ENV_PORT || 8080);
