const express = require('express');
const { errors } = require('celebrate');
const routes = require('./routes');
const PlayerController = require('./controllers/PlayerController');

const app = express();

app.use(express.json());
app.use(routes);
app.use(errors());

setInterval(async () => {
  const outdatedPlayers = await PlayerController.getOutdatedPlayers();
  outdatedPlayers.forEach(async (player) => PlayerController
    .updatePlayer(player.tag, player.platform));
  console.log('eaemenkk');
}, 10000);

app.listen(process.env.ENV_PORT || 8080);
